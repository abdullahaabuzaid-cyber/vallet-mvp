import { useStore,empName,markReady } from '@/store';
import { PrepareButton } from './ArrivalButtons';
export function ReturnQueue(){
 const visits=useStore(s=>s.visits.filter(v=>v.returnRequestedAt&&!v.checkOutAt));
 return <div className="card"><h3>طابور تجهيز السيارات · مباشر ({visits.length})</h3><div className="table-wrap"><table className="table"><thead><tr><th>السيارة</th><th>الموظف</th><th>الوصول المتوقع</th><th>الحالة</th><th>الإجراء</th></tr></thead><tbody>{visits.map(v=><tr key={v.id}><td>{v.plate}</td><td>{empName(v.checkInBy)}</td><td>{v.arrivalEta?new Date(v.arrivalEta).toLocaleTimeString('ar-JO'):'الآن'}</td><td>{v.readyAt?'جاهزة عند البوابة':v.preparingAt?'جاري التجهيز':'مطلوبة'}</td><td><PrepareButton visit={v}/>{!v.readyAt&&<button className="btn btn-sm" onClick={()=>void markReady(v.id)}>جاهزة عند البوابة</button>}</td></tr>)}</tbody></table></div></div>;
}
