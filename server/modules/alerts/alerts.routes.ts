import { Router } from 'express';
import { q } from '../../db/pool.ts';

/** Mounted under /api/gov (gov-only). */
export const alertsGovRouter = Router();

alertsGovRouter.post('/alerts/:id/ack', async (req, res) => {
  await q(`update alerts set status='acknowledged', acked_at=now(), acked_by=$2 where id=$1`, [req.params.id, `user-${req.user!.id}`]);
  res.json({ ok: true });
});
