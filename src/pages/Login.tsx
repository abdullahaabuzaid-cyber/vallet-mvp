import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { login, useStore } from '../store/useStore';

type DemoAccount = { role: 'gov' | 'operator' | 'staff'; username: string; password: string; label: string };
const ROLE_LABEL = { gov: 'الهيئة', operator: 'مشغّل', staff: 'موظف' } as const;
const ROLE_HOME = { gov: '/gov', operator: '/operator', staff: '/staff', driver: '/driver' } as const;

export default function Login() {
  const session = useStore((s) => s.session);
  const nav = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [accounts, setAccounts] = useState<DemoAccount[]>([]);

  useEffect(() => {
    api<{ accounts: DemoAccount[] }>('/api/demo-accounts')
      .then((d) => setAccounts(d.accounts))
      .catch(() => setAccounts([]));
  }, []);

  useEffect(() => {
    if (session && session.role !== 'driver') nav(ROLE_HOME[session.role], { replace: true });
  }, [session, nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await login(username, password);
      nav(ROLE_HOME[r.role as keyof typeof ROLE_HOME] || '/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card card">
        <div className="login-brand">
          <div className="brand-mark" aria-hidden>
            <span className="brand-mark-letter">ف</span>
          </div>
          <div>
            <h1>دخول الجهات</h1>
            <p className="muted">الهيئة · المشغّلون · موظفو الفاليه</p>
          </div>
        </div>
        <form onSubmit={submit} className="stack">
          <div className="field">
            <label htmlFor="login-user">اسم المستخدم</label>
            <input id="login-user" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" dir="ltr" required autoFocus />
          </div>
          <div className="field">
            <label htmlFor="login-pass">كلمة المرور</label>
            <input
              id="login-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              dir="ltr"
              required
            />
          </div>
          {error && <div className="reg-alert bad">{error}</div>}
          <button className="btn btn-primary btn-big" type="submit" disabled={busy}>
            {busy ? 'جارٍ الدخول…' : 'تسجيل الدخول'}
          </button>
        </form>
        <p className="muted" style={{ textAlign: 'center', marginTop: 12 }}>
          صاحب سيارة؟ <Link to="/driver/auth" className="link">ادخل برقم هاتفك</Link>
        </p>
      </div>

      {accounts.length > 0 && (
        <div className="card demo-accounts login-demo">
          <div className="demo-accounts-title">حسابات تجريبية — اضغط للتعبئة</div>
          {accounts.map((a) => (
            <button
              key={a.username}
              type="button"
              className="demo-account"
              onClick={() => {
                setUsername(a.username);
                setPassword(a.password);
                setError('');
              }}
            >
              <span className={`role-chip role-${a.role}`}>{ROLE_LABEL[a.role]}</span>
              <span className="demo-cred" dir="ltr">
                {a.username} / {a.password}
              </span>
              <small>{a.label}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
