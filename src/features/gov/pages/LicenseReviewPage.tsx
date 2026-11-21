import { useSearchParams } from 'react-router-dom';
import { StatCard } from '@/shared/components/ui/StatCard';
import { useStore } from '@/store';
import { OperatorApplications } from '../components/OperatorApplications';
import { StaffApplications } from '../components/StaffApplications';

/** Gov reviews operator licences and staff registrations (tab kept in the URL). */
export default function LicenseReviewPage() {
  const operators = useStore((s) => s.operators);
  const employees = useStore((s) => s.employees);
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'staff' ? 'staff' : 'ops';
  const pendingOps = operators.filter((o) => o.status === 'pending').length;
  const pendingStaff = employees.filter((e) => e.reviewStatus === 'pending').length;
  return (
    <div className="reg-page">
      <div className="stat-grid">
        <StatCard label="طلبات مشغّلين معلّقة" value={pendingOps} icon="file" tone="amber" />
        <StatCard label="مشغّلون مرخّصون" value={operators.filter((o) => o.status === 'approved').length} icon="shield" tone="teal" />
        <StatCard label="موظفون بانتظار الاعتماد" value={pendingStaff} icon="users" />
        <StatCard label="موظفون معتمدون" value={employees.filter((e) => e.reviewStatus === 'approved').length} icon="check" tone="violet" />
      </div>
      <div className="segmented tab-switch" role="tablist" aria-label="نوع الطلب">
        <button type="button" role="tab" aria-selected={tab === 'ops'} className={tab === 'ops' ? 'active' : ''} onClick={() => setParams({}, { replace: true })}>مشغّلون ({pendingOps})</button>
        <button type="button" role="tab" aria-selected={tab === 'staff'} className={tab === 'staff' ? 'active' : ''} onClick={() => setParams({ tab: 'staff' }, { replace: true })}>موظفون ({pendingStaff})</button>
      </div>
      {tab === 'ops' ? <OperatorApplications /> : <StaffApplications />}
    </div>
  );
}
