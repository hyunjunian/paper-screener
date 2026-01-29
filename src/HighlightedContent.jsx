import { MathJax } from "better-react-mathjax";


function HighlightedContent({ text, query, isMathJax = false }) {
    if (!isMathJax) {
        if (!query.trim()) return text;

        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));

        // todo: when search with \, some text breaks. need to fix.
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
            </>
        );
    }

    if (!query.trim()) return <MathJax>{text}</MathJax>;
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
        </>
    );
};

export default HighlightedContent;