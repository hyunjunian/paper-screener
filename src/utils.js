export function getConferenceLabel(conference) {
    const year = conference.slice(-4);
    const abbrev = conference.slice(0, -4).toUpperCase();

    return `${abbrev} ${year}`;
}

export function getPaperLink(arxiv, openReview, title) {
    if (arxiv) return `https://arxiv.org/abs/${arxiv}`;
    if (openReview) return `https://openreview.net/forum?id=${openReview}`;
    return `https://www.google.com/search?q=${encodeURIComponent(title)}`;
}

export function getPaperLabel(arxiv, openReview) {
    if (arxiv) return "arXiv";
    if (openReview) return "OpenReview";
    return "Google";
}

export function parseConferenceCsv(text, conference) {
    const [header, ...lines] = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
    if (header !== "id,open_review,arxiv,title,abstract,rating_sum,rating_count") {
        throw new Error(`Invalid CSV header for ${conference}`);
    }

    return lines.filter(line => line.trim()).map(line => {
        const fields = line.split(",");
        if (fields.length !== 7) {
            throw new Error(`Invalid paper row for ${conference}`);
        }
        const [id, openReview, arxiv, title, abstract, ratingSum, ratingCount] = fields;
        return {
            id: `${conference}_${title}`,
            openReview,
            arxiv,
            conference,
            title: title.replaceAll("##", ","),
            abstract: abstract.replaceAll("##", ","),
            rating: ratingSum / ratingCount || 0,
        };
    });
}
