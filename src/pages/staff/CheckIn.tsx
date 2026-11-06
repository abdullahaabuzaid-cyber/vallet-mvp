import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PlateScanner } from '../../components/PlateScanner';
import { checkIn, empName, formatDateTime, useStore } from '../../store/useStore';
import type { Visit } from '../../types';

export default function CheckIn() {
  const empId = useStore((s) => s.currentEmployeeId);
  const [plate, setPlate] = useState('');
  const [notes, setNotes] = useState('');
  const [visit, setVisit] = useState<Visit | null>(null);
  const [showCam, setShowCam] = useState(true);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!plate.trim()) return;
    setVisit(checkIn(plate, notes));
    setPlate('');
    setNotes('');
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
              if (meta.source === 'ocr') setNotes('دخول عبر OCR');
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
