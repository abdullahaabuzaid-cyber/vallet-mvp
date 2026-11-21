import { q } from '../../db/pool.ts';
import { bad } from '../../utils/http.ts';
/** Legacy visits may have no photos; once evidence capture starts, both four-angle sets are mandatory. */
export async function requireCompleteEvidence(visitId:string){
 const rows=await q(`select stage,count(distinct angle)::int n from condition_photos where visit_id=$1 and angle in ('front','back','left','right') group by stage`,[visitId]);
 if(rows.length && (!rows.some(r=>r.stage==='pickup'&&r.n===4)||!rows.some(r=>r.stage==='handoff'&&r.n===4))) throw bad('أكمل أربع زوايا الاستلام وأربع زوايا التسليم أولاً');
}
