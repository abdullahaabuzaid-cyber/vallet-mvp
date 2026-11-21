/** Display formatting (Arabic, Amman time). */
export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ar-JO', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Amman',
  });
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ar-JO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Amman',
  });
}

export function formatDateTime(iso: string) {
  return `${formatDate(iso)} · ${formatTime(iso)}`;
}

/** Compact elapsed time, e.g. `45د`, `2س10د`. */
export function durationLabel(from: string, to?: string) {
  const ms = (to ? new Date(to).getTime() : Date.now()) - new Date(from).getTime();
  const mins = Math.max(1, Math.round(ms / 60000));
  if (mins < 60) return `${mins}د`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}س${m}د` : `${h}س`;
}

export function formatJod(n: number) {
  return `${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} د.أ`;
}
