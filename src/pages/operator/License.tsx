import { Badge } from '../../components/Layout';
import { STATUS_LABELS, useStore } from '../../store/useStore';

export default function License() {
  const op = useStore((s) => s.operators.find((o) => o.id === s.currentOperatorId)!);

  const tone =
    op.status === 'approved' ? 'ok' : op.status === 'pending' ? 'warn' : 'bad';

  return (
    <div className="card">
      <h2>حالة الترخيص</h2>
      <div className="field">
        <label>الحالة</label>
        <div>
          <Badge tone={tone}>{STATUS_LABELS[op.status]}</Badge>
          {op.licenseNo && <span style={{ marginInlineStart: 8 }}>{op.licenseNo}</span>}
          {op.licenseExpiry && (
            <span className="muted"> — ينتهي {op.licenseExpiry}</span>
          )}
        </div>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>الوثيقة</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>
          {op.docs.map((d) => (
            <tr key={d.id}>
              <td>{d.name}</td>
              <td>
                {d.status === 'accepted' && <Badge tone="ok">مقبولة</Badge>}
                {d.status === 'expiring' && <Badge tone="warn">{d.note || 'تنتهي قريباً'}</Badge>}
                {d.status === 'missing' && <Badge tone="bad">ناقصة</Badge>}
                {d.status === 'rejected' && <Badge tone="bad">{d.note || 'مرفوضة'}</Badge>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn btn-primary" type="button">رفع وثيقة محدّثة</button>
        <button className="btn" type="button">طلب تجديد</button>
      </div>
      <p className="muted" style={{ marginTop: 8 }}>
        الوثائق الإلزامية: هوية + سند/عقد إيجار + سجل تجاري + تأمين مسؤولية + براءة ذمة
      </p>
    </div>
  );
}
