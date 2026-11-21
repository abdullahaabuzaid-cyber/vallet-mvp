import { useState } from 'react';
import type { Operator } from '@common/types';
import { Badge } from '@/shared/components/ui/Badge';
import { FilterBar, Pager, type FilterField } from '@/shared/components/ui/filters';
import { dateField, searchField, statusField } from '@/shared/components/ui/filters/fields';
import { ListState } from '@/shared/components/ui/ListState';
import { LICENSE_STATUS_LABELS } from '@/shared/constants/labels';
import { formatDate } from '@/shared/lib/format';
import { filterQuery, useFilters } from '@/shared/hooks/useFilters';
import { useServerList } from '@/shared/hooks/useServerList';
import { approveLicense, docsProgress, rejectLicense, useStore } from '@/store';
import { DocChecklist } from './DocChecklist';

const PAGE = 50;
const TONE = { approved: 'ok', pending: 'warn', rejected: 'bad', suspended: 'bad' } as const;
const FIELDS: FilterField[] = [
  searchField('اسم المشغّل، رقم الترخيص أو المنطقة'),
  statusField(LICENSE_STATUS_LABELS),
  { type: 'sort', options: [{ value: 'newest', label: 'الأحدث تقديماً' }, { value: 'oldest', label: 'الأقدم تقديماً' }, { value: 'name', label: 'الاسم' }] },
  { ...dateField, label: 'تاريخ التقديم' },
];

/** Operator licence applications (server-filtered, pending by default) + document review. */
export function OperatorApplications() {
  const operators = useStore((s) => s.operators);
  const filters = useFilters({ status: 'pending' });
  const list = useServerList<Operator>('/api/gov/licenses', filterQuery(filters.values, PAGE), operators);
  const [selected, setSelected] = useState('');
  const [reason, setReason] = useState('');
  const op = operators.find((o) => o.id === selected);
  return (
    <>
      <FilterBar fields={FIELDS} filters={filters} count={list.items.length} total={list.total} loading={list.loading} />
      <div className="card">
        <div className="section-head"><div><h2>طلبات ترخيص المشغّلين</h2><p>الهوية · السجل التجاري · سند/عقد · تأمين · عدم محكومية</p></div></div>
        <ListState loading={list.loading && !list.items.length} error={list.error} count={list.items.length}>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>المشغّل</th><th>المنطقة</th><th>الوثائق</th><th>الحالة</th><th>التقديم</th><th></th></tr></thead>
              <tbody>
                {list.items.map((o) => {
                  const prog = docsProgress(o.docs);
                  return (
                    <tr key={o.id} data-testid="license-row" className={selected === o.id ? 'is-selected' : ''}>
                      <td><strong>{o.name}</strong>{o.licenseNo && <div className="muted tiny" dir="ltr">{o.licenseNo}</div>}</td>
                      <td>{o.area}</td>
                      <td><Badge tone={prog.complete ? 'ok' : 'warn'}>{prog.done}/{prog.total}</Badge></td>
                      <td><Badge tone={TONE[o.status]}>{LICENSE_STATUS_LABELS[o.status]}</Badge></td>
                      <td>{formatDate(o.submittedAt)}</td>
                      <td><button className="btn btn-sm" type="button" onClick={() => setSelected(o.id)}>مراجعة</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ListState>
        <Pager filters={filters} total={list.total} pageSize={PAGE} />
      </div>
      {op && (
        <div className="card reg-review">
          <div className="section-head"><h3>{op.name}</h3><Badge tone={TONE[op.status]}>{LICENSE_STATUS_LABELS[op.status]}</Badge></div>
          <DocChecklist docs={op.docs} />
          {op.status === 'pending' && (
            <>
              <div className="field" style={{ marginTop: 12 }}>
                <label>سبب الرفض (عند الرفض)</label>
                <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="شهادة عدم محكومية ناقصة" />
              </div>
              <div className="row">
                <button className="btn btn-success" type="button" disabled={!docsProgress(op.docs).complete} onClick={() => { void approveLicense(op.id); setSelected(''); }}>قبول الترخيص</button>
                <button className="btn btn-danger" type="button" onClick={() => { void rejectLicense(op.id, reason || 'مستندات ناقصة'); setSelected(''); setReason(''); }}>رفض</button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
