import type { Visit } from '@common/types';
import { Badge } from '@/shared/components/ui/Badge';
import { durationLabel, formatDateTime } from '@/shared/lib/format';
import { empName, siteName, visitStatusLabel, visitTimeline } from '@/store';
import { carLabel, statusTone } from './visitDisplay';

/** Side drawer: car details, custody timeline, who received / handed over. */
export function VisitDetailDrawer({ visit: selected, onClose }: { visit: Visit; onClose: () => void }) {
  return (
    <div className="drawer-backdrop" onClick={onClose} role="presentation">
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label="تفاصيل الزيارة"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer-head">
          <div>
            <div className="muted tiny">{selected.receiptNo}</div>
            <h3 className="plate-cell" style={{ margin: '4px 0' }}>
              {selected.plate}
            </h3>
            <Badge tone={statusTone(selected)}>{visitStatusLabel(selected)}</Badge>
          </div>
          <button type="button" className="btn btn-sm" onClick={onClose}>
            إغلاق
          </button>
        </div>

        <div className="drawer-body">
          <div className="drawer-car">
            {selected.photoThumb ? (
              <img src={selected.photoThumb} alt="" className="car-thumb-lg" />
            ) : (
              <div className="car-thumb-lg car-thumb-empty">لا صورة</div>
            )}
            <div className="stack" style={{ gap: 6 }}>
              <div>
                <span className="muted">السيارة</span>
                <div>
                  <strong>{carLabel(selected)}</strong>
                </div>
              </div>
              <div>
                <span className="muted">هاتف المالك</span>
                <div dir="ltr">{selected.ownerPhone || '—'}</div>
              </div>
              <div>
                <span className="muted">الموقف</span>
                <div>{siteName(selected.siteId)}</div>
              </div>
              <div>
                <span className="muted">المدة</span>
                <div>{durationLabel(selected.checkInAt, selected.checkOutAt)}</div>
              </div>
              {selected.notes && (
                <div>
                  <span className="muted">ملاحظات</span>
                  <div>{selected.notes}</div>
                </div>
              )}
            </div>
          </div>

          <h4 style={{ marginBottom: 8 }}>الخط الزمني</h4>
          <ol className="timeline">
            {visitTimeline(selected).map((step) => (
              <li key={step.key} className={step.done ? 'done' : 'pending'}>
                <div className="timeline-dot" />
                <div>
                  <strong>{step.label}</strong>
                  {step.at ? (
                    <div className="muted tiny">{formatDateTime(step.at)}</div>
                  ) : (
                    <div className="muted tiny">لم يحدث بعد</div>
                  )}
                  {step.by && <div className="tiny">الموظف: {step.by}</div>}
                </div>
              </li>
            ))}
          </ol>

          <div className="drawer-staff">
            <div>
              <span className="muted">استلمها</span>
              <div>
                <strong>{empName(selected.checkInBy)}</strong>
              </div>
            </div>
            <div>
              <span className="muted">سلّمها</span>
              <div>
                <strong>{selected.checkOutBy ? empName(selected.checkOutBy) : '—'}</strong>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
