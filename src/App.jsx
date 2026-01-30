import { useEffect, useMemo, useRef, useState } from "react";
import { MathJaxContext } from "better-react-mathjax";

import HighlightedContent from "./HighlightedContent";
import { getConferenceLabel, getPaperLabel, getPaperLink } from "./utils";


const config = {
  loader: { load: ["input/tex", "output/chtml"] },
  tex: {
    inlineMath: [["$", "$"], ["\\(", "\\)"]],
    displayMath: [["$$", "$$"], ["\\[", "\\]"]],
  },
};
const PAGE_SIZE = 100;
const CONFERENCES = new Set(["cvpr2021", "iclr2017", "nips2020", "nips2000", "iclr2021", "nips2016", "nips1991", "nips1987", "cvpr2017", "cvpr2016", "nips1990", "nips2017", "nips2001", "iclr2020", "nips2021", "cvpr2020", "nips2006", "nips2010", "nips1997", "icml2016", "icml2020", "icml2021", "icml2017", "nips1996", "nips2011", "iclr2026", "nips2007", "cvpr2013", "icml2014", "nips1995", "nips2012", "nips2004", "iclr2025", "nips2024", "nips1999", "icml2018", "iclr2013", "cvpr2025", "nips2008", "icml2022", "icml2023", "nips2009", "cvpr2024", "icml2019", "nips1998", "nips2025", "nips2005", "iclr2024", "nips2013", "nips1994", "icml2015", "nips2022", "nips1989", "cvpr2019", "cvpr2023", "nips2018", "icml2024", "cvpr2015", "nips1993", "iclr2019", "nips2014", "iclr2023", "nips2002", "iclr2022", "nips2003", "nips2015", "iclr2018", "nips1992", "icml2013", "cvpr2014", "icml2025", "nips2019", "cvpr2022", "iclr2014", "cvpr2018", "nips1988", "nips2023"].sort().toReversed());

