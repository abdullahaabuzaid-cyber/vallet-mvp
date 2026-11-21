import fs from 'node:fs';
import path from 'node:path';
import { q, q1, tx } from '../../db/pool.ts';
import { env } from '../../config/env.ts';
import { bad, str } from '../../utils/http.ts';
import type { SessionUser } from '../auth/session.ts';
import { visitForUser } from '../visits/visits.service.ts';
import { publish } from '../realtime/sse.ts';
export const ANGLES = ['front','back','left','right','extra1','extra2'];
export async function photos(id: string, u: SessionUser) {
  await visitForUser(id,u);
  return { items: await q(`select id,visit_id,stage,angle,captured_at from condition_photos where visit_id=$1 order by stage,angle`,[id]),
    review: await q1(`select decision,note,complaint_id from condition_reviews where visit_id=$1`,[id]) };
}
export async function savePhoto(id: string, u: SessionUser, stage: string, angle: string, f?: Express.Multer.File) {
  try {
    const v = await visitForUser(id,u);
    if (v.check_out_at) throw bad('لا يمكن تغيير الأدلة بعد التسليم');
    if (!['pickup','handoff'].includes(stage) || !ANGLES.includes(angle) || !f?.mimetype.startsWith('image/')) throw bad('اختر المرحلة والزاوية وصورة');
    // Evidence is immutable once captured: no silent replacement.
    const r = await q1(`insert into condition_photos(visit_id,stage,angle,storage_key,mime,size,created_by)
      values($1,$2,$3,$4,$5,$6,$7) on conflict(visit_id,stage,angle) do nothing returning id`,[id,stage,angle,f.filename,f.mimetype,f.size,u.id]);
    if (!r) throw bad('هذه الزاوية موثّقة؛ استخدم صورة إضافية');
    publish({operatorId:v.operator_id,gov:true,driverPhone:v.owner_phone},{type:'condition_photo'});
    return r;
  } catch(e) { if(f) fs.rmSync(f.path,{force:true}); throw e; }
}
export async function photoFile(id: number,u: SessionUser) {
  const f=await q1(`select * from condition_photos where id=$1`,[id]);
  if(!f) throw bad('الصورة غير موجودة',404);
  await visitForUser(f.visit_id,u);
  return {path:path.join(env.uploadDir,f.storage_key),mime:f.mime};
}
export async function review(id:string,u:SessionUser,body:any) {
  const v=await visitForUser(id,u);
  if(!v.ready_at && !v.check_out_at) throw bad('التأكيد متاح عند جاهزية السيارة للتسليم');
  const decision=str(body?.decision,20),note=str(body?.note,2000);
  if(!['confirmed','disputed'].includes(decision)) throw bad('اختر تأكيد أو اعتراض');
  if(decision==='disputed' && note.length<5) throw bad('وضّح سبب الاعتراض');
  return tx(async c=>{
    await c.query(`select id from visits where id=$1 for update`,[id]);
    if((await c.query(`select 1 from condition_reviews where visit_id=$1`,[id])).rowCount) throw bad('تم حفظ قرارك مسبقاً');
    let complaintId=null;
    if(decision==='disputed') {
      complaintId=(await c.query(`insert into complaints(driver_user_id,driver_phone,visit_id,operator_id,site_id,category,description)
        values($1,$2,$3,$4,$5,'damage',$6) returning id`,[u.id,u.phone,id,v.operator_id,v.site_id,`اعتراض حالة السيارة — الصور محفوظة مع الزيارة: ${note}`])).rows[0].id;
    }
    await c.query(`insert into condition_reviews(visit_id,user_id,decision,note,complaint_id) values($1,$2,$3,$4,$5)`,[id,u.id,decision,note,complaintId]);
    await c.query(`update visits set condition_status=$2 where id=$1`,[id,decision]);
    return {ok:true,complaintId};
  }).then(r=>{publish({gov:true,operatorId:v.operator_id,driverPhone:v.owner_phone},{type:'condition_review',title:decision==='disputed'?'اعتراض على حالة السيارة':'تأكيد حالة السيارة'});return r;});
}
