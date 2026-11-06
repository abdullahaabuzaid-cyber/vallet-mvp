import { Badge } from '../../components/Layout';
import { computeSmartAlerts, useStore } from '../../store/useStore';
import { useMemo } from 'react';

const SEV: Record<string, 'bad' | 'warn' | 'info'> = {
  high: 'bad',
  medium: 'warn',
  low: 'info',
};

const KIND_LABEL: Record<string, string> = {
  overstay: 'تجاوز مدة',
  exit_no_request: 'خروج بلا طلب',
  unlicensed_cluster: 'تجمّع غير مرخّص',
};

export default function GovAlerts() {
  // recompute when underlying data identity changes
  const visits = useStore((s) => s.visits);
  const incidents = useStore((s) => s.incidents);
  const alerts = useMemo(() => computeSmartAlerts(), [visits, incidents]);

  const high = alerts.filter((a) => a.severity === 'high').length;
  const med = alerts.filter((a) => a.severity === 'medium').length;

  return (
    <div className="reg-page">
      <div className="tiles">
        <div className="tile">
          <div className="n">{alerts.length}</div>
          <div className="l">تنبيهات نشطة</div>
        </div>
        <div className="tile">
          <div className="n">{high}</div>
          <div className="l">حرجة</div>
        </div>
        <div className="tile">
          <div className="n">{med}</div>
          <div className="l">متوسطة</div>
        </div>
      </div>

      <div className="card">
        <h2>تنبيهات ذكية</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          رصد تلقائي: تجاوز مدة الوقوف، خروج بدون طلب مالك عبر التطبيق، وتجمّعات بلاغات الفاليه غير المرخّص.
        </p>
        {!alerts.length && <div className="empty">لا شذوذات حالياً — الوضع مستقر</div>}
        <div className="stack">
          {alerts.map((a) => (
            <div key={a.id} className={`smart-alert sev-${a.severity}`}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <strong>{a.title}</strong>
                <Badge tone={SEV[a.severity]}>{KIND_LABEL[a.kind] || a.kind}</Badge>
              </div>
              <div className="muted" style={{ marginTop: 6 }}>
                {a.detail}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
