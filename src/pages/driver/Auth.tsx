import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '../../components/Layout';
import { logoutDriver, requestDriverOtp, useStore, verifyDriverOtp } from '../../store/useStore';
import { api } from '../../lib/api';

type DemoDriver = { phone: string; label: string };

export default function DriverAuth() {
  const auth = useStore((s) => s.driverAuth);
  const session = useStore((s) => s.session);
  const nav = useNavigate();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [error, setError] = useState('');
  const [devCode, setDevCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [drivers, setDrivers] = useState<DemoDriver[]>([]);

  useEffect(() => {
    api<{ drivers: DemoDriver[] }>('/api/demo-accounts')
      .then((d) => setDrivers(d.drivers))
      .catch(() => setDrivers([]));
  }, []);

  if (session && session.role !== 'driver') {
    return (
      <div className="phone-shell">
        <div className="card">
          <h2>أنت مسجّل كحساب جهة</h2>
          <p className="muted">سجّل الخروج من حساب الجهة أولاً لتدخل كسائق.</p>
        </div>
      </div>
    );
  }

  if (auth?.verified) {
    return (
      <div className="driver-landing">
        <section className="driver-hero compact">
          <p className="driver-kicker">حساب السائق</p>
          <h1>مسجّل بنجاح</h1>
        </section>
        <section className="driver-sheet tracking">
          <div className="sheet-handle" aria-hidden />
          <div className="tracking-card">
            <Badge tone="ok">تم التحقق</Badge>
            <div className="tracking-plate" style={{ fontSize: '1.2rem', marginTop: 12 }} dir="ltr">
              {auth.phone}
            </div>
            <p className="muted">التسجيل برقم الهاتف فقط — لا وثائق مطلوبة لصاحب السيارة.</p>
            <div className="row" style={{ marginTop: 16, justifyContent: 'center' }}>
              <Link to="/driver" className="btn btn-primary">
                العودة للمواقف
              </Link>
              <Link to="/driver/status" className="btn">
                طلباتي
              </Link>
              <button type="button" className="btn" onClick={() => void logoutDriver()}>
                تسجيل الخروج
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  async function sendOtp(e?: React.FormEvent, override?: string) {
    e?.preventDefault();
    const p = (override ?? phone).trim();
    if (p.replace(/\D/g, '').length < 9) {
      setError('أدخل رقم هاتف أردني صالح');
      return;
    }
    setBusy(true);
    try {
      const r = await requestDriverOtp(p);
      setPhone(r.phone);
      setDevCode(r.devMode && r.devCode ? r.devCode : '');
      setStep('otp');
      setOtp('');
      setError('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await verifyDriverOtp(phone, otp);
      nav('/driver');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="driver-landing">
      <section className="driver-hero">
        <p className="driver-kicker">تسجيل صاحب السيارة</p>
        <h1>دخّل برقم هاتفك</h1>
        <p className="driver-hero-sub">السائق يحتاج رقم هاتف فقط مع رمز تحقق (OTP) يصله برسالة نصية.</p>
      </section>
      <section className="driver-sheet tracking">
        <div className="sheet-handle" aria-hidden />
        <div className="card" style={{ margin: 0, boxShadow: 'none', border: 0, padding: '4px 2px 8px' }}>
          {step === 'phone' && (
            <form onSubmit={sendOtp} className="stack">
              <div className="field">
                <label htmlFor="drv-phone">رقم الهاتف</label>
                <input
                  id="drv-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07XXXXXXXX"
                  inputMode="tel"
                  dir="ltr"
                  required
                  autoFocus
                />
              </div>
              {error && <div className="reg-alert bad">{error}</div>}
              <button className="btn btn-primary btn-big" type="submit" disabled={busy}>
                {busy ? 'جارٍ الإرسال…' : 'إرسال رمز التحقق'}
              </button>
            </form>
          )}
          {step === 'otp' && (
            <form onSubmit={confirm} className="stack">
              <div className="muted">
                أُرسل الرمز إلى <span dir="ltr">{phone}</span>
              </div>
              {devCode && (
                <div className="reg-alert info" data-testid="dev-otp">
                  وضع التطوير (لا يوجد مزوّد SMS مفعّل): الرمز هو <strong dir="ltr">{devCode}</strong>
                </div>
              )}
              <div className="field">
                <label htmlFor="drv-otp">رمز OTP</label>
                <input
                  id="drv-otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="6 أرقام"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  dir="ltr"
                  required
                  autoFocus
                />
              </div>
              {error && <div className="reg-alert bad">{error}</div>}
              <button className="btn btn-primary btn-big" type="submit" disabled={busy}>
                {busy ? 'جارٍ التحقق…' : 'تأكيد الدخول'}
              </button>
              <div className="row">
                <button type="button" className="btn" onClick={() => setStep('phone')}>
                  تغيير الرقم
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => void sendOtp()} disabled={busy}>
                  إعادة إرسال
                </button>
              </div>
            </form>
          )}
          {step === 'phone' && drivers.length > 0 && (
            <div className="demo-accounts" style={{ marginTop: 16 }}>
              <div className="demo-accounts-title">أرقام سائقين تجريبية</div>
              {drivers.map((d) => (
                <button
                  key={d.phone}
                  type="button"
                  className="demo-account"
                  onClick={() => {
                    setPhone(d.phone);
                    void sendOtp(undefined, d.phone);
                  }}
                >
                  <span dir="ltr">{d.phone}</span>
                  <small>{d.label}</small>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
