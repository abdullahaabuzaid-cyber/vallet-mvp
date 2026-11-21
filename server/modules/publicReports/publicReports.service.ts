import fs from 'node:fs';
import path from 'node:path';
import { env } from '../../config/env.ts';
import { q,q1,tx } from '../../db/pool.ts';
import { bad,str } from '../../utils/http.ts';
import { Where,paged,type ListParams,orderBy } from '../../utils/listQuery.ts';
import { publish } from '../realtime/sse.ts';
const recent=new Map<string,number[]>();
export async function submitReport(ip:string,b:any,f?:Express.Multer.File,userId?:number) {
  try {
    const hits=(recent.get(ip)||[]).filter(t=>Date.now()-t<3600000);
    if(hits.length>=10) throw bad('وصلت الحد؛ حاول لاحقاً',429);
    const note=str(b?.note,2000),lat=Number(b?.lat),lng=Number(b?.lng);
    if(!b?.lat || !b?.lng || !Number.isFinite(lat)||!Number.isFinite(lng)||lat<29||lat>34||lng<34||lng>40) throw bad('حدّد موقعاً صحيحاً داخل الأردن');
    if(note.length<5 || !f?.mimetype.startsWith('image/')) throw bad('أضف صورة وتفاصيل البلاغ');
    const r=await q1(`insert into public_reports(note,lat,lng,storage_key,mime,reporter_id) values($1,$2,$3,$4,$5,$6) returning id`,[note,lat,lng,f.filename,f.mimetype,userId||null]);
    recent.set(ip,[...hits,Date.now()]);
    publish({gov:true},{type:'public_report',title:'بلاغ فاليه غير مرخّص',body:note,link:'/gov/public-reports'});return r;
  } catch(e) {if(f) fs.rmSync(f.path,{force:true});throw e;}
}
export async function listPublicReports(p:ListParams) {
  const w=new Where().search(p.q,['note','inspection_note','assigned_to']).range('created_at',p.from,p.to);
  if(p.status) w.add('status=?',p.status);
  if(p.employeeId) w.add('assigned_to=?',p.employeeId);
  const rows=await q(`select id,note,lat,lng,status,assigned_to,inspection_note,invoice_id,created_at,closed_at,count(*) over() as total_count
    from public_reports ${w.sql} order by ${orderBy(p.sort,{newest:'created_at desc',oldest:'created_at asc'})} limit ${w.next(p.limit)} offset ${w.next(p.offset)}`,w.params);
  return paged(rows,r=>r);
}
export async function reportFile(id:number) {
  const r=await q1(`select * from public_reports where id=$1`,[id]);if(!r) throw bad('غير موجود',404);
  return {path:path.join(env.uploadDir,r.storage_key),mime:r.mime};
}
export async function updateReport(id:number,b:any) {
  const status=str(b?.status,20),assigned=str(b?.assignedTo,100),note=str(b?.inspectionNote,2000);
  if(!['assigned','verified','closed','rejected'].includes(status)) throw bad('حالة غير صالحة');
  return tx(async c=>{
    const r=(await c.query(`select * from public_reports where id=$1 for update`,[id])).rows[0];
    if(!r) throw bad('البلاغ غير موجود',404);
    if(r.status==='closed'||r.status==='rejected') throw bad('البلاغ مغلق');
    if(status==='assigned'&&!assigned) throw bad('اكتب اسم المفتش');
    if(status==='verified'&&!note) throw bad('أدخل نتيجة المعاينة');
    let invoice=r.invoice_id;
    if(status==='closed') {
      if(r.status!=='verified') throw bad('تحقّق من البلاغ قبل المخالفة والإغلاق');
      const amount=Number(b?.amount||env.fineDefaultJod);
      if(!Number.isFinite(amount)||amount<=0||amount>100000) throw bad('قيمة غير صالحة');
      const n=(await c.query(`select nextval('invoice_seq') n`)).rows[0].n;
      invoice=(await c.query(`insert into invoices(number,payer_name,kind,description,amount,status,due_at)
        values($1,'فاليه غير مرخّص','fine',$2,$3,'unpaid',now()+interval '30 days') returning id`,[`INV-${new Date().getFullYear()}-${n}`,`بلاغ عام #${id} — مخالفة + أمر إغلاق`,amount])).rows[0].id;
    }
    return (await c.query(`update public_reports set status=$2,assigned_to=coalesce(nullif($3,''),assigned_to),inspection_note=coalesce(nullif($4,''),inspection_note),
      invoice_id=$5,closed_at=case when $2='closed' then now() else null end where id=$1 returning id,status,invoice_id`,[id,status,assigned,note,invoice])).rows[0];
  }).then(r=>{publish({gov:true},{type:'report_updated'});return r;});
}
