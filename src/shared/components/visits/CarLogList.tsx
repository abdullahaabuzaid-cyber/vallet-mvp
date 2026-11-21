import type { Visit } from '@common/types';
import { Badge } from '@/shared/components/ui/Badge';
import { durationLabel, formatTime } from '@/shared/lib/format';
import { empName, operatorName, siteName, visitStatusLabel } from '@/store';
import { carLabel, statusTone } from './visitDisplay';

/** Visits as a table (desktop) and cards (mobile); clicking one opens its details. */
export function CarLogList({ visits, onSelect, showOperator }: { visits: Visit[]; onSelect: (id: string) => void; showOperator?: boolean }) {
  return (
    <>
      <div className="table-wrap car-log-table">
      <table className="table">
        <thead>
          <tr>
            <th></th>
            <th>اللوحة</th>
            <th>السيارة والمالك</th>
            <th>{showOperator ? 'المشغّل والموقف' : 'الموقف'}</th>
            <th>الحالة</th>
            <th>الدخول ← الخروج</th>
            <th>الموظفون</th>
          </tr>
        </thead>
        <tbody>
          {visits.map((v) => (
            <tr key={v.id} className="car-log-row" data-testid="visit-row" onClick={() => onSelect(v.id)}>
              <td>
                {v.photoThumb ? (
                  <img src={v.photoThumb} alt="" className="car-thumb" width={48} height={32} />
                ) : (
                  <div className="car-thumb car-thumb-empty">—</div>
                )}
              </td>
              <td>
                <strong className="plate-cell">{v.plate}</strong>
                <div className="muted tiny">{v.receiptNo}</div>
              </td>
              <td>
                <div>{carLabel(v)}</div>
                <div className="muted tiny" dir="ltr" style={{ textAlign: 'right' }}>{v.ownerPhone || '—'}</div>
              </td>
              <td>
                <div>{siteName(v.siteId)}</div>
                {showOperator && <div className="muted tiny">{operatorName(v.operatorId)}</div>}
              </td>
              <td>
                <Badge tone={statusTone(v)}>{visitStatusLabel(v)}</Badge>
              </td>
              <td>
                <div>{formatTime(v.checkInAt)} ← {v.checkOutAt ? formatTime(v.checkOutAt) : '…'}</div>
                <div className="muted tiny">{durationLabel(v.checkInAt, v.checkOutAt)}</div>
              </td>
              <td>
                <div>استلم: {empName(v.checkInBy)}</div>
                <div className="muted tiny">سلّم: {v.checkOutBy ? empName(v.checkOutBy) : '—'}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <div className="car-log-cards">
        {visits.map((v) => (
          <button key={v.id} type="button" className="car-card" onClick={() => onSelect(v.id)}>
            <div className="car-card-top">
              {v.photoThumb ? (
                <img src={v.photoThumb} alt="" className="car-thumb" width={64} height={44} />
              ) : (
                <div className="car-thumb car-thumb-empty">سيارة</div>
              )}
              <div>
                <strong className="plate-cell">{v.plate}</strong>
                <div className="muted tiny">{carLabel(v)}</div>
                <Badge tone={statusTone(v)}>{visitStatusLabel(v)}</Badge>
              </div>
            </div>
            <div className="car-card-meta">
              <span>{siteName(v.siteId)}</span>
              <span>دخول {formatTime(v.checkInAt)}</span>
              <span>{v.checkOutAt ? `خروج ${formatTime(v.checkOutAt)}` : 'ما زالت داخل'}</span>
              <span>{durationLabel(v.checkInAt, v.checkOutAt)}</span>
            </div>
            <div className="muted tiny">
              استلم: {empName(v.checkInBy)}
              {v.checkOutBy ? ` · سلّم: ${empName(v.checkOutBy)}` : ''}
              {v.ownerPhone ? ` · ${v.ownerPhone}` : ''}
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
