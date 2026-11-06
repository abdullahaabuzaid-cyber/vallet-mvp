import { useRef, useState } from 'react';
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

async function fileToThumb(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  const max = 160;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.7);
}

type Pending = {
  plate: string;
  source: string;
  raw?: string;
  mode: 'in' | 'out';
  active?: Visit;
};

export default function StaffScan() {
  const empId = useStore((s) => s.currentEmployeeId);
  const emp = useStore((s) => s.employees.find((e) => e.id === empId));
  const [lastIn, setLastIn] = useState<Visit | null>(null);
  const [lastOut, setLastOut] = useState<Visit | null>(null);
  const [msg, setMsg] = useState('');
  const [modeHint, setModeHint] = useState<'auto' | 'in' | 'out'>('auto');
  const [pending, setPending] = useState<Pending | null>(null);
  const [carMake, setCarMake] = useState('');
  const [carModel, setCarModel] = useState('');
  const [carColor, setCarColor] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [photoThumb, setPhotoThumb] = useState<string | undefined>();
  const [notes, setNotes] = useState('');
  const photoRef = useRef<HTMLInputElement>(null);

  if (!emp) return <div className="card empty">لا موظف حالي</div>;

  function resetPending() {
    setPending(null);
    setCarMake('');
    setCarModel('');
    setCarColor('');
    setOwnerPhone('');
    setPhotoThumb(undefined);
    setNotes('');
  }

  function handlePlate(plate: string, meta: { source: string; raw?: string }) {
    setMsg('');
    setLastIn(null);
    setLastOut(null);
    const active = findActiveVisitByPlate(plate, emp!.operatorId);
    const wantIn = modeHint === 'in' || (!active && modeHint !== 'out');

    if (wantIn) {
      if (active) {
        setMsg(`اللوحة ${plate} موجودة أصلاً في الموقف (${active.receiptNo})`);
        return;
      }
      setNotes(meta.source === 'ocr' ? 'دخول عبر صوّر النمرة (OCR)' : 'دخول يدوي');
      setPending({ plate, source: meta.source, raw: meta.raw, mode: 'in' });
      return;
    }

    if (!active) {
      setMsg(`لا زيارة مفتوحة للوحة ${plate} — يمكنك التحويل لوضع الدخول`);
      return;
    }
    setPending({ plate, source: meta.source, raw: meta.raw, mode: 'out', active });
  }

  function confirmPending() {
    if (!pending) return;
    if (pending.mode === 'in') {
      const visit = checkIn(pending.plate, {
        notes,
        carMake,
        carModel,
        carColor,
        ownerPhone,
        photoThumb,
      });
      setLastIn(visit);
      setMsg(`تم الدخول وختم الوقت · المصدر: ${pending.source}`);
    } else if (pending.active) {
      checkOut(pending.active.id);
      setLastOut({ ...pending.active, checkOutAt: new Date().toISOString(), checkOutBy: empId });
      setMsg(`تم مطابقة اللوحة وإغلاق الزيارة ${pending.active.receiptNo}`);
    }
    resetPending();
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

      {!pending && (
        <div className="card">
          <PlateScanner onPlate={handlePlate} />
        </div>
      )}

      {pending && (
        <div className="card">
          <h3>{pending.mode === 'in' ? 'تأكيد الدخول' : 'تأكيد الخروج'}</h3>
          <div className="receipt" style={{ marginBottom: 12 }}>
            <div>
              اللوحة: <strong>{pending.plate}</strong>
            </div>
            <div className="muted">المصدر: {pending.source}</div>
            {pending.mode === 'out' && pending.active && (
              <div className="muted">إيصال مفتوح: {pending.active.receiptNo} · دخل {formatTime(pending.active.checkInAt)}</div>
            )}
          </div>

          {pending.mode === 'in' && (
            <div className="stack">
              <div className="grid-2">
                <div className="field">
                  <label>الشركة (اختياري)</label>
                  <input value={carMake} onChange={(e) => setCarMake(e.target.value)} placeholder="تويوتا" />
                </div>
                <div className="field">
                  <label>الموديل (اختياري)</label>
                  <input value={carModel} onChange={(e) => setCarModel(e.target.value)} placeholder="كامري" />
                </div>
              </div>
              <div className="grid-2">
                <div className="field">
                  <label>اللون (اختياري)</label>
                  <input value={carColor} onChange={(e) => setCarColor(e.target.value)} placeholder="أبيض" />
                </div>
                <div className="field">
                  <label>هاتف المالك (اختياري)</label>
                  <input value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} placeholder="079xxxxxxx" dir="ltr" />
                </div>
              </div>
              <div className="field">
                <label>صورة السيارة (اختياري)</label>
                <input
                  ref={photoRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    try {
                      setPhotoThumb(await fileToThumb(f));
                    } catch {
                      /* ignore */
                    }
                  }}
                />
                {photoThumb && <img src={photoThumb} alt="" className="car-thumb-lg" style={{ marginTop: 8 }} />}
              </div>
              <div className="field">
                <label>ملاحظات</label>
                <input value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
          )}

          <div className="row" style={{ marginTop: 12 }}>
            <button type="button" className="btn btn-primary btn-big" onClick={confirmPending}>
              {pending.mode === 'in' ? 'تأكيد الدخول وختم الوقت' : 'تأكيد التسليم وإغلاق الزيارة'}
            </button>
            <button type="button" className="btn" onClick={resetPending}>
              إلغاء
            </button>
          </div>
        </div>
      )}

      {msg && (
        <div className="card">
          <Badge tone="ok">{msg}</Badge>
          {lastIn && (
            <div className="muted" style={{ marginTop: 8 }}>
              {lastIn.receiptNo} · {formatDateTime(lastIn.checkInAt)}
              {lastIn.carMake ? ` · ${[lastIn.carMake, lastIn.carModel, lastIn.carColor].filter(Boolean).join(' ')}` : ''}
            </div>
          )}
          {lastOut && (
            <div className="muted" style={{ marginTop: 8 }}>
              أُغلقت {lastOut.receiptNo} · خروج {lastOut.checkOutAt ? formatTime(lastOut.checkOutAt) : ''}
            </div>
          )}
          <div className="row" style={{ marginTop: 10 }}>
            <Link to="/staff/checkin" className="btn btn-sm">
              دخول يدوي مفصل
            </Link>
            <Link to="/staff/cars" className="btn btn-sm">
              السيارات الحالية
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
