import { Link } from 'react-router-dom';
import { Badge } from '@/shared/components/ui/Badge';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { StatCard } from '@/shared/components/ui/StatCard';
import { COMPLAINT_CATEGORY_LABELS, INCIDENT_TYPE_LABELS, LICENSE_STATUS_LABELS } from '@/shared/constants/labels';
import { formatDateTime } from '@/shared/lib/format';
import { operatorName, useStore } from '@/store';

const STATUS_ORDER = ['approved', 'pending', 'suspended', 'rejected'] as const;

/** Gov overview: KPIs, licence mix, and the queues that need attention. */
export default function SummaryPage() {
  const operators = useStore((s) => s.operators);
  const visits = useStore((s) => s.visits);
  const incidents = useStore((s) => s.incidents);
  const complaints = useStore((s) => s.complaints);
  const alerts = useStore((s) => s.alerts);

  const today = new Date().toDateString();
  const todayVisits = visits.filter((v) => new Date(v.checkInAt).toDateString() === today).length;
  const openInc = incidents.filter((i) => i.status === 'open' || i.status === 'investigating');
  const openComplaints = complaints.filter((c) => c.status === 'open' || c.status === 'investigating');
  const inside = visits.filter((v) => !v.checkOutAt).length;
  const queue = [
    ...openComplaints.map((c) => ({ id: `c${c.id}`, at: c.createdAt, title: COMPLAINT_CATEGORY_LABELS[c.category], who: c.operatorId ? operatorName(c.operatorId) : '—', tag: 'شكوى', to: '/gov/complaints' })),
    ...openInc.map((i) => ({ id: i.id, at: i.createdAt, title: INCIDENT_TYPE_LABELS[i.type], who: i.operatorId ? operatorName(i.operatorId) : i.area || 'ميداني', tag: 'بلاغ', to: '/gov/incidents' })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6);

  return (
    <>
      <div className="stat-grid">
        <StatCard label="مشغّلون مرخّصون" value={operators.filter((o) => o.status === 'approved').length} detail={`من أصل ${operators.length}`} icon="shield" tone="teal" />
        <StatCard label="طلبات ترخيص معلّقة" value={operators.filter((o) => o.status === 'pending').length} detail="بانتظار المراجعة" icon="file" tone="amber" />
        <StatCard label="زيارات اليوم" value={todayVisits.toLocaleString('ar-JO')} detail={`${inside} سيارة داخل المواقف الآن`} icon="car" />
        <StatCard label="بلاغات وشكاوى مفتوحة" value={openInc.length + openComplaints.length} detail={`${alerts.filter((a) => a.status === 'open').length} تنبيه ذكي مفتوح`} icon="bell" tone="violet" />
      </div>
      <div className="dash-grid">
        <div className="card">
          <div className="section-head"><div><h2>يحتاج متابعة</h2><p>أحدث الشكاوى والبلاغات المفتوحة</p></div><Link className="btn btn-sm" to="/gov/complaints">كل الشكاوى</Link></div>
          {!queue.length ? <EmptyState icon="check" title="لا شيء معلّق" description="كل الشكاوى والبلاغات تمت معالجتها." /> : (
            <div className="activity-list">
              {queue.map((q) => (
                <Link key={q.id} to={q.to} className="activity-item">
                  <Badge tone={q.tag === 'شكوى' ? 'warn' : 'bad'}>{q.tag}</Badge>
                  <div><strong>{q.title}</strong><span>{q.who}</span></div>
                  <time>{formatDateTime(q.at)}</time>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <div className="section-head"><div><h2>حالة التراخيص</h2><p>توزيع المشغّلين في عمّان</p></div><Link className="btn btn-sm" to="/gov/licenses">المراجعة</Link></div>
          <div className="bars">
            {STATUS_ORDER.map((st) => {
              const n = operators.filter((o) => o.status === st).length;
              return (
                <div key={st} className="bar-row">
                  <span>{LICENSE_STATUS_LABELS[st]}</span>
                  <span className="bar-track"><span className={`bar-fill fill-${st}`} style={{ width: `${operators.length ? (n / operators.length) * 100 : 0}%` }} /></span>
                  <span className="bar-val">{n}</span>
                </div>
              );
            })}
          </div>
          <p className="muted tiny" style={{ marginTop: 16 }}>الفاليه غير المرخّص: غرامة + إغلاق ميداني. كل زيارة موثّقة بإيصال.</p>
        </div>
      </div>
    </>
  );
}
