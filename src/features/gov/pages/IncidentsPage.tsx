import { useState } from 'react';
import { Badge } from '@/shared/components/ui/Badge';
import { INCIDENT_TYPE_LABELS, INCIDENT_STATUS_LABELS } from '@/shared/constants/labels';
import { addIncident, operatorName, updateIncidentStatus, useStore } from '@/store';
import { formatDate } from '@/shared/lib/format';

export default function IncidentsPage() {
  const incidents = useStore((s) => s.incidents);
  const operators = useStore((s) => s.operators);
  const [showFine, setShowFine] = useState(false);
  const [desc, setDesc] = useState('');
  const [area, setArea] = useState('');
  const [operatorId, setOperatorId] = useState('');
  const [amount, setAmount] = useState(1000);
  const [rowAmount, setRowAmount] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);

  async function recordFine(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const inc = await addIncident({
      type: operatorId ? 'other' : 'unlicensed',
      description: desc || 'فاليه غير مرخّص — مخالفة ميدانية',
      operatorId: operatorId || undefined,
      area: area || undefined,
    });
    if (inc) await updateIncidentStatus(inc.id, 'fined', amount);
    setBusy(false);
    if (inc) {
      setDesc('');
      setArea('');
      setShowFine(false);
    }
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
          <p className="muted">فاليه غير مرخّص أو مخالفة مشغّل → غرامة + فاتورة تلقائية</p>
          <div className="grid2">
            <div className="field">
              <label>المخالف</label>
              <select value={operatorId} onChange={(e) => setOperatorId(e.target.value)}>
                <option value="">فاليه غير مرخّص (ميداني)</option>
                {operators.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>المنطقة</label>
              <input value={area} onChange={(e) => setArea(e.target.value)} placeholder="مثال: الدوار الثالث" />
            </div>
          </div>
          <div className="field">
            <label>الوصف / الموقع</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="موقع المخالفة والتفاصيل" />
          </div>
          <div className="field">
            <label>مبلغ الغرامة (دينار)</label>
            <input type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          </div>
          <button className="btn btn-danger" type="submit" disabled={busy}>
            {busy ? 'جارٍ التسجيل…' : 'مخالفة + أمر إغلاق + فاتورة'}
          </button>
        </form>
      )}

      <div className="table-wrap">
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
                <td>
                  {i.id.replace('inc-', 'I-')}
                  <div className="muted" style={{ maxWidth: 260 }}>{i.description}</div>
                </td>
                <td>{INCIDENT_TYPE_LABELS[i.type]}</td>
                <td>{i.operatorId ? operatorName(i.operatorId) : `— (ميداني${i.area ? ` · ${i.area}` : ''})`}</td>
                <td>{formatDate(i.createdAt)}</td>
                <td>
                  <Badge tone={i.status === 'fined' || i.status === 'closed' ? (i.status === 'fined' ? 'bad' : 'ok') : 'warn'}>
                    {INCIDENT_STATUS_LABELS[i.status]}
                  </Badge>
                </td>
                <td className="row">
                  {i.status !== 'closed' && i.status !== 'fined' && (
                    <>
                      {i.status !== 'investigating' && (
                        <button className="btn btn-sm" type="button" onClick={() => updateIncidentStatus(i.id, 'investigating')}>
                          تحقيق
                        </button>
                      )}
                      <button className="btn btn-sm btn-success" type="button" onClick={() => updateIncidentStatus(i.id, 'closed')}>
                        إغلاق
                      </button>
                      <input
                        type="number"
                        min={1}
                        aria-label="مبلغ الغرامة"
                        style={{ width: 80 }}
                        value={rowAmount[i.id] ?? 1000}
                        onChange={(e) => setRowAmount((p) => ({ ...p, [i.id]: Number(e.target.value) }))}
                      />
                      <button className="btn btn-sm btn-danger" type="button" onClick={() => updateIncidentStatus(i.id, 'fined', rowAmount[i.id] ?? 1000)}>
                        غرامة
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
