import { useState } from 'react';
import { api } from '@/shared/lib/api';
import { refresh } from '@/store';
import { toast } from '@/shared/lib/toast';
import type { Visit } from '@common/types';
export function ArrivalButtons({visit}:{visit:Visit}){
 const [eta,setEta]=useState('5');
 async function request(minutes:number){try{await api(`/api/visits/${visit.id}/arrival`,{minutes});await refresh();toast('تم إرسال وقت وصولك للفريق',{tone:'ok'});}catch(e){toast((e as Error).message,{tone:'bad'});}}
 return <div className="stack"><div className="row"><select aria-label="وقت الوصول" value={eta} onChange={e=>setEta(e.target.value)}>{[5,10,15,30].map(n=><option key={n} value={n}>{n} دقائق</option>)}</select><button className="btn btn-primary" onClick={()=>void request(Number(eta))}>أنا على بُعد {eta} دقائق</button></div>{visit.arrivalEta&&<span className="muted tiny">وصولك المتوقع: {new Date(visit.arrivalEta).toLocaleTimeString('ar-JO')} · {visit.readyAt?'جاهزة عند البوابة':visit.preparingAt?'جاري التجهيز':'بانتظار التحضير'}</span>}</div>;
}
export function PrepareButton({visit}:{visit:Visit}){
 if(!visit.returnRequestedAt||visit.preparingAt||visit.readyAt)return null;
 return <button className="btn btn-sm" onClick={async()=>{try{await api(`/api/visits/${visit.id}/prepare`,{});await refresh();}catch(e){toast((e as Error).message,{tone:'bad'});}}}>بدء التجهيز</button>;
}
