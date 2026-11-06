import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlateScanner } from '../../components/PlateScanner';
import { checkIn, empName, formatDateTime, useStore } from '../../store/useStore';
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

export default function CheckIn() {
  const empId = useStore((s) => s.currentEmployeeId);
  const [plate, setPlate] = useState('');
  const [notes, setNotes] = useState('');
  const [carMake, setCarMake] = useState('');
  const [carModel, setCarModel] = useState('');
  const [carColor, setCarColor] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [photoThumb, setPhotoThumb] = useState<string | undefined>();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [showCam, setShowCam] = useState(true);
  const photoRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setPlate('');
    setNotes('');
    setCarMake('');
    setCarModel('');
    setCarColor('');
    setOwnerPhone('');
    setPhotoThumb(undefined);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!plate.trim()) return;
    setVisit(
      checkIn(plate, {
        notes,
        carMake,
        carModel,
        carColor,
        ownerPhone,
        photoThumb,
      })
    );
    resetForm();
  }

  if (visit) {
    return (
      <div className="phone-shell">
        <div className="card">
          <div className="receipt">
            <div className="muted">تم إصدار إيصال الزيارة</div>
            <div className="code">{visit.receiptNo}</div>
            <div>
              اللوحة: <strong>{visit.plate}</strong>
            </div>
            {(visit.carMake || visit.carModel || visit.carColor) && (
              <div className="muted">
                السيارة: {[visit.carMake, visit.carModel, visit.carColor].filter(Boolean).join(' · ')}
              </div>
            )}
            <div className="muted">وقت الدخول: {formatDateTime(visit.checkInAt)}</div>
            <div className="muted">الموظف: {empName(visit.checkInBy)}</div>
            {visit.notes && <div className="muted">ملاحظات: {visit.notes}</div>}
          </div>
          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn btn-primary" type="button" onClick={() => setVisit(null)}>
              دخول سيارة أخرى
            </button>
            <Link to="/staff/scan" className="btn">
              صوّر النمرة
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="phone-shell">
      <div className="card">
        <h2>تسجيل دخول سيارة</h2>
        <div className="row" style={{ marginBottom: 10 }}>
          <button type="button" className={`btn btn-sm ${showCam ? 'btn-primary' : ''}`} onClick={() => setShowCam(true)}>
            صوّر النمرة
          </button>
          <button type="button" className={`btn btn-sm ${!showCam ? 'btn-primary' : ''}`} onClick={() => setShowCam(false)}>
            يدوي فقط
          </button>
          <Link to="/staff/scan" className="btn btn-sm">
            شاشة المسح الكاملة
          </Link>
        </div>
        {showCam && (
          <PlateScanner
            onPlate={(p, meta) => {
              setPlate(p);
              if (meta.source === 'ocr') setNotes((n) => n || 'دخول عبر OCR');
            }}
          />
        )}
        <form onSubmit={submit} className="stack" style={{ marginTop: 12 }}>
          <div className="field">
            <label>رقم اللوحة</label>
            <input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="12-34567" required />
          </div>
          <div className="field">
            <label>الموظف</label>
            <input value={empName(empId) + ' (تلقائي)'} disabled />
          </div>
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
            <label>صورة السيارة / اللوحة (اختياري)</label>
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
            {photoThumb && <img src={photoThumb} alt="معاينة" className="car-thumb-lg" style={{ marginTop: 8 }} />}
          </div>
          <div className="field">
            <label>ملاحظات الحالة</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="خدش باب أمامي (اختياري)" />
          </div>
          <button className="btn btn-primary btn-big" type="submit">
            تأكيد وإصدار إيصال · يختم الوقت الآن
          </button>
        </form>
      </div>
    </div>
  );
}
