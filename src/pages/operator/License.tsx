import { Badge } from '../../components/Layout';
import {
  DOC_STATUS_LABELS,
  docsProgress,
  STATUS_LABELS,
  submitOperatorForReview,
  uploadOperatorDoc,
  useStore,
} from '../../store/useStore';
import type { DocStatus } from '../../types';

function toneFor(status: DocStatus): 'ok' | 'warn' | 'bad' | 'info' | 'default' {
  if (status === 'accepted') return 'ok';
  if (status === 'uploaded' || status === 'expiring') return 'warn';
  if (status === 'missing' || status === 'rejected') return 'bad';
  return 'default';
}

export default function License() {
  const opId = useStore((s) => s.currentOperatorId);
  const op = useStore((s) => s.operators.find((o) => o.id === opId));

  if (!op) return <div className="card empty">لا بيانات للمشغّل</div>;

  const progress = docsProgress(op.docs);
  const canSubmit =
    op.docs.every((d) => d.status === 'uploaded' || d.status === 'accepted' || d.status === 'expiring') &&
    op.status !== 'approved';

  const licenseTone =
    op.status === 'approved' ? 'ok' : op.status === 'pending' ? 'warn' : 'bad';

  return (
    <div className="reg-page">
      <div className="card reg-hero">
        <h2>تسجيل / ترخيص المشغّل</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          ارفع الوثائق الإلزامية الخمس. الحكومة تراجع الطلب ثم تعتمد أو ترفض.
        </p>
        <div className="row" style={{ gap: 10 }}>
          <Badge tone={licenseTone}>{STATUS_LABELS[op.status]}</Badge>
          {op.licenseNo && <span className="muted">{op.licenseNo}</span>}
          <Badge tone={progress.complete ? 'ok' : 'warn'}>
            {progress.done}/{progress.total} مرفوعة
          </Badge>
        </div>
        {op.rejectReason && (
          <div className="reg-alert bad" style={{ marginTop: 12 }}>
            سبب الرفض: {op.rejectReason}
          </div>
        )}
      </div>

      <div className="card">
        <h3>قائمة الوثائق المطلوبة</h3>
        <div className="reg-checklist">
          {op.docs.map((d) => (
            <div key={d.id} className={`reg-item status-${d.status}`}>
              <div className="reg-item-main">
                <strong>{d.name}</strong>
                <Badge tone={toneFor(d.status)}>{DOC_STATUS_LABELS[d.status]}</Badge>
              </div>
              {d.fileName && (
                <div className="muted reg-file">📎 {d.fileName}</div>
              )}
              {d.note && <div className="muted">{d.note}</div>}
              <div className="row" style={{ marginTop: 8 }}>
                <label className="btn btn-sm upload-btn">
                  {d.status === 'missing' ? 'رفع ملف' : 'استبدال الملف'}
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      uploadOperatorDoc(op.id, d.id, f.name);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>

        <div className="row" style={{ marginTop: 14 }}>
          <button
            className="btn btn-primary"
            type="button"
            disabled={!canSubmit}
            onClick={() => submitOperatorForReview(op.id)}
          >
            إرسال للمراجعة الحكومية
          </button>
        </div>
        {!canSubmit && (
          <p className="muted" style={{ marginTop: 8 }}>
            أكمل رفع: الهوية الوطنية، السجل التجاري، سند/عقد الإيجار، تأمين المسؤولية، شهادة عدم محكومية.
          </p>
        )}
      </div>
    </div>
  );
}
