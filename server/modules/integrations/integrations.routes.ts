import { Router } from 'express';
import { requireRole } from '../../middleware/auth.ts';
import { str } from '../../utils/http.ts';
import { integrationsStatus, municipalityPermit, vehicleLookup } from './integrations.service.ts';
export const integrationsRouter = Router();
integrationsRouter.use('/integrations', requireRole('gov', 'inspector'));
integrationsRouter.get('/integrations/status', (_req, res) => res.json({ items: integrationsStatus() }));
integrationsRouter.get('/integrations/vehicle', async (req, res) => res.json(await vehicleLookup(str(req.query.plate, 20))));
integrationsRouter.get('/integrations/municipality', async (req, res) => res.json(await municipalityPermit(str(req.query.siteId, 40))));
