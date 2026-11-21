/** Small consistent line icon set; no runtime icon dependency. */
const PATHS = {
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  car: 'M5 17H3v-6l2-6h14l2 6v6h-2 M5 17h14 M5 11h14 M7 14h.01 M17 14h.01 M6 17v3 M18 17v3',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
  shield: 'M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7z M8 12l3 3 5-6',
  chart: 'M3 3v18h18 M7 16v-5 M12 16V7 M17 16v-8',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4',
  map: 'm3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z M9 3v15 M15 6v15',
  message: 'M21 11a8 8 0 0 1-8 8H7l-4 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z M7 8h10 M7 12h6',
  wallet: 'M3 6h17v15H3z M3 6V3h15v3 M16 11h5v5h-5z',
  file: 'M14 2H4v20h16V8z M14 2v6h6 M8 12h8 M8 16h6',
  scan: 'M8 3H3v5 M16 3h5v5 M3 16v5h5 M21 16v5h-5 M7 9h10v6H7z M1 12h22',
  arrow: 'M4 12h16 M14 6l6 6-6 6',
  search: 'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  x: 'M6 6l12 12 M6 18 18 6',
  menu: 'M3 6h18 M3 12h18 M3 18h18',
  check: 'm5 12 4 4L19 6',
  clock: 'M12 8v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  pin: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0 M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  spark: 'm12 3 3 6 6 3-6 3-3 6-3-6-6-3 6-3z',
} as const;
export type IconName = keyof typeof PATHS;
export function Icon({ name, size = 20, className = '' }: { name: IconName; size?: number; className?: string }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={PATHS[name]} /></svg>;
}
