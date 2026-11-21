import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { api } from '@/shared/lib/api';
type Reply={reply:string;links:{to:string;label:string}[];provider:string;demo:boolean};
type Msg={text:string;mine?:boolean;links?:Reply['links']};
const SUGGESTIONS=['كيف أطلب سيارتي؟','كم السعر؟','لاحظت خدشاً في سيارتي','أريد حجز موقف','بلاغ فاليه غير مرخّص'];
export function HelpChat(){
 const [open,setOpen]=useState(false),[input,setInput]=useState(''),[busy,setBusy]=useState(false),[msgs,setMsgs]=useState<Msg[]>([]);
 async function send(text:string){if(!text.trim()||busy)return;setInput('');setBusy(true);setMsgs(m=>[...m.slice(-18),{text,mine:true}]);try{const r=await api<Reply>('/api/assistant',{message:text});setMsgs(m=>[...m,{text:r.reply,links:r.links}]);}catch(e){setMsgs(m=>[...m,{text:(e as Error).message}]);}finally{setBusy(false);}}
 return createPortal(<div className="help-chat"><button className="help-toggle" aria-expanded={open} aria-label={open?'إغلاق المساعد':'مساعد السائق'} onClick={()=>setOpen(!open)}>{open?'×':'؟'}{!open&&<span>مساعدة</span>}</button>{open&&<section className="help-window" aria-label="مساعد السائق" data-testid="help-chat"><header><strong>مساعد السائق</strong><small>أسئلة شائعة وقواعد — ليس نموذجاً لغوياً</small></header><div className="help-messages" aria-live="polite">{!msgs.length&&<p>أهلاً! كيف أقدر أساعدك؟ لا ترسل بيانات شخصية أو معلومات دفع هنا.</p>}{msgs.map((m,i)=><div className={`help-message ${m.mine?'mine':''}`} key={i}>{m.text}{m.links?.map(l=><Link key={l.to} to={l.to}>{l.label} ←</Link>)}</div>)}{busy&&<p>لحظة…</p>}</div><div className="help-suggestions">{SUGGESTIONS.slice(0,msgs.length?2:5).map(s=><button disabled={busy} key={s} onClick={()=>void send(s)}>{s}</button>)}</div><form onSubmit={e=>{e.preventDefault();void send(input);}}><input aria-label="سؤالك للمساعد" value={input} maxLength={500} onChange={e=>setInput(e.target.value)} placeholder="اكتب سؤالك…"/><button className="btn btn-primary" disabled={busy||!input.trim()}>إرسال</button></form></section>}</div>,document.body);
}
