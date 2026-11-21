import { Router } from 'express';
import fs from 'node:fs';
import { q1 } from '../../db/pool.ts';
import { requireRole } from '../../middleware/auth.ts';
import { upload } from '../../middleware/upload.ts';
import { bad, str } from '../../utils/http.ts';
import { notifyOperator } from '../realtime/notify.ts';
import { publish } from '../realtime/sse.ts';
import { documentFile, saveUpload } from './documents.service.ts';

export const documentsRouter = Router();

documentsRouter.post('/documents/upload', requireRole('operator'), upload.single('file'), async (req, res) => {
  if (!req.file) throw bad('ارفع ملف PDF أو صورة (حتى 10MB)');
  const opId = req.user!.operatorId!;
  const { docName, fileName } = await saveUpload(opId, {
    ownerType: str(req.body?.ownerType, 20),
    ownerId: str(req.body?.ownerId, 40),
    docKey: str(req.body?.docKey, 20),
    file: req.file,
  });
  publish({ gov: true, operatorId: opId }, { type: 'document_uploaded', title: 'مستند جديد للمراجعة', body: `${docName} — ${fileName}`, link: '/gov/licenses' });
  res.json({ ok: true });
});

documentsRouter.get('/documents/:dbId/file', requireRole('gov', 'operator'), async (req, res) => {
  const f = await documentFile(Number(req.params.dbId), req.user!);
  res.setHeader('Content-Type', f.mime || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(f.fileName || 'document')}`);
  res.setHeader('Cache-Control', 'private, no-store');
  fs.createReadStream(f.path).pipe(res);
});

/** Mounted under /api/gov (gov-only). */
export const documentsGovRouter = Router();

documentsGovRouter.post('/documents/:dbId/review', async (req, res) => {
  const status = str(req.body?.status, 20);
  if (!['accepted', 'rejected'].includes(status)) throw bad('حالة غير صالحة');
  const d = await q1(`update documents set status=$2, note=$3, reviewed_at=now(), reviewed_by=$4 where id=$1 returning *`, [
    Number(req.params.dbId), status, status === 'rejected' ? str(req.body?.note, 200) || 'مرفوض' : null, `user-${req.user!.id}`,
  ]);
  if (!d) throw bad('المستند غير موجود', 404);
  const opId = d.owner_type === 'operator' ? d.owner_id : (await q1(`select operator_id from employees where id=$1`, [d.owner_id]))?.operator_id;
  notifyOperator(opId, { type: 'document_reviewed', title: status === 'accepted' ? 'تم قبول مستند' : 'تم رفض مستند', body: d.name });
  res.json({ ok: true });
});
