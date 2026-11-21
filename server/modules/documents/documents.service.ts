import fs from 'node:fs';
import path from 'node:path';
import { OPERATOR_DOC_DEFS, STAFF_DOC_DEFS, type DocDef } from '../../../common/constants/documents.ts';
import { env } from '../../config/env.ts';
import { q, q1 } from '../../db/pool.ts';
import { bad } from '../../utils/http.ts';
import type { SessionUser } from '../auth/session.ts';

type UploadInput = { ownerType: string; ownerId: string; docKey: string; file: Express.Multer.File };

const filePath = (storageKey: string) => path.join(env.uploadDir, storageKey);

async function ownsEmployee(employeeId: string, operatorId: string | null | undefined) {
  return !!(await q1(`select 1 from employees where id=$1 and operator_id=$2`, [employeeId, operatorId]));
}

/** Store an uploaded document for the operator or one of its staff; replaces the previous file. */
export async function saveUpload(opId: string, { ownerType, ownerId, docKey, file: f }: UploadInput) {
  const ok = ownerType === 'operator' ? ownerId === opId : ownerType === 'employee' && (await ownsEmployee(ownerId, opId));
  if (!ok) {
    fs.rmSync(f.path, { force: true });
    throw bad('غير مصرّح', 403);
  }
  const defs: readonly DocDef[] = ownerType === 'operator' ? OPERATOR_DOC_DEFS : STAFF_DOC_DEFS;
  const def = defs.find((d) => d.id === docKey);
  if (!def) throw bad('نوع المستند غير صالح');
  const old = await q1(`select storage_key from documents where owner_type=$1 and owner_id=$2 and doc_key=$3`, [ownerType, ownerId, docKey]);
  const fileName = Buffer.from(f.originalname, 'latin1').toString('utf8').slice(0, 120);
  await q(
    `insert into documents (owner_type, owner_id, doc_key, name, status, file_name, storage_key, mime, size, uploaded_at)
     values ($1,$2,$3,$4,'uploaded',$5,$6,$7,$8, now())
     on conflict (owner_type, owner_id, doc_key) do update set status='uploaded', note=null, file_name=excluded.file_name,
       storage_key=excluded.storage_key, mime=excluded.mime, size=excluded.size, uploaded_at=now(), reviewed_at=null, reviewed_by=null`,
    [ownerType, ownerId, docKey, def.name, fileName, f.filename, f.mimetype, f.size]
  );
  if (old?.storage_key) fs.rmSync(filePath(old.storage_key), { force: true });
  if (ownerType === 'employee') await q(`update employees set review_status='pending' where id=$1 and review_status <> 'approved'`, [ownerId]);
  return { docName: def.name, fileName };
}

/** Resolve a document file the user may read (gov: any, operator: own + own staff). */
export async function documentFile(dbId: number, u: SessionUser) {
  const d = await q1(`select * from documents where id=$1`, [dbId]);
  if (!d || !d.storage_key) throw bad('لا يوجد ملف مرفوع لهذا المستند', 404);
  if (u.role === 'operator') {
    const mine = d.owner_type === 'operator' ? d.owner_id === u.operatorId : await ownsEmployee(d.owner_id, u.operatorId);
    if (!mine) throw bad('غير مصرّح', 403);
  }
  const p = filePath(d.storage_key);
  if (!fs.existsSync(p)) throw bad('الملف غير موجود على الخادم', 404);
  return { path: p, mime: d.mime as string | null, fileName: d.file_name as string | null };
}
