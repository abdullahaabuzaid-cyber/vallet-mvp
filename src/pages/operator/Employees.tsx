import { useState } from 'react';
import { Badge } from '../../components/Layout';
import { addEmployee, siteName, toggleEmployee, useStore } from '../../store/useStore';

export default function Employees() {
  const opId = useStore((s) => s.currentOperatorId);
  const op = useStore((s) => s.operators.find((o) => o.id === opId)!);
  const employees = useStore((s) => s.employees.filter((e) => e.operatorId === opId));
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [nid, setNid] = useState('');
  const [phone, setPhone] = useState('');
  const [siteId, setSiteId] = useState(op.sites[0]?.id || '');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    addEmployee({ name, nationalId: nid, phone, siteId });
    setName('');
    setNid('');
    setPhone('');
    setOpen(false);
  }

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>إدارة الموظفين</h2>
        <button className="btn btn-primary" type="button" onClick={() => setOpen(!open)}>
          + إضافة موظف
        </button>
      </div>

      {open && (
        <form onSubmit={submit} className="card" style={{ background: 'var(--surface-2)', boxShadow: 'none' }}>
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
          <button className="btn btn-primary" type="submit">حفظ</button>
        </form>
      )}

      <table className="table">
        <thead>
          <tr>
            <th>الاسم</th>
            <th>الرقم الوطني</th>
            <th>الموقع</th>
            <th>الحالة</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {employees.map((e) => (
            <tr key={e.id}>
              <td>{e.name}</td>
              <td>{e.nationalId}</td>
              <td>{e.siteId ? siteName(e.siteId) : '—'}</td>
              <td>{e.active ? <Badge tone="ok">نشط</Badge> : <Badge tone="bad">موقوف</Badge>}</td>
              <td>
                <button className="btn" type="button" onClick={() => toggleEmployee(e.id)}>
                  {e.active ? 'إيقاف' : 'تفعيل'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
