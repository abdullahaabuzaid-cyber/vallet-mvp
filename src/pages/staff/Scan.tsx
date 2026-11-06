import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PlateScanner } from '../../components/PlateScanner';
import { Badge } from '../../components/Layout';
import {
  checkIn,
  checkOut,
  empName,
  findActiveVisitByPlate,
  formatDateTime,
  formatTime,
  useStore,
} from '../../store/useStore';
import type { Visit } from '../../types';

export default function StaffScan() {
  const empId = useStore((s) => s.currentEmployeeId);
  const emp = useStore((s) => s.employees.find((e) => e.id === empId));
  const [lastIn, setLastIn] = useState<Visit | null>(null);
  const [lastOut, setLastOut] = useState<Visit | null>(null);
  const [msg, setMsg] = useState('');
  const [modeHint, setModeHint] = useState<'auto' | 'in' | 'out'>('auto');

  if (!emp) return <div className="card empty">لا موظف حالي</div>;

  function handlePlate(plate: string, meta: { source: string; raw?: string }) {
    setMsg('');
    setLastIn(null);
    setLastOut(null);
    const active = findActiveVisitByPlate(plate, emp!.operatorId);

    if (modeHint === 'in' || (!active && modeHint !== 'out')) {
      if (active) {
        setMsg(`اللوحة ${plate} موجودة أصلاً في الموقف (${active.receiptNo})`);
        return;
      }
      const stamp = new Date().toISOString();
      const visit = checkIn(plate, meta.source === 'ocr' ? 'دخول عبر صوّر النمرة (OCR)' : 'دخول يدوي');
      // stamp already set inside checkIn; show UI time
      setLastIn({ ...visit, checkInAt: visit.checkInAt || stamp });
      setMsg(`تم الدخول وختم الوقت · المصدر: ${meta.source}`);
      return;
    }

    // exit path
    if (!active) {
      setMsg(`لا زيارة مفتوحة للوحة ${plate} — يمكنك التحويل لوضع الدخول`);
      return;
    }
    checkOut(active.id);
    setLastOut({ ...active, checkOutAt: new Date().toISOString(), checkOutBy: empId });
    setMsg(`تم مطابقة اللوحة وإغلاق الزيارة ${active.receiptNo}`);
  }

  return (
    <div className="phone-shell">
      <div className="card">
        <h2>صوّر النمرة</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          التقط صورة اللوحة — OCR يملأ الرقم ويختم وقت الدخول تلقائياً. عند الخروج صوّر نفس اللوحة للمطابقة والإغلاق.
        </p>
        <div className="view-toggle" role="tablist" aria-label="وضع المسح">
          <button type="button" className={modeHint === 'auto' ? 'active' : ''} onClick={() => setModeHint('auto')}>
            تلقائي
          </button>
          <button type="button" className={modeHint === 'in' ? 'active' : ''} onClick={() => setModeHint('in')}>
            دخول فقط
          </button>
          <button type="button" className={modeHint === 'out' ? 'active' : ''} onClick={() => setModeHint('out')}>
            خروج فقط
          </button>
        </div>
        <div className="muted" style={{ marginTop: 8 }}>
          الموظف: {empName(empId)} · الوضع:{' '}
          {modeHint === 'auto' ? 'دخول إن لم توجد زيارة، وإلا خروج' : modeHint === 'in' ? 'دخول' : 'خروج'}
        </div>
      </div>

      <div className="card">
        <PlateScanner onPlate={handlePlate} />
      </div>

      {msg && (
        <div className="card">
          <Badge tone="info">{msg}</Badge>
        </div>
      )}

      {lastIn && (
        <div className="card">
          <div className="receipt">
            <div className="muted">إيصال دخول</div>
            <div className="code">{lastIn.receiptNo}</div>
            <div>
              اللوحة: <strong>{lastIn.plate}</strong>
            </div>
            <div className="muted">وقت الدخول: {formatDateTime(lastIn.checkInAt)}</div>
          </div>
        </div>
      )}

      {lastOut && (
        <div className="card">
          <div className="receipt">
            <div className="muted">تم الخروج</div>
            <div className="code">{lastOut.receiptNo}</div>
            <div>
              اللوحة: <strong>{lastOut.plate}</strong>
            </div>
            <div className="muted">
              دخول {formatTime(lastOut.checkInAt)}
              {lastOut.checkOutAt ? ` · خروج ${formatTime(lastOut.checkOutAt)}` : ''}
            </div>
          </div>
        </div>
      )}

      <div className="row" style={{ padding: '0 4px' }}>
        <Link to="/staff/checkin" className="btn">
          دخول يدوي كلاسيكي
        </Link>
        <Link to="/staff/checkout" className="btn">
          بحث خروج
        </Link>
      </div>
    </div>
  );
}
