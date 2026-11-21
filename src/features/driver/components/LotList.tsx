import { useStore, type MapLot } from '@/store';

function formatDist(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} م`;
  return `${km.toFixed(1)} كم`;
}

type Props = {
  lots: (MapLot & { distanceKm: number })[];
  selectedSiteId: string | null;
  onSelect: (siteId: string) => void;
};

/** Nearest licensed lots as cards (rating, licence, CTA). */
export function LotList({ lots, selectedSiteId, onSelect }: Props) {
  const lotRatings = useStore((st) => st.lotRatings);
  return (
    <div className="lot-sheet-list">
      {lots.map((lot, idx) => {
        const rating = lotRatings[lot.siteId];
        const selectedCls = selectedSiteId === lot.siteId ? 'selected' : '';
        return (
          <article key={lot.siteId} className={`lot-sheet-card ${selectedCls}`}>
            <button type="button" className="lot-sheet-main" onClick={() => onSelect(lot.siteId)}>
              <div className="lot-sheet-icon" aria-hidden>
                {idx === 0 ? '🅿️' : '🚘'}
              </div>
              <div className="lot-sheet-body">
                <div className="lot-sheet-top">
                  <strong>{lot.siteName}</strong>
                  <span className="lot-dist">{formatDist(lot.distanceKm)}</span>
                </div>
                <div className="lot-sheet-meta">
                  {lot.area} · {lot.operatorName}
                </div>
                <div className="lot-sheet-badges">
                  <span className="pill-licensed">✓ مرخّص</span>
                  {rating ? (
                    <span className="pill-rating" title={`${rating.count} تقييم`}>★ {rating.avg.toFixed(1)} ({rating.count})</span>
                  ) : (
                    <span className="pill-muted">جديد</span>
                  )}
                  {lot.licenseNo && <span className="pill-muted">{lot.licenseNo}</span>}
                </div>
              </div>
            </button>
            <button
              type="button"
              className="btn btn-primary lot-cta"
              onClick={() => onSelect(lot.siteId)}
            >
              سلّم سيارتك
            </button>
          </article>
        );
      })}
    </div>
  );
}
