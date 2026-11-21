import { Router } from 'express';
import fs from 'node:fs';
import { requireRole } from '../../middleware/auth.ts';
import { upload } from '../../middleware/upload.ts';
import { str } from '../../utils/http.ts';
import { listParams } from '../../utils/listQuery.ts';
import { fineFile, inspectors, issueFieldFine, listFines, myTasks, verifyTask } from './inspector.service.ts';
export const inspectorRouter = Router();
inspectorRouter.get('/inspectors', requireRole('gov'), async (_req, res) => res.json({ items: await inspectors() }));
inspectorRouter.get('/inspector/tasks', requireRole('inspector'), async (req, res) => res.json({ items: await myTasks(req.user!) }));
inspectorRouter.post('/inspector/tasks/:id/verify', requireRole('inspector'), async (req, res) => res.json(await verifyTask(req.user!, Number(req.params.id), str(req.body?.note, 2000))));
inspectorRouter.post('/inspector/fines', requireRole('inspector'), upload.single('file'), async (req, res) => res.json(await issueFieldFine(req.user!, req.body, req.file)));
inspectorRouter.get('/field-fines', requireRole('gov', 'inspector'), async (req, res) => res.json(await listFines(req.user!, listParams(req))));
inspectorRouter.get('/field-fines/:id/file', requireRole('gov', 'inspector'), async (req, res) => {
  const f = await fineFile(req.user!, Number(req.params.id));
  res.setHeader('Cache-Control', 'private, no-store'); res.type(f.mime); fs.createReadStream(f.path).pipe(res);
});
inspectorRouter.get('/public-reports/:id/inspector-file', requireRole('inspector'), async (req, res) => {
  const { q1 } = await import('../../db/pool.ts');
  const r = await q1(`select storage_key, mime from public_reports where id=$1 and assigned_to=$2`, [Number(req.params.id), req.user!.username]);
  if (!r) return res.status(404).json({ error: 'غير موجود' });
  const { env } = await import('../../config/env.ts');
  res.setHeader('Cache-Control', 'private, no-store'); res.type(r.mime); fs.createReadStream(`${env.uploadDir}/${r.storage_key}`).pipe(res);
});
