import { useEffect, useMemo, useRef, useState } from "react";
import { MathJaxContext } from "better-react-mathjax";

import HighlightedContent from "./HighlightedContent";
import conferenceCatalog from "./conference-catalog.json";
import { loadConferenceData, loadConferenceBatches } from "./data-loader";
import { getConferenceLabel, getPaperLabel, getPaperLink } from "./utils";


const config = {
  loader: { load: ["input/tex", "output/chtml"] },
  tex: {
    inlineMath: [["$", "$"], ["\\(", "\\)"]],
    displayMath: [["$$", "$$"], ["\\[", "\\]"]],
  },
};
const PAGE_SIZE = 100;
const CONFERENCES = Object.keys(conferenceCatalog).sort().toReversed();

function App() {
  const bottomRef = useRef(null);
  const [papers, setPapers] = useState([]);
  const [loadErrors, setLoadErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(PAGE_SIZE);
  const [conferences, setConferences] = useState(() => new Set(new URLSearchParams(window.location.search).get("conferences")?.split(",") || []));
  const [q, setQ] = useState(() => new URLSearchParams(window.location.search).get("q") || "");
  const [loweredQ, setLoweredQ] = useState(q.toLowerCase());

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

  const conferenceCounts = useMemo(() => {
    const counts = new Map();
    for (const paper of searchedPapers) counts.set(paper.conference, (counts.get(paper.conference) || 0) + 1);
    return counts;
  }, [searchedPapers]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoweredQ(q.toLowerCase());
      setCount(PAGE_SIZE);
      window.scrollTo({ top: 0 });
      const params = new URLSearchParams(location.search);
      if (q) params.set("q", q);
      else params.delete("q");
      if (params.size === 0) {
        window.history.replaceState({}, "", location.pathname);
        return;
      }
      window.history.replaceState({}, "", `${location.pathname}?${params.toString()}`);
    }, 300);
    return () => clearTimeout(timeout);
  }, [q]);

  useEffect(() => {
    setCount(PAGE_SIZE);
    window.scrollTo({ top: 0 });
    const params = new URLSearchParams(location.search);
    if (conferences.size > 0) params.set("conferences", Array.from(conferences).join(","));
    else params.delete("conferences");
    if (params.size === 0) {
      window.history.replaceState({}, "", location.pathname);
      return;
    }
    window.history.replaceState({}, "", `${location.pathname}?${params.toString()}`);
  }, [conferences]);

  useEffect(() => {
    let cancelled = false;
    const ordered = [...CONFERENCES].sort((a, b) =>
      Number(conferences.has(b)) - Number(conferences.has(a)) || Number(b.slice(-4)) - Number(a.slice(-4))
    );
    loadConferenceBatches(ordered,
      conference => loadConferenceData(conference, conferenceCatalog[conference].format, import.meta.env.BASE_URL),
      batch => setPapers(prev => [...prev, ...batch].sort((a, b) => b.rating - a.rating)),
      (conference, error) => {
        console.error(`Failed to load ${conference}`, error);
        setLoadErrors(prev => [...new Set([...prev, conference])]);
      },
      () => cancelled,
    ).finally(() => { if (!cancelled) setLoading(false); });

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setCount((prev) => prev + PAGE_SIZE);
      },
      { threshold: 1 },
    );
    if (bottomRef.current) observer.observe(bottomRef.current);

    return () => {
      cancelled = true;
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
                    <p className="text-neutral-500">({(loweredQ ? (conferenceCounts.get(conference) || 0) : conferenceCatalog[conference].papers).toLocaleString()})</p>
                  </label>
                </li>
              ))}
            </ul>
          </div>
          <div className="px-4 py-3 space-y-3 shrink-0">
            <a className="text-amber-700 hover:underline" href={`${import.meta.env.BASE_URL}coverage.html`} target="_blank" rel="noreferrer">Data coverage &amp; review sources</a>
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
            {loadErrors.length > 0 && <p role="alert" className="p-3 bg-amber-50 text-amber-900">
              Could not load: {loadErrors.map(getConferenceLabel).join(", ")}. Please refresh to try again.
            </p>}
            <ul className="divide-y divide-neutral-200 text-sm border-neutral-200">
              {filteredPapers.slice(0, count).map(({ id, openReview, arxiv, conference, title, abstract, rating, ratingCount, ratingSource, ratingField }, index) => <li className="flex divide-x divide-neutral-200" key={id}>
                <span className="w-16 p-2 text-right">{index + 1}</span>
                <span className="w-16 p-2 text-right" title={ratingCount ? `${ratingCount} reviews; ${ratingField}; ${ratingSource}; original ${getConferenceLabel(conference)} scale` : "Review scores unavailable"}>{ratingCount ? rating.toFixed(1) : "-"}</span>
                <span className="w-24 p-2">{getConferenceLabel(conference)}</span>
                <span className="w-64 p-2">
                  <p><HighlightedContent text={title} query={loweredQ} /></p>
                  <p><a className="text-amber-700 hover:underline" href={getPaperLink(arxiv, openReview, title)} target="_blank">[{getPaperLabel(arxiv, openReview)}]</a></p>
                </span>
                <span className="flex-1 p-2"><HighlightedContent text={abstract} query={loweredQ} /></span>
              </li>)}
            </ul>
          </main>
          <p className="p-2 border-t border-neutral-200 text-neutral-500" ref={bottomRef}>{loading ? "Loading conference data..." : filteredPapers.length > count ? "Loading..." : "No more papers"}</p>
          <div className="sticky border-t border-neutral-200 bottom-0 z-10 bg-white p-2 text-sm">
            {filteredPapers.length.toLocaleString()} papers{loading ? " · Loading archives..." : ""}
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
