import { useStore } from '../../store/useStore';

export default function GovSummary() {
  const operators = useStore((s) => s.operators);
  const visits = useStore((s) => s.visits);
  const incidents = useStore((s) => s.incidents);

  const licensed = operators.filter((o) => o.status === 'approved').length;
  const pending = operators.filter((o) => o.status === 'pending').length;
  const today = new Date().toDateString();
  const todayVisits = visits.filter((v) => new Date(v.checkInAt).toDateString() === today).length;
  const openInc = incidents.filter((i) => i.status === 'open' || i.status === 'investigating').length;
  const fines = incidents.filter((i) => i.status === 'fined').length;

  return (
    <>
      <div className="tiles">
        <div className="tile"><div className="n">{licensed}</div><div className="l">مشغّلون مرخّصون</div></div>
        <div className="tile"><div className="n">{pending}</div><div className="l">طلبات معلّقة</div></div>
        <div className="tile"><div className="n">{todayVisits.toLocaleString('ar-JO')}</div><div className="l">زيارات اليوم</div></div>
        <div className="tile"><div className="n">{openInc}</div><div className="l">بلاغات مفتوحة</div></div>
        <div className="tile"><div className="n">{fines}</div><div className="l">مخالفات هذا الأسبوع</div></div>
      </div>
      <div className="card">
        <h2>لوحة الملخص — عمّان</h2>
        <p className="muted">
          هيئة مستقلة لتنظيم سوق الفاليه في كامل عمّان. الفاليه غير المرخّص: غرامة + إغلاق ميداني.
          لا تطبيق للسائق في هذه المرحلة — إيصال برقم زيارة يكفي.
        </p>
      </div>
    </>
  );
}
