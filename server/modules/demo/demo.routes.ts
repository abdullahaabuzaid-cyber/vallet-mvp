import { Router } from 'express';
import { seed } from '../../db/seed/index.ts';
import { seedExpansion } from '../../db/seed/expansion.ts';
import { DEMO_ACCOUNTS, DEMO_DRIVERS } from '../../db/seed/demoAccounts.ts';
import { publish } from '../realtime/sse.ts';
import { sms } from '../sms/sms.service.ts';

export const demoRouter = Router();

demoRouter.get('/demo-accounts', (_req, res) => {
  res.json({
    accounts: DEMO_ACCOUNTS.map((a) => ({ role: a.role, username: a.username, password: a.password, label: a.label })),
    drivers: DEMO_DRIVERS,
    smsDevMode: sms.devMode,
  });
});

/** Mounted under /api/gov (gov-only). */
export const demoGovRouter = Router();

demoGovRouter.post('/reset-demo', async (_req, res) => {
  await seed(true);
  await seedExpansion();
  publish({ public: true }, { type: 'reset' });
  res.json({ ok: true });
});
