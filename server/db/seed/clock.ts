// Shared clock for demo fixtures: timestamps are relative to server boot.
const now = Date.now();
export const hoursAgo = (h: number) => new Date(now - h * 3600_000).toISOString();
export const minsAgo = (m: number) => new Date(now - m * 60_000).toISOString();
export const carThumb = (color: string, label = 'سيارة') =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="64"><rect width="96" height="64" rx="10" fill="${color}"/><text x="48" y="38" text-anchor="middle" fill="#fff" font-size="13" font-family="Arial,sans-serif">${label}</text></svg>`
  )}`;

