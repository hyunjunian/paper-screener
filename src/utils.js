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