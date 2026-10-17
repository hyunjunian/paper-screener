export function getConferenceLabel(conference) {
    const year = conference.slice(-4);
    const name = conference.slice(0, -4);
    const abbrev = { aacl: "IJCNLP-AACL", lreccoling: "LREC-COLING", nips: "NeurIPS" }[name] || name.toUpperCase();

    return `${abbrev} ${year}`;
}

export function parseConferenceJson(papers, conference) {
    if (!Array.isArray(papers) || papers.length === 0) {
        throw new Error(`Invalid paper data for ${conference}`);
    }
    const ids = new Set();
    return papers.map(paper => {
        if (!paper || typeof paper.id !== "string" || !paper.id ||
            typeof paper.title !== "string" || !paper.title.trim() ||
            typeof paper.abstract !== "string" || ids.has(paper.id)) {
            throw new Error(`Invalid paper record for ${conference}`);
        }
        const ratingCount = paper.ratingCount ?? 0;
        const ratingSum = paper.ratingSum ?? 0;
        if (!Number.isInteger(ratingCount) || ratingCount < 0 || !Number.isFinite(ratingSum) ||
            ratingSum < 0 || (paper.openReview !== undefined && typeof paper.openReview !== "string") ||
            (paper.arxiv !== undefined && typeof paper.arxiv !== "string")) {
            throw new Error(`Invalid paper review data for ${conference}`);
        }
        ids.add(paper.id);
        return {
            id: `${conference}_${paper.id}`,
            openReview: paper.openReview || "",
            arxiv: paper.arxiv || "",
            conference,
            title: paper.title,
            abstract: paper.abstract,
            rating: ratingCount ? ratingSum / ratingCount : 0,
            ratingCount,
            ratingSource: paper.ratingSource || "",
            ratingField: paper.ratingField || "overall rating",
        };
    });
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
            ratingCount: Number(ratingCount) || 0,
            ratingSource: "Existing OpenReview-linked dataset",
            ratingField: "overall rating",
        };
    });
}
