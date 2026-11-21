import { useState } from 'react';
import { FilterBar } from '@/shared/components/ui/filters';
import { dateField,searchField,statusField,sortField } from '@/shared/components/ui/filters/fields';
import { useFilters,filterQuery } from '@/shared/hooks/useFilters';
import { useServerList } from '@/shared/hooks/useServerList';
import { useStore,refresh } from '@/store';
import { LotsMap } from '@/shared/components/map/LotsMap';
import { api } from '@/shared/lib/api';
import { toast } from '@/shared/lib/toast';
const STATUS={new:'جديد',assigned:'مُسند لمفتش',verified:'تم التحقق',closed:'مخالفة + إغلاق',rejected:'مرفوض'};
export default function PublicReportsPage(){
 const filters=useFilters(),version=useStore(s=>s.visits);
 const {items,total}=useServerList<any>('/api/public-reports',filterQuery(filters.values,200),version);
 const [assigned,setAssigned]=useState(''),[note,setNote]=useState('');
 async function change(id:number,status:string){try{await api(`/api/public-reports/${id}/status`,{status,assignedTo:assigned,inspectionNote:note});await refresh();toast('تم تحديث البلاغ',{tone:'ok'});}catch(e){toast((e as Error).message,{tone:'bad'});}}
 return <><FilterBar filters={filters} fields={[searchField('التفاصيل أو اسم المفتش'),statusField(STATUS),dateField,sortField]} count={items.length} total={total}/>
 <div className="card map-card"><LotsMap mode="gov" lots={[]} unlicensed={items.map(r=>({id:String(r.id),area:'بلاغ عام',description:r.note,lat:r.lat,lng:r.lng,statusLabel:STATUS[r.status as keyof typeof STATUS]}))}/></div>
 <div className="card"><h3>إسناد ومعاينة</h3><div className="row"><input aria-label="اسم المفتش" value={assigned} onChange={e=>setAssigned(e.target.value)} placeholder="اسم المفتش / رقمه"/><input aria-label="نتيجة المعاينة" value={note} onChange={e=>setNote(e.target.value)} placeholder="نتيجة المعاينة"/></div></div>
 <div className="report-grid">{items.map(r=><article className="card stack" data-testid="public-report" key={r.id}><a href={`/api/public-reports/${r.id}/file`} target="_blank" rel="noreferrer"><img className="report-photo" src={`/api/public-reports/${r.id}/file`} alt="دليل البلاغ"/></a><h3>بلاغ #{r.id} · {STATUS[r.status as keyof typeof STATUS]}</h3><p>{r.note}</p><small>{r.assigned_to} · {r.inspection_note}</small><div className="row">{!['closed','rejected'].includes(r.status)&&<><button className="btn btn-sm" onClick={()=>void change(r.id,'assigned')}>إسناد تفتيش</button><button className="btn btn-sm" onClick={()=>void change(r.id,'verified')}>تم التحقق</button><button className="btn btn-sm" disabled={r.status!=='verified'} onClick={()=>void change(r.id,'closed')}>مخالفة + أمر إغلاق</button><button className="btn btn-sm" onClick={()=>void change(r.id,'rejected')}>رفض</button></>}</div>{r.invoice_id&&<span>فاتورة المخالفة #{r.invoice_id} · أمر إغلاق مسجّل؛ التنفيذ ميداني</span>}</article>)}</div></>;
}
