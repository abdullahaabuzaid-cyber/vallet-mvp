import { useState } from 'react';
import { Badge } from '../../components/Layout';
import { approveLicense, formatDate, rejectLicense, useStore } from '../../store/useStore';

export default function Licenses() {
  const pending = useStore((s) => s.operators.filter((o) => o.status === 'pending'));
  const [selected, setSelected] = useState(pending[0]?.id || '');
  const [reason, setReason] = useState('');
  const op = useStore((s) => s.operators.find((o) => o.id === selected));

  return (
    <div className="card">
      <h2>طلبات الترخيص</h2>
      <p className="muted">مراجعة الوثائق الخمس وقبول الطلب أو رفضه</p>

      <table className="table">
        <thead>
          <tr>
            <th>المشغّل</th>
            <th>المنطقة</th>
            <th>الوثائق</th>
            <th>التاريخ</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {pending.map((o) => {
            const ok = o.docs.filter((d) => d.status === 'accepted' || d.status === 'expiring').length;
            return (
              <tr key={o.id} style={{ background: selected === o.id ? 'var(--primary-soft)' : undefined }}>
                <td>{o.name}</td>
                <td>{o.area}</td>
                <td>{ok}/5</td>
                <td>{formatDate(o.submittedAt)}</td>
                <td>
                  <button className="btn" type="button" onClick={() => setSelected(o.id)}>
                    عرض
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!pending.length && <div className="empty">لا طلبات معلّقة</div>}

      {op && (
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <h3>{op.name}</h3>
          <table className="table">
            <thead><tr><th>الوثيقة</th><th>الحالة</th></tr></thead>
            <tbody>
              {op.docs.map((d) => (
                <tr key={d.id}>
                  <td>{d.name}</td>
                  <td>
                    {(d.status === 'accepted' || d.status === 'expiring') && <Badge tone="ok">مقبولة</Badge>}
                    {d.status === 'missing' && <Badge tone="bad">ناقصة</Badge>}
                    {d.status === 'rejected' && <Badge tone="bad">مرفوضة</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="field">
            <label>سبب الرفض (عند الرفض)</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="براءة الذمة ناقصة" />
          </div>
          <div className="row">
            <button className="btn btn-success" type="button" onClick={() => { approveLicense(op.id); setSelected(''); }}>
              قبول
            </button>
            <button
              className="btn btn-danger"
              type="button"
              onClick={() => {
                rejectLicense(op.id, reason || 'مستندات ناقصة');
                setSelected('');
                setReason('');
              }}
            >
              رفض
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
