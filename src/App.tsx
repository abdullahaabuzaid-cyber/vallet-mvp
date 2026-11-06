import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Layout } from './components/Layout';
import { useStore } from './store/useStore';
import StaffHome from './pages/staff/Home';
import CheckIn from './pages/staff/CheckIn';
import CheckOut from './pages/staff/CheckOut';
import Cars from './pages/staff/Cars';
import IncidentForm from './pages/staff/Incident';
import OperatorDashboard from './pages/operator/Dashboard';
import OperatorRequests from './pages/operator/Requests';
import Employees from './pages/operator/Employees';
import OperatorVisits from './pages/operator/Visits';
import License from './pages/operator/License';
import GovSummary from './pages/gov/Summary';
import Licenses from './pages/gov/Licenses';
import Operators from './pages/gov/Operators';
import GovVisits from './pages/gov/Visits';
import GovIncidents from './pages/gov/Incidents';
import GovMap from './pages/gov/Map';
import DriverHome from './pages/driver/Home';
import DriverStatus from './pages/driver/Status';

function rolePrefix(role: string) {
  if (role === 'gov') return '/gov';
  if (role === 'operator') return '/operator';
  if (role === 'driver') return '/driver';
  return '/staff';
}

function RoleRedirect() {
  const role = useStore((s) => s.role);
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    const prefix = rolePrefix(role);
    if (!loc.pathname.startsWith(prefix)) {
      nav(prefix);
    }
  }, [role, nav, loc.pathname]);

  return null;
}

export default function App() {
  return (
    <Layout>
      <RoleRedirect />
      <Routes>
        <Route path="/" element={<Navigate to="/staff" replace />} />
        <Route path="/staff" element={<StaffHome />} />
        <Route path="/staff/checkin" element={<CheckIn />} />
        <Route path="/staff/checkout" element={<CheckOut />} />
        <Route path="/staff/cars" element={<Cars />} />
        <Route path="/staff/incident" element={<IncidentForm />} />
        <Route path="/operator" element={<OperatorDashboard />} />
        <Route path="/operator/requests" element={<OperatorRequests />} />
        <Route path="/operator/employees" element={<Employees />} />
        <Route path="/operator/visits" element={<OperatorVisits />} />
        <Route path="/operator/license" element={<License />} />
        <Route path="/gov" element={<GovSummary />} />
        <Route path="/gov/licenses" element={<Licenses />} />
        <Route path="/gov/operators" element={<Operators />} />
        <Route path="/gov/visits" element={<GovVisits />} />
        <Route path="/gov/incidents" element={<GovIncidents />} />
        <Route path="/gov/map" element={<GovMap />} />
        <Route path="/driver" element={<DriverHome />} />
        <Route path="/driver/status" element={<DriverStatus />} />
        <Route path="*" element={<Navigate to="/staff" replace />} />
      </Routes>
    </Layout>
  );
}
