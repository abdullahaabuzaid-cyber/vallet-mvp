import { q1 } from '../../db/pool.ts';
import { bad } from '../../utils/http.ts';
import { visitForUser } from '../visits/visits.service.ts';
import type { SessionUser } from '../auth/session.ts';
import { publish } from '../realtime/sse.ts';
export async function arrival(id:string,u:SessionUser,minutes:unknown) {
  const v=await visitForUser(id,u),n=Number(minutes);
  if(v.check_out_at) throw bad('السيارة سُلّمت');
  if(!Number.isInteger(n)||n<1||n>120) throw bad('وقت الوصول من 1 إلى 120 دقيقة');
  const r=await q1(`update visits set arrival_eta=now()+$2*interval '1 minute',return_requested_at=coalesce(return_requested_at,now()) where id=$1 returning *`,[id,n]);
  publish({operatorId:v.operator_id,gov:true,driverPhone:v.owner_phone},{type:'arrival_eta',title:`السائق على بُعد ${n} دقائق`,body:v.plate,link:'/staff/cars'});
  return r;
}
export async function prepare(id:string,u:SessionUser) {
  const v=await visitForUser(id,u);
  if(v.check_out_at || !v.return_requested_at || v.ready_at) throw bad('الطلب غير متاح للتحضير');
  const r=await q1(`update visits set preparing_at=coalesce(preparing_at,now()) where id=$1 returning *`,[id]);
  publish({operatorId:v.operator_id,driverPhone:v.owner_phone},{type:'preparing',title:'جاري تجهيز سيارتك',body:v.plate});
  return r;
}
