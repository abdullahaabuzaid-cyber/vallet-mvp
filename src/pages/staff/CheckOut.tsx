import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlateScanner } from '../../components/PlateScanner';
import {
  checkOut,
  durationLabel,
  empName,
  findActiveVisitByPlate,
  formatTime,
  useStore,
} from '../../store/useStore';

export default function CheckOut() {
  const emp = useStore((s) => s.employees.find((e) => e.id === s.currentEmployeeId)!);
  const visits = useStore((s) => s.visits);
  const [q, setQ] = useState('');
  const [done, setDone] = useState<string | null>(null);
  const [scanMsg, setScanMsg] = useState('');

  const results = useMemo(() => {
    const active = visits.filter((v) => !v.checkOutAt && v.operatorId === emp.operatorId);
    const query = q.trim().toLowerCase();
    if (!query) return active.slice(0, 8);
    return active.filter(
      (v) => v.plate.toLowerCase().includes(query) || v.receiptNo.toLowerCase().includes(query)
    );
  }, [visits, q, emp.operatorId]);

  function confirm(id: string, receipt: string) {
    checkOut(id);
    setDone(receipt);
    setQ('');
  }

  return (
    <div className="phone-shell">
      <div className="card">
        <h2>خروج سيارة</h2>
        <p className="muted">صوّر النمرة للمطابقة التلقائية أو ابحث يدوياً</p>
        <PlateScanner
          onPlate={(plate) => {
            const active = findActiveVisitByPlate(plate, emp.operatorId);
            if (!active) {
              setScanMsg(`لا زيارة مفتوحة لـ ${plate}`);
              setQ(plate);
              return;
            }
            checkOut(active.id);
            setDone(active.receiptNo);
            setScanMsg(`تمت مطابقة ${plate} وإغلاق ${active.receiptNo}`);
          }}
        />
        {scanMsg && <div className="muted" style={{ marginTop: 8 }}>{scanMsg}</div>}
        <Link to="/staff/scan" className="btn" style={{ marginTop: 10, display: 'inline-block' }}>
          شاشة صوّر النمرة الموحدة
        </Link>
      </div>

      <div className="card">
        <h3>بحث يدوي</h3>
        {done && (
          <div className="receipt" style={{ marginBottom: 12 }}>
            <div className="muted">تم التسليم بنجاح</div>
            <div className="code">{done}</div>
          </div>
        )}
        <div className="field">
          <label>رقم الإيصال أو اللوحة</label>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="V-240871 أو 12-34567" />
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>اللوحة</th>
              <th>الإيصال</th>
              <th>الدخول</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {results.map((v) => (
              <tr key={v.id}>
                <td>{v.plate}</td>
                <td>{v.receiptNo}</td>
                <td>
                  {formatTime(v.checkInAt)}
                  <div className="muted">
                    {empName(v.checkInBy)} · {durationLabel(v.checkInAt)}
                  </div>
                </td>
                <td>
                  <button className="btn btn-primary" type="button" onClick={() => confirm(v.id, v.receiptNo)}>
                    تسليم
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!results.length && <div className="empty">لا نتائج</div>}
      </div>
    </div>
  );
}
