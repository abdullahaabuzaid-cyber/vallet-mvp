import { Router } from 'express';
import { inspectorRouter } from './modules/inspector/inspector.routes.ts';
import { integrationsRouter } from './modules/integrations/integrations.routes.ts';
import { heatmapGovRouter } from './modules/heatmap/heatmap.routes.ts';
import { pricingRouter } from './modules/pricing/pricing.routes.ts';
import { capacityRouter } from './modules/capacity/capacity.routes.ts';
import { shiftsRouter } from './modules/shifts/shifts.routes.ts';
import { contractsRouter } from './modules/contracts/contracts.routes.ts';
import { walletRouter } from './modules/wallet/wallet.routes.ts';
import { bookingsRouter } from './modules/bookings/bookings.routes.ts';
import { conditionRouter } from './modules/condition/condition.routes.ts';
import { arrivalRouter } from './modules/arrival/arrival.routes.ts';
import { publicReportsRouter } from './modules/publicReports/publicReports.routes.ts';
import { requireRole } from './middleware/auth.ts';
import { apiNotFound } from './middleware/errorHandler.ts';
import { alertsGovRouter } from './modules/alerts/alerts.routes.ts';
import { authRouter } from './modules/auth/auth.routes.ts';
import { complaintsGovRouter, complaintsRouter } from './modules/complaints/complaints.routes.ts';
import { demoGovRouter, demoRouter } from './modules/demo/demo.routes.ts';
import { documentsGovRouter, documentsRouter } from './modules/documents/documents.routes.ts';
import { handoffsRouter } from './modules/handoffs/handoffs.routes.ts';
import { incidentsGovRouter, incidentsRouter } from './modules/incidents/incidents.routes.ts';
import { licensesGovRouter, licensesRouter } from './modules/licenses/licenses.routes.ts';
import { operatorsGovRouter, operatorsRouter } from './modules/operators/operators.routes.ts';
import { paymentsGovRouter, paymentsRouter } from './modules/payments/payments.routes.ts';
import { ratingsRouter } from './modules/ratings/ratings.routes.ts';
import { realtimeRouter } from './modules/realtime/realtime.routes.ts';
import { reportsGovRouter } from './modules/reports/reports.routes.ts';
import { staffGovRouter, staffRouter } from './modules/staff/staff.routes.ts';
import { stateRouter } from './modules/state/state.routes.ts';
import { visitsRouter } from './modules/visits/visits.routes.ts';

/** Everything under /api. Each module guards its own routes by role. */
export const apiRouter = Router();
apiRouter.use(
  conditionRouter, arrivalRouter, publicReportsRouter, walletRouter, bookingsRouter,
  pricingRouter, capacityRouter, shiftsRouter, contractsRouter, inspectorRouter, integrationsRouter,
  demoRouter, stateRouter, realtimeRouter, authRouter,
  handoffsRouter, visitsRouter, ratingsRouter, complaintsRouter, incidentsRouter,
  operatorsRouter, staffRouter, documentsRouter, licensesRouter, paymentsRouter,
);

/** /api/gov/* — the whole tree is gov-only. */
const govRouter = Router();
govRouter.use(requireRole('gov'));
govRouter.use(
  operatorsGovRouter, licensesGovRouter, staffGovRouter, documentsGovRouter, incidentsGovRouter,
  paymentsGovRouter, complaintsGovRouter, alertsGovRouter, reportsGovRouter, demoGovRouter, heatmapGovRouter,
);
apiRouter.use('/gov', govRouter);

apiRouter.use(apiNotFound);
