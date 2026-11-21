import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiForm } from '@/shared/lib/api';
export default function PublicReportPage(){
 const [coord,setCoord]=useState<{lat:number;lng:number}|null>(null),[note,setNote]=useState(''),[file,setFile]=useState<File>(),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false);
 function locate(){setMsg('جاري تحديد الموقع…');navigator.geolocation.getCurrentPosition(p=>{setCoord({lat:p.coords.latitude,lng:p.coords.longitude});setMsg('تم تحديد موقعك الفعلي');},()=>setMsg('تعذّر تحديد الموقع. فعّل إذن الموقع وحاول مجدداً.'));}
 return <div className="phone-shell" dir="rtl"><div className="card stack"><Link className="btn" to="/driver">العودة للرئيسية</Link><h1>بلاغ فاليه غير مرخّص</h1><p className="muted">بدون تسجيل دخول. الصورة والموقع للهيئة فقط؛ لا ننشر بيانات المبلّغ.</p>
 <form className="stack" onSubmit={async e=>{e.preventDefault();if(!file||!coord)return;setBusy(true);const fd=new FormData();fd.set('file',file);fd.set('note',note);fd.set('lat',String(coord.lat));fd.set('lng',String(coord.lng));try{const r=await apiForm('/api/public-reports',fd);setMsg(`وصل بلاغك للهيئة #${r.id}`);setNote('');setFile(undefined);}catch(err){setMsg((err as Error).message);}finally{setBusy(false);}}}>
 <label>صورة الموقع<input aria-label="صورة البلاغ" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" required onChange={e=>setFile(e.target.files?.[0])}/></label><button type="button" className="btn" onClick={locate}>تحديد موقعي GPS</button>{coord&&<small dir="ltr">{coord.lat.toFixed(5)}, {coord.lng.toFixed(5)}</small>}<label>تفاصيل البلاغ<textarea aria-label="تفاصيل البلاغ" required minLength={5} value={note} onChange={e=>setNote(e.target.value)} placeholder="اسم الشارع، وصف الفاليه…"/></label><button className="btn btn-primary" disabled={!coord||!file||busy}>إرسال البلاغ للهيئة</button></form><p role="status">{msg}</p></div></div>;
}
