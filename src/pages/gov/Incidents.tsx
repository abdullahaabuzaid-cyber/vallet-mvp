import { useState } from 'react';
import { Badge } from '../../components/Layout';
import {
  INCIDENT_LABELS,
  INCIDENT_STATUS_LABELS,
  addIncident,
  formatDate,
  operatorName,
  updateIncidentStatus,
  useStore,
} from '../../store/useStore';

export default function GovIncidents() {
  const incidents = useStore((s) => s.incidents);
  const [showFine, setShowFine] = useState(false);
  const [desc, setDesc] = useState('');

  function recordFine(e: React.FormEvent) {
    e.preventDefault();
    const inc = addIncident({ type: 'unlicensed', description: desc || 'فاليه غير مرخّص — مخالفة ميدانية' });
    updateIncidentStatus(inc.id, 'fined');
    setDesc('');
    setShowFine(false);
  }

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>البلاغات والمخالفات</h2>
        <button className="btn btn-primary" type="button" onClick={() => setShowFine(!showFine)}>
          تسجيل مخالفة
        </button>
      </div>

      {showFine && (
        <form onSubmit={recordFine} className="card" style={{ background: 'var(--surface-2)', boxShadow: 'none' }}>
          <p className="muted">فاليه غير مرخّص → غرامة + إغلاق ميداني</p>
          <div className="field">
            <label>الوصف / الموقع</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="موقع المخالفة والتفاصيل" />
          </div>
          <button className="btn btn-danger" type="submit">مخالفة + أمر إغلاق</button>
        </form>
      )}

      <table className="table">
        <thead>
          <tr>
            <th>البلاغ</th>
            <th>النوع</th>
            <th>المشغّل</th>
            <th>التاريخ</th>
            <th>الحالة</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((i) => (
            <tr key={i.id}>
              <td>{i.id.replace('inc-', 'I-')}</td>
              <td>{INCIDENT_LABELS[i.type]}</td>
              <td>{i.operatorId ? operatorName(i.operatorId) : '— (ميداني)'}</td>
              <td>{formatDate(i.createdAt)}</td>
              <td>
                <Badge tone={i.status === 'fined' || i.status === 'closed' ? (i.status === 'fined' ? 'bad' : 'ok') : 'warn'}>
                  {INCIDENT_STATUS_LABELS[i.status]}
                </Badge>
              </td>
              <td className="row">
                {i.status !== 'closed' && i.status !== 'fined' && (
                  <>
                    <button className="btn" type="button" onClick={() => updateIncidentStatus(i.id, 'investigating')}>
                      تحقيق
                    </button>
                    <button className="btn btn-success" type="button" onClick={() => updateIncidentStatus(i.id, 'closed')}>
                      إغلاق
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
