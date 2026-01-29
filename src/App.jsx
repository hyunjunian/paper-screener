import { useEffect, useMemo, useRef, useState } from "react";
import { MathJaxContext } from "better-react-mathjax";

import HighlightedContent from "./HighlightedContent";


const config = {
    loader: { load: ["input/tex", "output/chtml"] },
    tex: {
        inlineMath: [["$", "$"], ["\\(", "\\)"]],
        displayMath: [["$$", "$$"], ["\\[", "\\]"]],
    },
};
const PAGE_SIZE = 100;

function App() {
  const bottomRef = useRef(null);
  const [papers, setPapers] = useState([]);
  const [count, setCount] = useState(PAGE_SIZE);
  const [q, setQ] = useState(() => new URLSearchParams(window.location.search).get("q") || "");

  const loweredQ = useMemo(() => q.toLowerCase(), [q]);
  const filteredPapers = useMemo(() => {
    if (!loweredQ) return papers;
    return papers.filter(({ title, abstract }) =>
      title.toLowerCase().includes(loweredQ) ||
      abstract.toLowerCase().includes(loweredQ)
    );
  }, [papers, loweredQ]);

  useEffect(() => {
    setCount(PAGE_SIZE);
  }, [loweredQ]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (q) params.set("q", q);
    else params.delete("q");
    if (params.size === 0) {
      window.history.replaceState({}, "", location.pathname);
      return;
    }
    window.history.replaceState({}, "", `${location.pathname}?${params.toString()}`);
  }, [q]);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}iclr2026.csv`)
      .then(res => res.text())
      .then(text => setPapers(text.trim().split("\n").slice(1).map((line) => {
        const [id, title, abstract, ratingSum, ratingCount] = line.split(",");
        return { id, title: title.replaceAll("##", ","), abstract: abstract.replaceAll("##", ","), rating: ratingSum / ratingCount || 0 };
      }).sort((a, b) => b.rating - a.rating)));

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setCount((prev) => prev + PAGE_SIZE);
          console.log("Load more papers");
        }
      },
      { threshold: 1 },
    );
    if (bottomRef.current) observer.observe(bottomRef.current);

    return () => {
      if (bottomRef.current) observer.unobserve(bottomRef.current);
    };
  }, []);

  return (
        <MathJaxContext config={config}>
    <div className="flex items-start">
      <aside className="w-64 flex flex-col shrink-0 h-screen sticky top-0 bg-neutral-50 border-r border-neutral-200 text-sm divide-y divide-neutral-200">
        <div className="flex items-center border-neutral-200 px-4 py-3 space-x-4 shrink-0">
          <img className="size-6 grayscale" src={`${import.meta.env.BASE_URL}android-chrome-192x192.png`} alt="Paper Screener Logo" />
          <h1 className="text-2xl font-serif">Paper Screener</h1>
        </div>
        <div className="flex-1 px-4 py-3 space-y-3 overflow-y-auto">
          <h2 className="font-semibold">Conferences</h2>
          <ul className="space-y-1">
            {["ICLR 2026", "ICLR 2025", "ICLR 2024"].map((conference) => (
              <li key={conference}>
                <label className="flex items-center space-x-2 cursor-pointer hover:underline">
                  <input type="checkbox" className="accent-black" />
                  <p className="">{conference}</p>
                  <p className="text-neutral-500">({papers.length})</p>
                </label>
              </li>
            ))}
          </ul>
        </div>
        <div className="px-4 py-3 space-y-3 shrink-0">
          <h2 className="font-semibold">Instructions</h2>
          <ol className="list-decimal list-inside space-y-1">
            <li>Use the search bar to filter papers by title or abstract.</li>
            <li>Click on the OpenReview link to read the full paper and reviews.</li>
            <li>Load more papers using the "Load 20 more" button at the bottom.</li>
          </ol>
        </div>
        <p className="text-neutral-500 px-4 py-3 shrink-0">If you have any feedback, please contact me at <a className="text-amber-700 hover:underline" href="https://github.com/hyunjunian/paper-screener" target="_blank">GitHub</a>.</p>
      </aside>
      <div className="flex-1">
        <header className="z-10 sticky top-0">
          <input className="w-full p-4 hover:bg-white bg-neutral-50 focus:outline-hidden border-b border-neutral-200" type="text" placeholder="Search..." value={q} onChange={e => setQ(e.target.value)} />
          <li className="flex divide-x divide-neutral-200 font-medium text-sm bg-neutral-100 border-b border-neutral-200">
            {/* <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-10 p-2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
          </svg> */}
            <span className="w-16 px-2 py-1 text-right">#</span>
            <span className="w-16 px-2 py-1">Rating</span>
            <span className="w-24 px-2 py-1">Conference</span>
            <span className="w-64 px-2 py-1">Title</span>
            <span className="flex-1 px-2 py-1">Abstract</span>
          </li>
        </header>
        <main className="min-h-screen">
          <ul className="divide-y divide-neutral-200 text-sm border-neutral-200">
            {filteredPapers.slice(0, count).map(({ id, title, abstract, rating }, index) => <li className="flex divide-x divide-neutral-200" key={id}>
              {/* <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-10 p-2 text-neutral-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
            </svg> */}
              <span className="w-16 p-2 text-right">{index + 1}</span>
              <span className="w-16 p-2">{rating.toFixed(2)}</span>
              <span className="w-24 p-2">ICLR</span>
              <span className="w-64 p-2">
                <p><HighlightedContent text={title} query={loweredQ} /></p>
                <p>
                  <a className="text-amber-700 hover:underline" href={`https://openreview.net/forum?id=${id}`} target="_blank">[OpenReview]</a>
                  {/* <a className="text-amber-700 hover:underline" href={`https://arxiv.org/abs/${id}`} target="_blank">[arxiv]</a> */}
                </p>
              </span>
              <span className="flex-1 p-2"><HighlightedContent text={abstract} query={loweredQ} /></span>
            </li>)}
          </ul>
        </main>
        <div className="text-neutral-500 p-2 text-sm border-t border-neutral-200" ref={bottomRef}>Loading...</div>
        <div className="sticky border-t border-neutral-200 bottom-0 z-10 bg-white p-2 text-sm">
          {filteredPapers.length} papers
        </div>
      </div>
    </div>
    </MathJaxContext>
  )
}

export default App
