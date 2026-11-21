import { Circle, Tooltip } from 'react-leaflet';
export type HeatCell = { lat: number; lng: number; weight: number };
const color = (t: number) => (t > 0.66 ? '#dc2626' : t > 0.33 ? '#f97316' : '#facc15');
/** Weighted circles on a ~300m grid — light heatmap without extra map plugins. */
export function HeatLayer({ cells, max, label }: { cells: HeatCell[]; max: number; label: string }) {
  return <>{cells.map((c) => { const t = c.weight / Math.max(1, max); return (
    <Circle key={`${c.lat},${c.lng}`} center={[c.lat, c.lng]} radius={180 + 420 * t} pathOptions={{ color: color(t), fillColor: color(t), fillOpacity: 0.25 + 0.4 * t, weight: 0 }}>
      <Tooltip direction="top"><span dir="rtl">{label}: {c.weight}</span></Tooltip>
    </Circle>); })}</>;
}
