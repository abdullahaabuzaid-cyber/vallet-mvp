import { useState } from 'react';
import { Badge } from '../../components/Layout';
import { STATUS_LABELS, createOperator, setOperatorStatus, useStore } from '../../store/useStore';

const EMPTY = { name: '', area: '', username: '', password: '', siteName: '', siteArea: '', lat: '31.9539', lng: '35.9106', capacity: '10' };

export default function Operators() {
  const operators = useStore((s) => s.operators);
  const employees = useStore((s) => s.employees);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const up = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await createOperator({
      name: f.name,
      area: f.area,
      username: f.username.trim().toLowerCase(),
      password: f.password,
      site: { name: f.siteName, area: f.siteArea || f.area, lat: Number(f.lat), lng: Number(f.lng), capacity: Number(f.capacity) },
    });
    setBusy(false);
    if (r) {
      setF(EMPTY);
      setOpen(false);
    }
  }

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>قائمة المشغّلين</h2>
          <p className="muted" style={{ margin: '6px 0 0' }}>
            الهيئة تنشئ حساب المشغّل، والمشغّل يرفع مستنداته من حسابه، ثم تعتمده الهيئة من «مراجعة التسجيل».
          </p>
        </div>
        <button className="btn btn-primary" type="button" onClick={() => setOpen(!open)}>
          {open ? 'إغلاق' : '+ إنشاء حساب مشغّل'}
        </button>
      </div>

      {open && (
        <form onSubmit={submit} className="card reg-form" style={{ background: 'var(--surface-2)', boxShadow: 'none' }}>
          <div className="grid2">
            <div className="field"><label>اسم الشركة</label><input value={f.name} onChange={up('name')} required /></div>
            <div className="field"><label>المنطقة</label><input value={f.area} onChange={up('area')} placeholder="مثال: عبدون" required /></div>
            <div className="field"><label>اسم المستخدم</label><input value={f.username} onChange={up('username')} dir="ltr" required autoComplete="off" /></div>
            <div className="field"><label>كلمة المرور المؤقتة</label><input type="password" value={f.password} onChange={up('password')} dir="ltr" minLength={8} required autoComplete="new-password" /></div>
          </div>
          <h3>الموقف الأول</h3>
          <div className="grid2">
            <div className="field"><label>اسم الموقف</label><input value={f.siteName} onChange={up('siteName')} required /></div>
            <div className="field"><label>منطقة الموقف</label><input value={f.siteArea} onChange={up('siteArea')} /></div>
            <div className="field"><label>خط العرض</label><input value={f.lat} onChange={up('lat')} dir="ltr" inputMode="decimal" required /></div>
            <div className="field"><label>خط الطول</label><input value={f.lng} onChange={up('lng')} dir="ltr" inputMode="decimal" required /></div>
            <div className="field"><label>السعة (سيارات)</label><input type="number" min={1} value={f.capacity} onChange={up('capacity')} required /></div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'جارٍ الإنشاء…' : 'إنشاء الحساب'}
          </button>
        </form>
      )}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>المشغّل</th>
              <th>المنطقة</th>
              <th>المواقع</th>
              <th>الموظفون</th>
              <th>الترخيص</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {operators.map((o) => {
              const tone = o.status === 'approved' ? 'ok' : o.status === 'pending' ? 'warn' : 'bad';
              return (
                <tr key={o.id}>
                  <td>
                    {o.name}
                    {o.licenseNo && <div className="muted tiny">{o.licenseNo}</div>}
                  </td>
                  <td>{o.area}</td>
                  <td>{o.sites.length}</td>
                  <td>{employees.filter((e) => e.operatorId === o.id).length}</td>
                  <td><Badge tone={tone}>{STATUS_LABELS[o.status]}</Badge></td>
                  <td className="row">
                    {o.status === 'approved' && (
                      <button className="btn btn-sm btn-danger" type="button" onClick={() => setOperatorStatus(o.id, 'suspended')}>
                        تعليق
                      </button>
                    )}
                    {o.status === 'suspended' && (
                      <button className="btn btn-sm btn-success" type="button" onClick={() => setOperatorStatus(o.id, 'approved')}>
                        إعادة تفعيل
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
