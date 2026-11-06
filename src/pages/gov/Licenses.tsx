import { useState } from 'react';
import { Badge } from '../../components/Layout';
import {
  approveEmployee,
  approveLicense,
  DOC_STATUS_LABELS,
  docsProgress,
  formatDate,
  rejectEmployee,
  rejectLicense,
  REVIEW_STATUS_LABELS,
  useStore,
} from '../../store/useStore';
import type { DocStatus } from '../../types';

function toneFor(status: DocStatus): 'ok' | 'warn' | 'bad' | 'info' | 'default' {
  if (status === 'accepted') return 'ok';
  if (status === 'uploaded' || status === 'expiring') return 'warn';
  if (status === 'missing' || status === 'rejected') return 'bad';
  return 'default';
}

export default function Licenses() {
  const operators = useStore((s) => s.operators);
  const employees = useStore((s) => s.employees);
  const pendingOps = operators.filter((o) => o.status === 'pending');
  const pendingStaff = employees.filter((e) => e.reviewStatus === 'pending');
  const [selected, setSelected] = useState(pendingOps[0]?.id || '');
  const [reason, setReason] = useState('');
  const [staffId, setStaffId] = useState(pendingStaff[0]?.id || '');
  const [staffReason, setStaffReason] = useState('');
  const [tab, setTab] = useState<'ops' | 'staff'>('ops');

  const op = operators.find((o) => o.id === selected);
  const staff = employees.find((e) => e.id === staffId);
  const staffOp = staff ? operators.find((o) => o.id === staff.operatorId) : undefined;

  return (
    <div className="reg-page">
      <div className="card">
        <h2>مراجعة طلبات التسجيل</h2>
        <p className="muted">الحكومة تعتمد وثائق المشغّلين والموظفين قبل الترخيص/التفعيل.</p>
        <div className="view-toggle" role="tablist">
          <button type="button" className={tab === 'ops' ? 'active' : ''} onClick={() => setTab('ops')}>
            مشغّلون ({pendingOps.length})
          </button>
          <button type="button" className={tab === 'staff' ? 'active' : ''} onClick={() => setTab('staff')}>
            موظفون ({pendingStaff.length})
          </button>
        </div>
      </div>

      {tab === 'ops' && (
        <div className="card">
          <h3>طلبات ترخيص المشغّلين</h3>
          <p className="muted">الهوية · السجل التجاري · سند/عقد · تأمين · عدم محكومية</p>
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
              {pendingOps.map((o) => {
                const prog = docsProgress(o.docs);
                return (
                  <tr key={o.id} style={{ background: selected === o.id ? 'var(--primary-soft)' : undefined }}>
                    <td>{o.name}</td>
                    <td>{o.area}</td>
                    <td>
                      <Badge tone={prog.complete ? 'ok' : 'warn'}>{prog.done}/{prog.total}</Badge>
                    </td>
                    <td>{formatDate(o.submittedAt)}</td>
                    <td>
                      <button className="btn" type="button" onClick={() => setSelected(o.id)}>
                        مراجعة
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!pendingOps.length && <div className="empty">لا طلبات مشغّلين معلّقة</div>}

          {op && (
            <div className="reg-review">
              <h3>{op.name}</h3>
              <div className="reg-checklist">
                {op.docs.map((d) => (
                  <div key={d.id} className={`reg-item status-${d.status}`}>
                    <div className="reg-item-main">
                      <strong>{d.name}</strong>
                      <Badge tone={toneFor(d.status)}>{DOC_STATUS_LABELS[d.status]}</Badge>
                    </div>
                    {d.fileName && <div className="muted">📎 {d.fileName}</div>}
                    {d.note && <div className="muted">{d.note}</div>}
                  </div>
                ))}
              </div>
              <div className="field" style={{ marginTop: 12 }}>
                <label>سبب الرفض (عند الرفض)</label>
                <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="شهادة عدم محكومية ناقصة" />
              </div>
              <div className="row">
                <button
                  className="btn btn-success"
                  type="button"
                  disabled={!docsProgress(op.docs).complete}
                  onClick={() => {
                    approveLicense(op.id);
                    setSelected('');
                  }}
                >
                  قبول الترخيص
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
      )}

      {tab === 'staff' && (
        <div className="card">
          <h3>اعتماد تسجيل الموظفين</h3>
          <p className="muted">هوية · رخصة قيادة سارية · شهادة عدم محكومية</p>
          <table className="table">
            <thead>
              <tr>
                <th>الموظف</th>
                <th>المشغّل</th>
                <th>الوثائق</th>
                <th>الحالة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pendingStaff.map((e) => {
                const prog = docsProgress(e.docs || []);
                const o = operators.find((x) => x.id === e.operatorId);
                return (
                  <tr key={e.id} style={{ background: staffId === e.id ? 'var(--primary-soft)' : undefined }}>
                    <td>
                      <strong>{e.name}</strong>
                      <div className="muted">{e.nationalId}</div>
                    </td>
                    <td>{o?.name ?? e.operatorId}</td>
                    <td>
                      <Badge tone={prog.complete ? 'ok' : 'warn'}>{prog.done}/{prog.total}</Badge>
                    </td>
                    <td>
                      <Badge tone="warn">{REVIEW_STATUS_LABELS[e.reviewStatus]}</Badge>
                    </td>
                    <td>
                      <button className="btn" type="button" onClick={() => setStaffId(e.id)}>
                        مراجعة
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!pendingStaff.length && <div className="empty">لا طلبات موظفين معلّقة</div>}

          {staff && (
            <div className="reg-review">
              <h3>
                {staff.name} — {staffOp?.name}
              </h3>
              <div className="reg-checklist">
                {(staff.docs || []).map((d) => (
                  <div key={d.id} className={`reg-item status-${d.status}`}>
                    <div className="reg-item-main">
                      <strong>{d.name}</strong>
                      <Badge tone={toneFor(d.status)}>{DOC_STATUS_LABELS[d.status]}</Badge>
                    </div>
                    {d.fileName && <div className="muted">📎 {d.fileName}</div>}
                  </div>
                ))}
              </div>
              <div className="field" style={{ marginTop: 12 }}>
                <label>سبب الرفض</label>
                <input
                  value={staffReason}
                  onChange={(e) => setStaffReason(e.target.value)}
                  placeholder="رخصة القيادة منتهية"
                />
              </div>
              <div className="row">
                <button
                  className="btn btn-success"
                  type="button"
                  disabled={!docsProgress(staff.docs || []).complete}
                  onClick={() => {
                    approveEmployee(staff.id);
                    setStaffId('');
                  }}
                >
                  اعتماد الموظف
                </button>
                <button
                  className="btn btn-danger"
                  type="button"
                  onClick={() => {
                    rejectEmployee(staff.id, staffReason || 'مستندات ناقصة');
                    setStaffId('');
                    setStaffReason('');
                  }}
                >
                  رفض
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
