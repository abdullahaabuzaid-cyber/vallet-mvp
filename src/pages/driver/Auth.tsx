import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '../../components/Layout';
import {
  DEMO_OTP,
  logoutDriver,
  requestDriverOtp,
  useStore,
  verifyDriverOtp,
} from '../../store/useStore';

export default function DriverAuth() {
  const auth = useStore((s) => s.driverAuth);
  const nav = useNavigate();
  const [phone, setPhone] = useState(auth?.phone || '');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>(auth?.phone && !auth.verified ? 'otp' : 'phone');
  const [error, setError] = useState('');
  const [sentHint, setSentHint] = useState('');

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
            <div className="tracking-plate" style={{ fontSize: '1.2rem', marginTop: 12 }}>
              {auth.phone}
            </div>
            <p className="muted">التسجيل برقم الهاتف فقط — لا وثائق مطلوبة لصاحب السيارة.</p>
            <div className="row" style={{ marginTop: 16, justifyContent: 'center' }}>
              <Link to="/driver" className="btn btn-primary">
                العودة للمواقف
              </Link>
              <button type="button" className="btn" onClick={() => logoutDriver()}>
                تسجيل الخروج
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim() || phone.trim().length < 8) {
      setError('أدخل رقم هاتف أردني صالح');
      return;
    }
    const code = requestDriverOtp(phone);
    setSentHint(`تم إرسال رمز تجريبي: ${code}`);
    setStep('otp');
    setError('');
  }

  function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!verifyDriverOtp(otp)) {
      setError(`رمز غير صحيح — للتجربة استخدم ${DEMO_OTP}`);
      return;
    }
    nav('/driver');
  }

  return (
    <div className="driver-landing">
      <section className="driver-hero">
        <p className="driver-kicker">تسجيل صاحب السيارة</p>
        <h1>دخّل برقم هاتفك</h1>
        <p className="driver-hero-sub">
          السائق يحتاج رقم هاتف فقط مع رمز تحقق (OTP). لا هوية ولا وثائق إضافية.
        </p>
      </section>
      <section className="driver-sheet tracking">
        <div className="sheet-handle" aria-hidden />
        <div className="card" style={{ margin: 0, boxShadow: 'none', border: 0, padding: '4px 2px 8px' }}>
          {step === 'phone' && (
            <form onSubmit={sendOtp} className="stack">
              <div className="field">
                <label>رقم الهاتف</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07XXXXXXXX"
                  inputMode="tel"
                  required
                  autoFocus
                />
              </div>
              {error && <div className="reg-alert bad">{error}</div>}
              <button className="btn btn-primary btn-big" type="submit">
                إرسال رمز التحقق
              </button>
            </form>
          )}
          {step === 'otp' && (
            <form onSubmit={confirm} className="stack">
              <div className="muted">أُرسل الرمز إلى {phone}</div>
              {sentHint && <div className="reg-alert info">{sentHint}</div>}
              <div className="field">
                <label>رمز OTP</label>
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder={DEMO_OTP}
                  inputMode="numeric"
                  required
                  autoFocus
                />
              </div>
              {error && <div className="reg-alert bad">{error}</div>}
              <button className="btn btn-primary btn-big" type="submit">
                تأكيد الدخول
              </button>
              <button type="button" className="btn" onClick={() => setStep('phone')}>
                تغيير الرقم
              </button>
            </form>
          )}
          <p className="muted" style={{ marginTop: 14, textAlign: 'center' }}>
            رمز التجربة الثابت: <strong>{DEMO_OTP}</strong>
          </p>
        </div>
      </section>
    </div>
  );
}
