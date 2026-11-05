import { Badge } from '../../components/Layout';
import { STATUS_LABELS, setOperatorStatus, useStore } from '../../store/useStore';

export default function Operators() {
  const operators = useStore((s) => s.operators);
  const employees = useStore((s) => s.employees);

  return (
    <div className="card">
      <h2>قائمة المشغّلين</h2>
      <table className="table">
        <thead>
          <tr>
            <th>المشغّل</th>
            <th>المنطقة</th>
            <th>المواقع</th>
            <th>الموظفون</th>
            <th>الترخيص</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {operators.map((o) => {
            const tone = o.status === 'approved' ? 'ok' : o.status === 'pending' ? 'warn' : 'bad';
            return (
              <tr key={o.id}>
                <td>{o.name}</td>
                <td>{o.area}</td>
                <td>{o.sites.length}</td>
                <td>{employees.filter((e) => e.operatorId === o.id).length}</td>
                <td><Badge tone={tone}>{STATUS_LABELS[o.status]}</Badge></td>
                <td className="row">
                  {o.status === 'approved' && (
                    <button className="btn btn-danger" type="button" onClick={() => setOperatorStatus(o.id, 'suspended')}>
                      تعليق
                    </button>
                  )}
                  {o.status === 'suspended' && (
                    <button className="btn btn-success" type="button" onClick={() => setOperatorStatus(o.id, 'approved')}>
                      إعادة تفعيل
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
