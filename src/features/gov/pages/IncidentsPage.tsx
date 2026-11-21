import { useState } from 'react';
import type { Incident } from '@common/types';
import { Badge } from '@/shared/components/ui/Badge';
import { FilterBar, Pager } from '@/shared/components/ui/filters';
import { dateField, kindField, searchField, sortField, statusField } from '@/shared/components/ui/filters/fields';
import { ListState } from '@/shared/components/ui/ListState';
import { StatCard } from '@/shared/components/ui/StatCard';
import { filterQuery, useFilters } from '@/shared/hooks/useFilters';
import { useServerList } from '@/shared/hooks/useServerList';
import { INCIDENT_TYPE_LABELS, INCIDENT_STATUS_LABELS } from '@/shared/constants/labels';
import { addIncident, operatorName, updateIncidentStatus, useStore } from '@/store';
import { formatDate } from '@/shared/lib/format';

const PAGE = 50;

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
  const filters = useFilters();
  const list = useServerList<Incident>('/api/incidents', filterQuery(filters.values, PAGE), incidents);
  const fields = [
    searchField('رقم البلاغ، الوصف، اللوحة أو المنطقة'),
    statusField({ active: 'مفتوحة (جديد + تحقيق)', ...INCIDENT_STATUS_LABELS }),
    kindField(INCIDENT_TYPE_LABELS),
    { type: 'select' as const, key: 'operatorId', label: 'المشغّل', options: [{ value: 'none', label: 'غير مرخّص (ميداني)' }, ...operators.map((o) => ({ value: o.id, label: o.name }))] },
    sortField,
    dateField,
  ];

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
    <>
    <div className="stat-grid">
      <StatCard label="بلاغات مفتوحة" value={incidents.filter((i) => i.status === 'open').length} icon="bell" tone="amber" />
      <StatCard label="قيد التحقيق" value={incidents.filter((i) => i.status === 'investigating').length} icon="search" />
      <StatCard label="غرامات صادرة" value={incidents.filter((i) => i.status === 'fined').length} icon="wallet" tone="violet" />
      <StatCard label="بلاغات غير مرخّصة" value={incidents.filter((i) => i.type === 'unlicensed').length} icon="pin" tone="teal" />
    </div>
    <FilterBar fields={fields} filters={filters} count={list.items.length} total={list.total} loading={list.loading}>
      <button className="btn btn-primary" type="button" onClick={() => setShowFine(!showFine)}>
        تسجيل مخالفة
      </button>
    </FilterBar>
    <div className="card">

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

      <ListState loading={list.loading && !list.items.length} error={list.error} count={list.items.length}>
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
            {list.items.map((i) => (
              <tr key={i.id} data-testid="incident-row">
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
      </ListState>
      <Pager filters={filters} total={list.total} pageSize={PAGE} />
    </div>
    </>
  );
}
