import { useState } from 'react';
import { Badge } from '@/shared/components/ui/Badge';
import { FilterBar, type FilterField } from '@/shared/components/ui/filters';
import { searchField, statusField } from '@/shared/components/ui/filters/fields';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { REVIEW_STATUS_LABELS } from '@/shared/constants/labels';
import { filterList } from '@/shared/hooks/filterList';
import { useFilterFields } from '@/shared/hooks/useFilterFields';
import { useFilters } from '@/shared/hooks/useFilters';
import { approveEmployee, docsProgress, operatorName, rejectEmployee, useStore } from '@/store';
import { DocChecklist } from './DocChecklist';

const TONE = { approved: 'ok', pending: 'warn', rejected: 'bad' } as const;

/** Staff registrations (bounded list → filtered locally; URL keys prefixed `s`). */
export function StaffApplications() {
  const employees = useStore((s) => s.employees);
  const filters = useFilters({ status: 'pending' }, 's');
  const fields: FilterField[] = [
    searchField('اسم الموظف أو الرقم الوطني'),
    statusField(REVIEW_STATUS_LABELS),
    ...useFilterFields({ operators: true }),
    { type: 'sort', options: [{ value: 'name', label: 'الاسم' }] },
  ];
  const list = filterList(employees, filters.values, (e) => ({ text: `${e.name} ${e.nationalId}`, status: e.reviewStatus, operatorId: e.operatorId }));
  const [staffId, setStaffId] = useState('');
  const [reason, setReason] = useState('');
  const staff = employees.find((e) => e.id === staffId);
  return (
    <>
      <FilterBar fields={fields} filters={filters} count={list.length} total={employees.length} />
      <div className="card">
        <div className="section-head"><div><h2>اعتماد تسجيل الموظفين</h2><p>هوية · رخصة قيادة سارية · شهادة عدم محكومية</p></div></div>
        {!list.length ? <EmptyState /> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>الموظف</th><th>المشغّل</th><th>الوثائق</th><th>الحالة</th><th></th></tr></thead>
              <tbody>
                {list.map((e) => {
                  const prog = docsProgress(e.docs || []);
                  return (
                    <tr key={e.id} className={staffId === e.id ? 'is-selected' : ''}>
                      <td><strong>{e.name}</strong><div className="muted tiny">{e.nationalId}</div></td>
                      <td>{operatorName(e.operatorId)}</td>
                      <td><Badge tone={prog.complete ? 'ok' : 'warn'}>{prog.done}/{prog.total}</Badge></td>
                      <td><Badge tone={TONE[e.reviewStatus]}>{REVIEW_STATUS_LABELS[e.reviewStatus]}</Badge></td>
                      <td><button className="btn btn-sm" type="button" onClick={() => setStaffId(e.id)}>مراجعة</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {staff && (
        <div className="card reg-review">
          <div className="section-head"><h3>{staff.name} — {operatorName(staff.operatorId)}</h3><Badge tone={TONE[staff.reviewStatus]}>{REVIEW_STATUS_LABELS[staff.reviewStatus]}</Badge></div>
          <DocChecklist docs={staff.docs || []} />
          {staff.reviewStatus === 'pending' && (
            <>
              <div className="field" style={{ marginTop: 12 }}>
                <label>سبب الرفض</label>
                <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="رخصة القيادة منتهية" />
              </div>
              <div className="row">
                <button className="btn btn-success" type="button" disabled={!docsProgress(staff.docs || []).complete} onClick={() => { void approveEmployee(staff.id); setStaffId(''); }}>اعتماد الموظف</button>
                <button className="btn btn-danger" type="button" onClick={() => { void rejectEmployee(staff.id, reason || 'مستندات ناقصة'); setStaffId(''); setReason(''); }}>رفض</button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
