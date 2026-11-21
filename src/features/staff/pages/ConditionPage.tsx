import { useSearchParams } from 'react-router-dom';
import { useStore } from '@/store';
import { ConditionPanel } from '@/shared/components/visits/ConditionPanel';
import { FilterBar } from '@/shared/components/ui/filters';
import { searchField,statusField } from '@/shared/components/ui/filters/fields';
import { useFilters } from '@/shared/hooks/useFilters';
import { filterList } from '@/shared/hooks/filterList';
export default function ConditionPage(){
 const visits=useStore(s=>s.visits),[params,setParams]=useSearchParams();const id=params.get('visit')||'';
 const f=useFilters({status:'active'});
 const shown=filterList(visits,f.values,v=>({text:`${v.plate} ${v.receiptNo}`,status:v.checkOutAt?'delivered':'active',date:v.checkInAt}));
 return <><FilterBar fields={[searchField('اللوحة أو الإيصال'),statusField({active:'الحالية',delivered:'المسلّمة'})]} filters={f} count={shown.length} total={visits.length}/><div className="card stack"><h2>صور حالة السيارة</h2><select aria-label="الزيارة" value={id} onChange={e=>setParams(p=>{p.set('visit',e.target.value);return p;})}><option value="">اختر السيارة</option>{shown.map(v=><option key={v.id} value={v.id}>{v.plate} · {v.receiptNo}</option>)}</select>{id&&<ConditionPanel key={id} visitId={id} editable={!visits.find(v=>v.id===id)?.checkOutAt}/>}</div></>;
}
