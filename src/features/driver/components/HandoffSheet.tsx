import { useResource } from '@/shared/hooks/useResource';
import { formatJod } from '@/shared/lib/format';
import { Link } from 'react-router-dom';
import type { MapLot } from '@/store';

type Props = {
  verified: boolean;
  selected?: MapLot;
  plate: string;
  onPlateChange: (plate: string) => void;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
};

/** Bottom sheet: sign-in prompt, or the plate form for the selected lot. */
function PriceNow({ siteId }: { siteId: string }) {
  const { data } = useResource<{ fee: number | null; rule: string | null }>(`/api/pricing/quote?siteId=${siteId}`, { fee: null, rule: null });
  return data.fee == null ? null : <div className="muted tiny" data-testid="price-now">السعر الآن: <strong>{formatJod(data.fee)}</strong> · {data.rule}</div>;
}

export function HandoffSheet({ verified, selected, plate, onPlateChange, onCancel, onSubmit }: Props) {
  return (
    <>
      {!verified && (
        <div className="card handoff-sheet">
          <strong>سجّل برقم هاتفك أولاً</strong>
          <p className="muted" style={{ margin: '8px 0 12px' }}>
            صاحب السيارة يحتاج هاتف + OTP فقط — بدون وثائق.
          </p>
          <Link to="/driver/auth" className="btn btn-primary" style={{ width: '100%' }}>
            تسجيل الدخول بالهاتف
          </Link>
        </div>
      )}

      {selected && verified && (
        <div className="handoff-sheet card">
          <div className="handoff-sheet-head">
            <div>
              <div className="muted">تسليم إلى</div>
              <strong>
                {selected.siteName} — {selected.area}
              </strong>
            </div>
            <button type="button" className="btn btn-sm" onClick={onCancel}>
              إلغاء
            </button>
          </div>
          <PriceNow siteId={selected.siteId} />
          <form onSubmit={onSubmit} className="stack">
            <div className="field">
              <label>رقم لوحة سيارتك</label>
              <input
                value={plate}
                onChange={(e) => onPlateChange(e.target.value)}
                placeholder="12-34567"
                required
                autoFocus
                inputMode="text"
              />
            </div>
            <button className="btn btn-primary btn-big" type="submit">
              تأكيد التسليم
            </button>
          </form>
        </div>
      )}
    </>
  );
}