function App() {
  const bottomRef = useRef(null);
  const [papers, setPapers] = useState([]);
  const [count, setCount] = useState(PAGE_SIZE);
  const [conferences, setConferences] = useState(() => new Set(new URLSearchParams(window.location.search).get("conferences")?.split(",") || []));
  const [q, setQ] = useState(() => new URLSearchParams(window.location.search).get("q") || "");

  const loweredQ = useMemo(() => q.toLowerCase(), [q]);
  const searchedPapers = useMemo(() => {
    if (!loweredQ) return papers;
    return papers.filter(({ title, abstract }) =>
      title.toLowerCase().includes(loweredQ) ||
      abstract.toLowerCase().includes(loweredQ)
    );
  }, [papers, loweredQ]);
  const filteredPapers = useMemo(() => {
    if (conferences.size === 0) return searchedPapers;
    return searchedPapers.filter(({ conference }) => (conferences.size === 0 || conferences.has(conference))
    );
  }, [searchedPapers, conferences]);

  useEffect(() => {
    setCount(PAGE_SIZE);
    window.scrollTo({ top: 0 });

    const params = new URLSearchParams(location.search);
    if (q) params.set("q", q);
    else params.delete("q");
    if (conferences.size > 0) params.set("conferences", Array.from(conferences).join(","));
    else params.delete("conferences");
    if (params.size === 0) {
      window.history.replaceState({}, "", location.pathname);
      return;
    }
    window.history.replaceState({}, "", `${location.pathname}?${params.toString()}`);
  }, [q, conferences]);

  useEffect(() => {
    Promise.all(Array.from(CONFERENCES).map((conference) => fetch(`${import.meta.env.BASE_URL}conferences/${conference}.csv`)
      .then(res => res.text())
      .then(text => setPapers((prev) => [...prev, ...text.trim().split("\n").slice(1).map((line) => {
        const [id, openReview, arxiv, title, abstract, ratingSum, ratingCount] = line.split(",");
        return { id, openReview, arxiv, conference, title: title.replaceAll("##", ","), abstract: abstract.replaceAll("##", ","), rating: ratingSum / ratingCount || 0 };
      })].sort((a, b) => b.rating - a.rating)))));

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setCount((prev) => prev + PAGE_SIZE);
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
          <button className="flex items-center border-neutral-200 px-4 py-3 space-x-4 shrink-0 cursor-pointer" onClick={() => {
            setQ("");
            setConferences(new Set());
          }}>
            <img className="size-6 grayscale" src={`${import.meta.env.BASE_URL}android-chrome-192x192.png`} alt="Paper Screener Logo" />
            <h1 className="text-2xl font-serif">Paper Screener</h1>
          </button>
          <div className="flex-1 px-4 py-3 space-y-3 overflow-y-auto overscroll-contain">
            <h2 className="font-semibold">Conferences</h2>
            <ul className="space-y-1">
              {Array.from(CONFERENCES).map((conference) => (
                <li key={conference}>
                  <label className="flex items-center space-x-2 cursor-pointer hover:underline">
                    <input type="checkbox" className="accent-amber-700" checked={conferences.has(conference)} onChange={() => {
                      setConferences((prev) => {
                        const newSet = new Set(prev);
                        if (newSet.has(conference)) newSet.delete(conference);
                        else newSet.add(conference);
                        return newSet;
                      });
                    }} />
                    <p>{getConferenceLabel(conference)}</p>
                    <p className="text-neutral-500">({searchedPapers.filter(paper => paper.conference === conference).length.toLocaleString()})</p>
                  </label>
                </li>
              ))}
            </ul>
          </div>
          <div className="px-4 py-3 space-y-3 shrink-0">
            <h2 className="font-semibold">Instructions</h2>
            <ol className="list-decimal list-inside space-y-1">
              <li>Use the search bar to filter papers by title and abstract.</li>
              <li>Use the checkboxes to filter papers by conference.</li>
              <li>Scroll down to load more papers.</li>
            </ol>
          </div>
          <p className="text-neutral-500 px-4 py-3 shrink-0">If you have any feedback, please contact me at <a className="text-amber-700 hover:underline" href="https://github.com/hyunjunian/paper-screener" target="_blank">[GitHub]</a>.</p>
        </aside>
        <div className="flex-1">
          <header className="z-10 sticky top-0">
            <input className="w-full p-4 hover:bg-white bg-neutral-50 focus:outline-hidden border-b border-neutral-200" type="text" placeholder="Search..." value={q} onChange={e => setQ(e.target.value)} />
            <li className="flex divide-x divide-neutral-200 font-medium text-sm bg-neutral-100 border-b border-neutral-200">
              <span className="w-16 px-2 py-1 text-right">#</span>
              <span className="w-16 px-2 py-1 text-right">Rating</span>
              <span className="w-24 px-2 py-1">Conference</span>
              <span className="w-64 px-2 py-1">Title</span>
              <span className="flex-1 px-2 py-1">Abstract</span>
            </li>
          </header>
          <main className="min-h-screen">
            <ul className="divide-y divide-neutral-200 text-sm border-neutral-200">
              {filteredPapers.slice(0, count).map(({ id, openReview, arxiv, conference, title, abstract, rating }, index) => <li className="flex divide-x divide-neutral-200" key={id || openReview || title}>
                <span className="w-16 p-2 text-right">{index + 1}</span>
                <span className="w-16 p-2 text-right">{rating ? rating.toFixed(1) : "-"}</span>
                <span className="w-24 p-2">{getConferenceLabel(conference)}</span>
                <span className="w-64 p-2">
                  <p><HighlightedContent text={title} query={loweredQ} /></p>
                  <p><a className="text-amber-700 hover:underline" href={getPaperLink(arxiv, openReview, title)} target="_blank">[{getPaperLabel(arxiv, openReview)}]</a></p>
                </span>
                <span className="flex-1 p-2"><HighlightedContent text={abstract} query={loweredQ} /></span>
              </li>)}
            </ul>
          </main>
          <p className="p-2 border-t border-neutral-200 text-neutral-500" ref={bottomRef}>{filteredPapers.length > count ? "Loading..." : "No more papers"}</p>
          <div className="sticky border-t border-neutral-200 bottom-0 z-10 bg-white p-2 text-sm">
            {filteredPapers.length.toLocaleString()} papers
          </div>
        </div>
      </div>
      {/* <div className="fixed inset-0 bg-black/25 z-10" />
      <div className="fixed inset-4 shadow-lg rounded-2xl bg-white flex z-20 divide-x divide-neutral-200">
        <embed className="flex-1 rounded-l-2xl" src="https://arxiv.org/pdf/2508.14814#pagemode=none" type="application/pdf" />
        <div className="w-80 p-4 flex flex-col space-y-4 rounded-r-2xl bg-neutral-50">
          <h2 className="text-xl font-semibold">Sample Paper</h2>
          <p>This is a sample paper embedded using the &lt;embed&gt; tag. You can replace the <code>src</code> attribute with any PDF URL to display a different paper.</p>
          <a className="text-amber-700 hover:underline mt-auto" href="https://arxiv.org/abs/2508.14814" target="_blank">View on arXiv</a>
        </div>
      </div> */}
    </MathJaxContext>
  )
}

export default App
