import { useState } from 'react';
import { Link } from 'react-router-dom';
import { addIncident, useStore } from '../../store/useStore';
import type { IncidentType } from '../../types';

export default function IncidentForm() {
  const emp = useStore((s) => s.employees.find((e) => e.id === s.currentEmployeeId)!);
  const visits = useStore((s) =>
    s.visits.filter((v) => v.operatorId === emp.operatorId).slice(0, 30)
  );
  const [visitId, setVisitId] = useState('');
  const [type, setType] = useState<IncidentType>('damage');
  const [desc, setDesc] = useState('');
  const [ok, setOk] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!desc.trim()) return;
    const visit = visits.find((v) => v.id === visitId);
    addIncident({
      type,
      description: desc,
      visitId: visit?.id,
      plate: visit?.plate,
      operatorId: visit?.operatorId ?? emp.operatorId,
    });
    setOk(true);
    setDesc('');
  }

  if (ok) {
    return (
      <div className="phone-shell">
        <div className="card">
          <div className="receipt">
            <div className="muted">تم إرسال البلاغ</div>
            <div className="code">✓</div>
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn btn-primary" type="button" onClick={() => setOk(false)}>
              بلاغ جديد
            </button>
            <Link to="/staff" className="btn">
              الرئيسية
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="phone-shell">
      <div className="card">
        <h2>بلاغ حادثة جديد</h2>
        <form onSubmit={submit}>
          <div className="field">
            <label>رقم الزيارة</label>
            <select value={visitId} onChange={(e) => setVisitId(e.target.value)}>
              <option value="">— اختياري —</option>
              {visits.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.receiptNo} · {v.plate}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>نوع الحادثة</label>
            <select value={type} onChange={(e) => setType(e.target.value as IncidentType)}>
              <option value="damage">ضرر</option>
              <option value="lost_keys">فقدان مفاتيح</option>
              <option value="delay">تأخير</option>
              <option value="other">أخرى</option>
            </select>
          </div>
          <div className="field">
            <label>الوصف</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} required placeholder="اكتب التفاصيل..." />
          </div>
          <div
            style={{
              height: 50,
              border: '1px dashed var(--border-strong)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-3)',
              marginBottom: 12,
              fontSize: 13,
            }}
          >
            إرفاق صور (تجريبي)
          </div>
          <button className="btn btn-primary btn-big" type="submit">
            إرسال البلاغ
          </button>
        </form>
      </div>
    </div>
  );
}
