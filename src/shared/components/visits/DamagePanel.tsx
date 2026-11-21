import { useState } from 'react';
import { useResource } from '@/shared/hooks/useResource';
import { api } from '@/shared/lib/api';
import { toast } from '@/shared/lib/toast';
import { Badge } from '@/shared/components/ui/Badge';
type Result={provider:string;demo:boolean;label:string;score:number;flagged:boolean;angles:{angle:string;score:number;note:string}[];createdAt:string};
const ANG:Record<string,string>={front:'الأمام',back:'الخلف',left:'اليسار',right:'اليمين',extra1:'إضافية 1',extra2:'إضافية 2'};
export function DamagePanel({visitId,canRun}:{visitId:string;canRun:boolean}){
 const {data,reload}=useResource<{assessment:Result|null;threshold:number}>(`/api/visits/${visitId}/damage`,{assessment:null,threshold:.35});
 const [busy,setBusy]=useState(false), r=data.assessment;
 async function run(){setBusy(true);try{await api(`/api/visits/${visitId}/damage`,{});await reload();}catch(e){toast((e as Error).message,{tone:'bad'});}finally{setBusy(false);}}
 return <div className="damage-result" data-testid="damage-result"><div className="row"><h4>مقارنة صور الحالة</h4><Badge tone="warn">{r?.demo===false?'مزود رؤية':'تجريبي — ليس تشخيص ضرر'}</Badge></div><p className="muted tiny">مقارنة بصمة وحجم الصور لكل زاوية بين الاستلام والتسليم. اختلاف الإضاءة أو التصوير قد يرفع الدرجة. لا يكشف الخدوش، ولا يغني عن مراجعة الصور.</p>
 {r?<><strong className={r.flagged?'text-danger':''}>{r.flagged?'اختلاف ملحوظ — راجع الصور يدوياً':'لم يظهر اختلاف لافت'} · {Math.round(r.score*100)}%</strong><div className="damage-angles">{r.angles.map(a=><span key={a.angle} title={a.note}>{ANG[a.angle]||a.angle}: {Math.round(a.score*100)}%</span>)}</div></>:<p className="muted tiny">يبدأ التحليل تلقائياً عند توفر صورتين لنفس الزاوية؛ أو شغّله بعد رفع الصور.</p>}
 {canRun&&<button className="btn btn-sm" disabled={busy} onClick={()=>void run()}>{busy?'جارٍ التحليل…':'مقارنة صور الاستلام والتسليم'}</button>}</div>;
}
