import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Layout } from './components/Layout';
import { refresh, useStore } from './store/useStore';
import StaffHome from './pages/staff/Home';
import CheckIn from './pages/staff/CheckIn';
import CheckOut from './pages/staff/CheckOut';
import Cars from './pages/staff/Cars';
import IncidentForm from './pages/staff/Incident';
import StaffScan from './pages/staff/Scan';
import OperatorDashboard from './pages/operator/Dashboard';
import OperatorRequests from './pages/operator/Requests';
import Employees from './pages/operator/Employees';
import OperatorVisits from './pages/operator/Visits';
import License from './pages/operator/License';
import OperatorPayments from './pages/operator/Payments';
import OperatorFeedback from './pages/operator/Feedback';
import GovSummary from './pages/gov/Summary';
import Licenses from './pages/gov/Licenses';
import Operators from './pages/gov/Operators';
import GovVisits from './pages/gov/Visits';
import GovIncidents from './pages/gov/Incidents';
import GovMap from './pages/gov/Map';
import GovAlerts from './pages/gov/Alerts';
import GovComplaints from './pages/gov/Complaints';
import GovPayments from './pages/gov/Payments';
import GovReports from './pages/gov/Reports';
import DriverHome from './pages/driver/Home';
import DriverStatus from './pages/driver/Status';
import DriverAuth from './pages/driver/Auth';
import Login from './pages/Login';
import type { Role } from './types';

function Guard({ role, children }: { role: Exclude<Role, 'driver'>; children: React.ReactNode }) {
  const session = useStore((s) => s.session);
  const loc = useLocation();
  if (!session || session.role === 'driver') return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (session.role !== role) return <Navigate to={`/${session.role}`} replace />;
  return <>{children}</>;
}

export default function App() {
  const loaded = useStore((s) => s.loaded);

  useEffect(() => {
    void refresh();
  }, []);

  if (!loaded) {
    return (
      <div className="splash" aria-busy="true">
        <div className="brand-mark" aria-hidden>
          <span className="brand-mark-letter">ف</span>
        </div>
        <span className="muted">جارٍ التحميل…</span>
      </div>
    );
  }

  const g = (role: Exclude<Role, 'driver'>, el: React.ReactNode) => <Guard role={role}>{el}</Guard>;

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/driver" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/staff" element={g('staff', <StaffHome />)} />
        <Route path="/staff/scan" element={g('staff', <StaffScan />)} />
        <Route path="/staff/checkin" element={g('staff', <CheckIn />)} />
        <Route path="/staff/checkout" element={g('staff', <CheckOut />)} />
        <Route path="/staff/cars" element={g('staff', <Cars />)} />
        <Route path="/staff/incident" element={g('staff', <IncidentForm />)} />
        <Route path="/operator" element={g('operator', <OperatorDashboard />)} />
        <Route path="/operator/requests" element={g('operator', <OperatorRequests />)} />
        <Route path="/operator/employees" element={g('operator', <Employees />)} />
        <Route path="/operator/visits" element={g('operator', <OperatorVisits />)} />
        <Route path="/operator/license" element={g('operator', <License />)} />
        <Route path="/operator/payments" element={g('operator', <OperatorPayments />)} />
        <Route path="/operator/feedback" element={g('operator', <OperatorFeedback />)} />
        <Route path="/gov" element={g('gov', <GovSummary />)} />
        <Route path="/gov/licenses" element={g('gov', <Licenses />)} />
        <Route path="/gov/operators" element={g('gov', <Operators />)} />
        <Route path="/gov/visits" element={g('gov', <GovVisits />)} />
        <Route path="/gov/incidents" element={g('gov', <GovIncidents />)} />
        <Route path="/gov/alerts" element={g('gov', <GovAlerts />)} />
        <Route path="/gov/map" element={g('gov', <GovMap />)} />
        <Route path="/gov/complaints" element={g('gov', <GovComplaints />)} />
        <Route path="/gov/payments" element={g('gov', <GovPayments />)} />
        <Route path="/gov/reports" element={g('gov', <GovReports />)} />
        <Route path="/driver" element={<DriverHome />} />
        <Route path="/driver/status" element={<DriverStatus />} />
        <Route path="/driver/auth" element={<DriverAuth />} />
        <Route path="*" element={<Navigate to="/driver" replace />} />
      </Routes>
    </Layout>
  );
}
