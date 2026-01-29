export function getConferenceLabel(conference) {
    const year = conference.slice(-4);
    const abbrev = conference.slice(0, -4).toUpperCase();

    return `${year} ${abbrev}`;
}