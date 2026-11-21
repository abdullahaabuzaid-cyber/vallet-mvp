import { useState } from 'react';
import { useStore } from '@/store';
import { useResource } from '@/shared/hooks/useResource';
import { api,apiForm } from '@/shared/lib/api';
import { toast } from '@/shared/lib/toast';
const ANGLES:Record<string,string>={front:'الأمام',back:'الخلف',left:'اليسار',right:'اليمين',extra1:'إضافية 1',extra2:'إضافية 2'};
type Photo={id:number;stage:string;angle:string;captured_at:string};
type Evidence={items:Photo[];review?:{decision:string;note:string;complaint_id:number}};
export function ConditionPanel({visitId,editable=false,canReview=false}:{visitId:string;editable?:boolean;canReview?:boolean}) {
  const {data,error,reload}=useResource<Evidence>(`/api/visits/${visitId}/condition`,{items:[]});
  const role=useStore(s=>s.session?.role);
  const [stage,setStage]=useState('pickup'),[angle,setAngle]=useState('front'),[note,setNote]=useState(''),[busy,setBusy]=useState(false);
  async function upload(f?:File){
    if(!f)return;setBusy(true);const fd=new FormData();fd.set('file',f);fd.set('stage',stage);fd.set('angle',angle);
    try{await apiForm(`/api/visits/${visitId}/condition`,fd);await reload();toast('تم توثيق الصورة ووقت التقاطها',{tone:'ok'});}catch(e){toast((e as Error).message,{tone:'bad'});}finally{setBusy(false);}
  }
  async function decide(decision:string){
    try{await api(`/api/visits/${visitId}/condition-review`,{decision,note});await reload();toast(decision==='disputed'?'تم فتح شكوى للهيئة مع صور الزيارة':'تم تأكيد حالة السيارة',{tone:'ok'});}catch(e){toast((e as Error).message,{tone:'bad'});}
  }
  return <section className="condition-panel" data-testid="condition-panel">
    <h3>توثيق حالة السيارة</h3><p className="muted tiny">أربع زوايا على الأقل عند الاستلام وعند التسليم. الأدلة محفوظة بوقت الخادم ولا يمكن استبدالها.</p>
    {error&&<p role="alert">{error}</p>}
    {['pickup','handoff'].map(s=><div key={s}><h4>{s==='pickup'?'عند الاستلام':'عند التسليم'} · {data.items.filter(p=>p.stage===s).length}/4 زوايا</h4>
      <div className="evidence-grid">{data.items.filter(p=>p.stage===s).map(p=><a href={`/api/condition-photos/${p.id}/file`} target="_blank" rel="noreferrer" key={p.id}><img src={`/api/condition-photos/${p.id}/file`} alt={`${s==='pickup'?'استلام':'تسليم'} — ${ANGLES[p.angle]}`}/><span>{ANGLES[p.angle]} · {new Date(p.captured_at).toLocaleString('ar-JO',{timeZone:'Asia/Amman'})}</span></a>)}</div>
      {!data.items.some(p=>p.stage===s)&&<p className="muted tiny">لم تُرفع صور بعد</p>}</div>)}
    {editable&&<div className="stack"><div className="row"><select aria-label="مرحلة التصوير" value={stage} onChange={e=>setStage(e.target.value)}><option value="pickup">الاستلام</option><option value="handoff">التسليم</option></select><select aria-label="زاوية التصوير" value={angle} onChange={e=>setAngle(e.target.value)}>{Object.entries(ANGLES).map(([k,v])=><option value={k} key={k}>{v}</option>)}</select></div>
      <input aria-label="صورة حالة السيارة" disabled={busy} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={e=>void upload(e.target.files?.[0])}/>
    </div>}
    {data.review?<p className="notice">{data.review.decision==='confirmed'?'السائق أكّد الحالة':'السائق اعترض — شكوى #'+data.review.complaint_id} {data.review.note}</p>:role==='driver'&&canReview&&<div className="stack"><input aria-label="تفاصيل اعتراض الحالة" value={note} onChange={e=>setNote(e.target.value)} placeholder="سبب الاعتراض (مطلوب للاعتراض)"/><div className="row"><button className="btn btn-success" onClick={()=>void decide('confirmed')}>أؤكد حالة السيارة</button><button className="btn" disabled={note.trim().length<5} onClick={()=>void decide('disputed')}>أعترض على الحالة</button></div></div>}
  </section>;
}
