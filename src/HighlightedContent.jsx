import { MathJax } from "better-react-mathjax";
import { useState } from "react";


function HighlightedContent({ text, query }) {
    const [renderMath, setRenderMath] = useState(false);

    if (!renderMath) {
        if (!query.trim()) return <>
            <span>{text}</span> {(text.includes("$") || text.includes("\\")) && <button className="text-amber-700 hover:underline" onClick={() => setRenderMath(true)}>[Render Math]</button>}
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
                {(text.includes("$") || text.includes("\\")) && <button className="text-amber-700 hover:underline" onClick={() => setRenderMath(true)}>[Render Math]</button>}
            </>
        );
    }

    if (!query.trim()) return <MathJax>{text}</MathJax>;

    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));

    return (
        <MathJax>
            {parts.map((part, index) =>
                part.toLowerCase() === query ? (
                    <mark key={index} className="bg-amber-300">
                        {part}
                    </mark>
                ) : (
                    <span key={index}>{part}</span>
                )
            )}
        </MathJax>
    );
};

export default HighlightedContent;