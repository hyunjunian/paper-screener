import { parseConferenceCsv, parseConferenceJson } from "./utils.js";

export async function loadConferenceData(conference, format, baseUrl, fetcher = fetch) {
    const response = await fetcher(`${baseUrl}conferences/${conference}.${format}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return format === "json"
        ? parseConferenceJson(await response.json(), conference)
        : parseConferenceCsv(await response.text(), conference);
}

export async function loadConferenceBatches(conferences, load, onBatch, onError, cancelled = () => false) {
    for (let start = 0; start < conferences.length && !cancelled(); start += 4) {
        const batch = await Promise.all(conferences.slice(start, start + 4).map(async conference => {
            try {
                return await load(conference);
            } catch (error) {
                if (!cancelled()) onError(conference, error);
                return [];
            }
        }));
        if (!cancelled()) onBatch(batch.flat());
    }
}
