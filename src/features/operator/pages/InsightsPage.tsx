import { Link } from 'react-router-dom';
import { useStore } from '@/store';
import { useResource } from '@/shared/hooks/useResource';
import { useFilters, filterQuery } from '@/shared/hooks/useFilters';
import { FilterBar } from '@/shared/components/ui/filters';
import { searchField, kindField } from '@/shared/components/ui/filters/fields';
import { StatCard } from '@/shared/components/ui/StatCard';
import { Badge } from '@/shared/components/ui/Badge';
import { EmptyState } from '@/shared/components/ui/EmptyState';
type Hour={at:string;hour:number;expected:number;staff:number};
type Forecast={hours:Hour[];peak?:Hour;historyVisits:number;weight:number;dataQuality:string;method:string};
type Signal={id:string;kind:string;severity:string;title:string;detail:string;visitId?:string};
const KIND={fraud_short:'مدة قصيرة',fraud_long:'مدة طويلة',fraud_unlogged:'تسجيل وورديات',fraud_ocr:'تعارض OCR',damage_flag:'فرق في صور الحالة'};
export default function InsightsPage(){
  const filters=useFilters();
  const sites=useStore(s=>s.operators.flatMap(o=>o.sites));
  const forecast=useResource<Forecast>(`/api/ai/forecast?siteId=${encodeURIComponent(filters.values.siteId)}`,{hours:[],historyVisits:0,weight:0,dataQuality:'sparse',method:''});
  const fraud=useResource<{items:Signal[]}>(`/api/ai/fraud?${filterQuery(filters.values,200)}`,{items:[]});
  const d=forecast.data, peak=d.peak, max=Math.max(1,...d.hours.map(h=>h.expected));
  const high=fraud.data.items.filter(s=>s.severity==='high').length;
  return <>
    <div className="stat-grid"><StatCard label="الذروة المتوقعة" value={peak?`${peak.hour}:00`:'—'} detail={peak?`${peak.expected} سيارة متوقعة`:'الـ24 ساعة القادمة'} icon="chart"/><StatCard label="طاقم مقترح عند الذروة" value={peak?.staff??'—'} detail="6 سيارات لكل موظف/ساعة" icon="users" tone="teal"/><StatCard label="سجل التحليل" value={d.historyVisits} detail="زيارة في آخر 8 أسابيع" icon="car" tone="violet"/><StatCard label="إشارات عالية الخطورة" value={high} detail="قواعد تفسيرية — ليست حكماً" icon="shield" tone="amber"/></div>
    <FilterBar fields={[searchField('ابحث في إشارات المخاطر'),kindField(KIND),{type:'select',key:'siteId',label:'الموقف (للتنبؤ)',options:sites.map(s=>({value:s.id,label:s.name}))}]} filters={filters} count={fraud.data.items.length}/>
    {(forecast.error||fraud.error)&&<p role="alert">{forecast.error||fraud.error}</p>}
    <section className="card" data-testid="forecast"><div className="section-head"><div><h3>توقّع الطلب واقتراح الطاقم</h3><p>الـ24 ساعة القادمة · توقيت عمّان</p></div><Badge tone={d.dataQuality==='sparse'?'warn':'info'}>{d.dataQuality==='sparse'?'بيانات قليلة — خط أساس تجريبي':'تنبؤ إحصائي'}</Badge></div>
      <div className="forecast-chart" aria-label="توقع السيارات لكل ساعة">{d.hours.map((h,i)=><div className="forecast-col" key={h.at} title={`${h.hour}:00 — ${h.expected} سيارة — ${h.staff} موظف`}><strong>{h.expected}</strong><i style={{height:`${Math.max(3,h.expected/max*125)}px`}}/><span>{i%2===0?h.hour:''}</span></div>)}</div><p className="muted tiny">{d.method} الأرقام تقديرية وليست ضماناً، ويُراجعها المدير.</p>
      <details><summary>جدول الساعات والطاقم</summary><div className="table-wrap"><table className="table"><thead><tr><th>الوقت</th><th>السيارات المتوقعة</th><th>طاقم مقترح</th></tr></thead><tbody>{d.hours.map(h=><tr key={h.at}><td>{new Date(h.at).toLocaleString('ar-JO',{timeZone:'Asia/Amman',weekday:'short',hour:'2-digit',minute:'2-digit'})}</td><td>{h.expected}</td><td>{h.staff}</td></tr>)}</tbody></table></div></details>
    </section>
    <section className="card" data-testid="fraud-signals"><div className="section-head"><div><h3>إشارات الاحتيال والشذوذ</h3><p>مدة قصيرة/طويلة، استلام خارج وردية، قبول بلا إيصال، تعارض OCR، واختلاف صور الحالة. كل إشارة بحاجة لمراجعة بشرية.</p></div><Badge tone="info">قواعد حقيقية</Badge></div>
      {fraud.data.items.length?<div className="signal-list">{fraud.data.items.map(s=><article key={s.id} className="signal-item"><div className="row"><Badge tone={s.severity==='high'?'bad':s.severity==='medium'?'warn':'info'}>{KIND[s.kind as keyof typeof KIND]||s.kind}</Badge><strong>{s.title}</strong></div><p>{s.detail}</p>{s.visitId&&<Link className="btn btn-sm" to={`/operator/visits?q=${s.visitId}`}>عرض الزيارة</Link>}</article>)}</div>:<EmptyState icon="shield" title="لا إشارات مطابقة"/>}
    </section>
  </>;
}
