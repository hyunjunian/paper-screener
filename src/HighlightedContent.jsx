import { MathJax } from "better-react-mathjax";
import { useState } from "react";


function HighlightedContent({ text, query }) {
    const [renderMath, setRenderMath] = useState(false);

    if (renderMath) return <MathJax>{text}</MathJax>;
    if (!query.trim()) return <>
        <span>{text}</span> {text.includes("$") && <button className="text-amber-700 hover:underline" onClick={() => setRenderMath(true)}>[Render MathJax]</button>}
    </>;

    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));

    return (
        <>
            {parts.map((part, index) =>
                part.toLowerCase() === query ? (
                    <mark key={index} className="bg-amber-300">
                        {part}
                    </mark>
                ) : (
                    <span key={index}>{part}</span>
                )
            )}
            {text.includes("$") && <button className="text-amber-700 hover:underline" onClick={() => setRenderMath(true)}>[Render Math]</button>}
        </>
    );
};

export default HighlightedContent;