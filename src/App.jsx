import { useEffect, useMemo, useState } from "react";
import HighlightedContent from "./HighlightedContent";

const PAGE_SIZE = 100;

function App() {
  const [papers, setPapers] = useState([]);
  const [count, setCount] = useState(PAGE_SIZE);
  const [q, setQ] = useState("");
  const loweredQ = useMemo(() => q.toLowerCase(), [q]);
  const filteredPapers = useMemo(() => {
    if (!loweredQ) return papers.slice(0, count);
    return papers.filter(({ title, abstract }) =>
      title.toLowerCase().includes(loweredQ) ||
      abstract.toLowerCase().includes(loweredQ)
    ).slice(0, count);
  }, [papers, loweredQ, count]);

  useEffect(() => {
    setCount(PAGE_SIZE);
  }, [loweredQ]);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}iclr2026.csv`)
      .then(res => res.text())
      .then(text => setPapers(text.trim().split("\n").slice(1).map(line => {
        const [id, title, abstract, ratingSum, ratingCount] = line.split(",");
        return { id, title: title.replaceAll("##", ","), abstract: abstract.replaceAll("##", ","), rating: ratingSum / ratingCount };
      }).sort((a, b) => b.rating - a.rating)));
  }, []);

  return (
    <div className="flex items-start">
      <aside className="w-64 shrink-0 h-screen sticky top-0 bg-neutral-50 border-r border-neutral-200 text-sm">
        <div className="flex items-center border-b border-neutral-200 px-4 py-4.5">
          <img className="size-8" src={`${import.meta.env.BASE_URL}android-chrome-192x192.png`} alt="Paper Screener Logo" />
          <h1 className="ml-4 text-xl font-semibold">Paper Screener</h1>
        </div>
        <h2 className="mt-6 px-4 font-semibold mb-2">Instructions</h2>
        <ol className="list-decimal list-inside space-y-1 px-4">
          <li>Use the search bar to filter papers by title or abstract.</li>
          <li>Click on the OpenReview link to read the full paper and reviews.</li>
          <li>Load more papers using the "Load 20 more" button at the bottom.</li>
        </ol>
        <p className="mt-8 text-neutral-500 p-4 border-t border-neutral-200">If you have any feedback, please contact me at <a className="text-red-700 hover:underline" href="https://github.com/hyunjunian/paper-screener" target="_blank">GitHub</a>.</p>
      </aside>
      <div>
        <header className="z-10 sticky top-0 bg-neutral-100 border-b border-neutral-200">
          <input className="w-full p-2 bg-white focus:outline-hidden border-b border-neutral-200" type="text" placeholder="Search..." value={q} onChange={e => setQ(e.target.value)} />
          <li className="flex divide-x divide-neutral-200 font-medium text-sm">
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
        <main className="border-b border-neutral-200 overflow-x-auto">
          <ul className="divide-y divide-neutral-200 text-sm border-neutral-200">
            {filteredPapers.map(({ id, title, abstract, rating }, index) => <li className="flex divide-x divide-neutral-200" key={id}>
              {/* <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-10 p-2 text-neutral-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
            </svg> */}
              <span className="w-16 p-2 text-right">{index + 1}</span>
              <span className="w-16 p-2">{rating.toFixed(2)}</span>
              <span className="w-24 p-2">ICLR</span>
              <span className="w-64 p-2">
                <p>{title}</p>
                <p>
                  <a className="text-red-700 hover:underline" href={`https://openreview.net/forum?id=${id}`} target="_blank">[OpenReview]</a>
                  {/* <a className="text-red-700 hover:underline" href={`https://arxiv.org/abs/${id}`} target="_blank">[arxiv]</a> */}
                </p>
              </span>
              <span className="flex-1 p-2"><HighlightedContent text={abstract} query={loweredQ} /></span>
            </li>)}
            <li>
              {papers.length === 0 ? <div className="p-2">Loading...</div> : <div className="p-2">
                <button className="text-red-700 hover:underline" onClick={() => setCount((prev) => prev + PAGE_SIZE)}>[Load 20 more]</button>
              </div>}
            </li>
          </ul>
        </main>
      </div>
    </div>
  )
}

export default App
