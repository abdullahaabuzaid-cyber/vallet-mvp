import { Fragment, useState } from 'react';
import { Badge } from '../../components/Layout';
import {
  addEmployee,
  DOC_STATUS_LABELS,
  docsProgress,
  emptyStaffDocs,
  REVIEW_STATUS_LABELS,
  siteName,
  toggleEmployee,
  uploadEmployeeDoc,
  useStore,
} from '../../store/useStore';
import type { Document, DocStatus } from '../../types';
import { STAFF_DOC_DEFS } from '../../types';

function toneFor(status: DocStatus): 'ok' | 'warn' | 'bad' | 'info' | 'default' {
  if (status === 'accepted') return 'ok';
  if (status === 'uploaded' || status === 'expiring') return 'warn';
  if (status === 'missing' || status === 'rejected') return 'bad';
  return 'default';
}

export default function Employees() {
  const opId = useStore((s) => s.currentOperatorId);
  const op = useStore((s) => s.operators.find((o) => o.id === opId));
  const employees = useStore((s) => s.employees);
  const mine = employees.filter((e) => e.operatorId === opId);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [nid, setNid] = useState('');
  const [phone, setPhone] = useState('');
  const [siteId, setSiteId] = useState(op?.sites[0]?.id || '');
  const [docs, setDocs] = useState<Document[]>(() => emptyStaffDocs());
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!op) return <div className="card empty">لا بيانات</div>;

  function markUpload(docId: string, fileName: string) {
    setDocs((prev) =>
      prev.map((d) =>
        d.id === docId
          ? { ...d, status: 'uploaded', fileName, uploadedAt: new Date().toISOString(), note: undefined }
          : d
      )
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const prog = docsProgress(docs);
    if (!prog.complete) return;
    addEmployee({ name, nationalId: nid, phone, siteId, docs });
    setName('');
    setNid('');
    setPhone('');
    setDocs(emptyStaffDocs());
    setOpen(false);
  }

  const formProgress = docsProgress(docs);

  return (
    <div className="reg-page">
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h2 style={{ margin: 0 }}>تسجيل الموظفين</h2>
            <p className="muted" style={{ margin: '6px 0 0' }}>
              مطلوب لكل موظف: هوية + رخصة قيادة سارية + شهادة عدم محكومية. الحكومة تعتمد قبل التفعيل.
            </p>
          </div>
          <button className="btn btn-primary" type="button" onClick={() => setOpen(!open)}>
            {open ? 'إغلاق' : '+ تسجيل موظف'}
          </button>
        </div>

        {open && (
          <form onSubmit={submit} className="card reg-form" style={{ background: 'var(--surface-2)', boxShadow: 'none' }}>
            <div className="field"><label>الاسم</label><input value={name} onChange={(e) => setName(e.target.value)} required /></div>
            <div className="field"><label>الرقم الوطني</label><input value={nid} onChange={(e) => setNid(e.target.value)} required /></div>
            <div className="field"><label>الهاتف</label><input value={phone} onChange={(e) => setPhone(e.target.value)} required /></div>
            <div className="field">
              <label>الموقع</label>
              <select value={siteId} onChange={(e) => setSiteId(e.target.value)}>
                {op.sites.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} — {s.area}</option>
                ))}
              </select>
            </div>

            <h3>وثائق الموظف ({formProgress.done}/{STAFF_DOC_DEFS.length})</h3>
            <div className="reg-checklist">
              {docs.map((d) => (
                <div key={d.id} className={`reg-item status-${d.status}`}>
                  <div className="reg-item-main">
                    <strong>{d.name}</strong>
                    <Badge tone={toneFor(d.status)}>{DOC_STATUS_LABELS[d.status]}</Badge>
                  </div>
                  {d.fileName && <div className="muted reg-file">📎 {d.fileName}</div>}
                  <label className="btn btn-sm upload-btn" style={{ marginTop: 8 }}>
                    رفع
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      hidden
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) markUpload(d.id, f.name);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
              ))}
            </div>
            <button className="btn btn-primary" type="submit" disabled={!formProgress.complete} style={{ marginTop: 12 }}>
              إرسال لاعتماد الحكومة
            </button>
          </form>
        )}

        <table className="table">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>الوثائق</th>
              <th>مراجعة الحكومة</th>
              <th>الحالة</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {mine.map((e) => {
              const prog = docsProgress(e.docs || []);
              return (
                <Fragment key={e.id}>
                  <tr>
                    <td>
                      <strong>{e.name}</strong>
                      <div className="muted">{e.nationalId}</div>
                      <div className="muted">{e.siteId ? siteName(e.siteId) : '—'}</div>
                    </td>
                    <td>
                      <Badge tone={prog.complete ? 'ok' : 'warn'}>{prog.done}/{prog.total}</Badge>
                    </td>
                    <td>
                      <Badge
                        tone={
                          e.reviewStatus === 'approved' ? 'ok' : e.reviewStatus === 'pending' ? 'warn' : 'bad'
                        }
                      >
                        {REVIEW_STATUS_LABELS[e.reviewStatus]}
                      </Badge>
                      {e.rejectReason && <div className="muted">{e.rejectReason}</div>}
                    </td>
                    <td>{e.active ? <Badge tone="ok">نشط</Badge> : <Badge tone="bad">غير نشط</Badge>}</td>
                    <td>
                      <button className="btn btn-sm" type="button" onClick={() => setExpanded(expanded === e.id ? null : e.id)}>
                        وثائق
                      </button>
                      {e.reviewStatus === 'approved' && (
                        <button className="btn btn-sm" type="button" onClick={() => toggleEmployee(e.id)}>
                          {e.active ? 'إيقاف' : 'تفعيل'}
                        </button>
                      )}
                    </td>
                  </tr>
                  {expanded === e.id && (
                    <tr>
                      <td colSpan={5}>
                        <div className="reg-checklist">
                          {(e.docs || []).map((d) => (
                            <div key={d.id} className={`reg-item status-${d.status}`}>
                              <div className="reg-item-main">
                                <strong>{d.name}</strong>
                                <Badge tone={toneFor(d.status)}>{DOC_STATUS_LABELS[d.status]}</Badge>
                              </div>
                              {d.fileName && <div className="muted">📎 {d.fileName}</div>}
                              <label className="btn btn-sm upload-btn" style={{ marginTop: 6 }}>
                                رفع / تحديث
                                <input
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                                  hidden
                                  onChange={(ev) => {
                                    const f = ev.target.files?.[0];
                                    if (f) uploadEmployeeDoc(e.id, d.id, f.name);
                                    ev.target.value = '';
                                  }}
                                />
                              </label>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
