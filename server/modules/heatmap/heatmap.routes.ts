import { Router } from 'express';
import { listParams } from '../../utils/listQuery.ts';
import { heatmap } from './heatmap.service.ts';
/** Mounted under /api/gov (gov-only). */
export const heatmapGovRouter = Router();
heatmapGovRouter.get('/heatmap', async (req, res) => {
  const p = listParams(req);
  res.json(await heatmap(String(req.query.layer || 'demand'), p.from, p.to));
});
