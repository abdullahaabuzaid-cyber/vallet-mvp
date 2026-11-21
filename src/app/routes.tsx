import InspectorPage from '@/features/inspector/pages/InspectorPage';
import GovIntegrationsPage from '@/features/gov/pages/IntegrationsPage';
import GovFieldFinesPage from '@/features/gov/pages/FieldFinesPage';
import OperatorInsightsPage from '@/features/operator/pages/InsightsPage';
import OperatorPricingPage from '@/features/operator/pages/PricingPage';
import OperatorShiftsPage from '@/features/operator/pages/ShiftsPage';
import OperatorContractsPage from '@/features/operator/pages/ContractsPage';
import WalletPage from '@/features/driver/pages/WalletPage';
import BookingPage from '@/features/driver/pages/BookingPage';
import OperatorBookingsPage from '@/features/operator/pages/BookingsPage';
import ConditionPage from '@/features/staff/pages/ConditionPage';
import PublicReportPage from '@/features/driver/pages/PublicReportPage';
import PublicReportsPage from '@/features/gov/pages/PublicReportsPage';
import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from '@/features/auth/pages/LoginPage';
import DriverAuthPage from '@/features/driver/pages/AuthPage';
import DriverHomePage from '@/features/driver/pages/HomePage';
import DriverStatusPage from '@/features/driver/pages/StatusPage';
import GovAlertsPage from '@/features/gov/pages/AlertsPage';
import GovAuditPage from '@/features/gov/pages/AuditPage';
import GovComplaintsPage from '@/features/gov/pages/ComplaintsPage';
import GovIncidentsPage from '@/features/gov/pages/IncidentsPage';
import GovLicenseReviewPage from '@/features/gov/pages/LicenseReviewPage';
import GovMapPage from '@/features/gov/pages/MapPage';
import GovOperatorsPage from '@/features/gov/pages/OperatorsPage';
import GovPaymentsPage from '@/features/gov/pages/PaymentsPage';
import GovReportsPage from '@/features/gov/pages/ReportsPage';
import GovSummaryPage from '@/features/gov/pages/SummaryPage';
import OperatorCarLogPage from '@/features/operator/pages/CarLogPage';
import OperatorDashboardPage from '@/features/operator/pages/DashboardPage';
import OperatorEmployeesPage from '@/features/operator/pages/EmployeesPage';
import OperatorFeedbackPage from '@/features/operator/pages/FeedbackPage';
import OperatorLicensePage from '@/features/operator/pages/LicensePage';
import OperatorPaymentsPage from '@/features/operator/pages/PaymentsPage';
import OperatorRequestsPage from '@/features/operator/pages/RequestsPage';
import StaffCarsPage from '@/features/staff/pages/CarsPage';
import StaffCheckInPage from '@/features/staff/pages/CheckInPage';
import StaffCheckOutPage from '@/features/staff/pages/CheckOutPage';
import StaffHomePage from '@/features/staff/pages/HomePage';
import StaffIncidentPage from '@/features/staff/pages/IncidentPage';
import StaffScanPage from '@/features/staff/pages/ScanPage';
import { Guard, type PortalRole } from './Guard';

type PortalRoute = { path: string; element: React.ReactNode };

/** Portal routes per role; each is wrapped in <Guard role=…>. */
const PORTAL: Record<PortalRole, PortalRoute[]> = {
  staff: [
    { path: '/staff/condition', element: <ConditionPage /> },
    { path: '/staff', element: <StaffHomePage /> },
    { path: '/staff/scan', element: <StaffScanPage /> },
    { path: '/staff/checkin', element: <StaffCheckInPage /> },
    { path: '/staff/checkout', element: <StaffCheckOutPage /> },
    { path: '/staff/cars', element: <StaffCarsPage /> },
    { path: '/staff/incident', element: <StaffIncidentPage /> },
  ],
  operator: [
    { path: '/operator', element: <OperatorDashboardPage /> },
    { path: '/operator/requests', element: <OperatorRequestsPage /> },
    { path: '/operator/bookings', element: <OperatorBookingsPage /> },
    { path: '/operator/pricing', element: <OperatorPricingPage /> },
    { path: '/operator/insights', element: <OperatorInsightsPage /> },
    { path: '/operator/shifts', element: <OperatorShiftsPage /> },
    { path: '/operator/contracts', element: <OperatorContractsPage /> },
    { path: '/operator/employees', element: <OperatorEmployeesPage /> },
    { path: '/operator/visits', element: <OperatorCarLogPage /> },
    { path: '/operator/license', element: <OperatorLicensePage /> },
    { path: '/operator/payments', element: <OperatorPaymentsPage /> },
    { path: '/operator/feedback', element: <OperatorFeedbackPage /> },
  ],
  inspector: [{ path: '/inspector', element: <InspectorPage /> }],
  gov: [
    { path: '/gov/public-reports', element: <PublicReportsPage /> },
    { path: '/gov/integrations', element: <GovIntegrationsPage /> },
    { path: '/gov/field-fines', element: <GovFieldFinesPage /> },
    { path: '/gov', element: <GovSummaryPage /> },
    { path: '/gov/licenses', element: <GovLicenseReviewPage /> },
    { path: '/gov/operators', element: <GovOperatorsPage /> },
    { path: '/gov/visits', element: <GovAuditPage /> },
    { path: '/gov/incidents', element: <GovIncidentsPage /> },
    { path: '/gov/alerts', element: <GovAlertsPage /> },
    { path: '/gov/map', element: <GovMapPage /> },
    { path: '/gov/complaints', element: <GovComplaintsPage /> },
    { path: '/gov/payments', element: <GovPaymentsPage /> },
    { path: '/gov/reports', element: <GovReportsPage /> },
  ],
};

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/driver" replace />} />
      <Route path="/login" element={<LoginPage />} />
      {(Object.keys(PORTAL) as PortalRole[]).flatMap((role) =>
        PORTAL[role].map((r) => <Route key={r.path} path={r.path} element={<Guard role={role}>{r.element}</Guard>} />)
      )}
      <Route path="/driver/wallet" element={<WalletPage />} />
      <Route path="/driver/book" element={<BookingPage />} />
      <Route path="/report" element={<PublicReportPage />} />
      <Route path="/driver" element={<DriverHomePage />} />
      <Route path="/driver/status" element={<DriverStatusPage />} />
      <Route path="/driver/auth" element={<DriverAuthPage />} />
      <Route path="*" element={<Navigate to="/driver" replace />} />
    </Routes>
  );
}
