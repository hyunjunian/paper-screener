import { MathJax, MathJaxContext } from "better-react-mathjax";

const config = {
    loader: { load: ["input/tex", "output/chtml"] },
    tex: {
        inlineMath: [["$", "$"], ["\\(", "\\)"]],
        displayMath: [["$$", "$$"], ["\\[", "\\]"]],
    },
};

function HighlightedContent({ text, query }) {
    if (!query.trim()) return <MathJaxContext config={config}><MathJax>{text}</MathJax></MathJaxContext>;

    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));

    return (
        <MathJaxContext config={config}><MathJax>
            {parts.map((part, index) =>
                part.toLowerCase() === query ? (
                    <mark key={index} className="bg-amber-300">
                        {part}
                    </mark>
                ) : (
                    <span key={index}>{part}</span>
                )
            )}
        </MathJax></MathJaxContext>
    );
};

export default HighlightedContent;