import type { Visit } from '@common/types';
import { Badge } from '@/shared/components/ui/Badge';
import { durationLabel, formatTime } from '@/shared/lib/format';
import { empName, siteName, visitStatusLabel } from '@/store';
import { carLabel, statusTone } from './visitDisplay';

/** Visits as a table (desktop) and cards (mobile); clicking one opens its details. */
export function CarLogList({ visits, onSelect }: { visits: Visit[]; onSelect: (id: string) => void }) {
  return (
    <div className="card car-log-table-wrap">
      <table className="table car-log-table">
        <thead>
          <tr>
            <th></th>
            <th>اللوحة</th>
            <th>السيارة</th>
            <th>هاتف المالك</th>
            <th>الموقف</th>
            <th>الحالة</th>
            <th>دخول</th>
            <th>خروج</th>
            <th>المدة</th>
            <th>استلم</th>
            <th>سلّم</th>
          </tr>
        </thead>
        <tbody>
          {visits.map((v) => (
            <tr key={v.id} className="car-log-row" onClick={() => onSelect(v.id)}>
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
              <td>{carLabel(v)}</td>
              <td dir="ltr">{v.ownerPhone || '—'}</td>
              <td>{siteName(v.siteId)}</td>
              <td>
                <Badge tone={statusTone(v)}>{visitStatusLabel(v)}</Badge>
              </td>
              <td>{formatTime(v.checkInAt)}</td>
              <td>{v.checkOutAt ? formatTime(v.checkOutAt) : '—'}</td>
              <td>{durationLabel(v.checkInAt, v.checkOutAt)}</td>
              <td>{empName(v.checkInBy)}</td>
              <td>{v.checkOutBy ? empName(v.checkOutBy) : '—'}</td>
            </tr>
          ))}
          {!visits.length && (
            <tr>
              <td colSpan={11} className="empty">
                لا نتائج مطابقة للفلاتر
              </td>
            </tr>
          )}
        </tbody>
      </table>

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
    </div>
  );
}
