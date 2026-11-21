import { Badge } from '../../components/Layout';
import { ackAlert, formatDateTime, useStore } from '../../store/useStore';

const SEV: Record<string, 'bad' | 'warn' | 'info'> = {
  high: 'bad',
  medium: 'warn',
  low: 'info',
};

const KIND_LABEL: Record<string, string> = {
  overstay: 'تجاوز مدة',
  exit_no_request: 'خروج بلا طلب',
  unlicensed_cluster: 'تجمّع غير مرخّص',
  complaints: 'تكرار شكاوى',
};

export default function GovAlerts() {
  const alerts = useStore((s) => s.alerts);
  const open = alerts.filter((a) => a.status === 'open');
  const high = open.filter((a) => a.severity === 'high').length;
  const med = open.filter((a) => a.severity === 'medium').length;

  return (
    <div className="reg-page">
      <div className="tiles">
        <div className="tile">
          <div className="n">{open.length}</div>
          <div className="l">تنبيهات مفتوحة</div>
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
          رصد تلقائي على الخادم: تجاوز مدة الوقوف، خروج بدون طلب مالك عبر التطبيق، تجمّعات بلاغات الفاليه غير المرخّص، وتكرار الشكاوى. التنبيه يُغلق تلقائياً لما تزول المشكلة.
        </p>
        {!alerts.length && <div className="empty">لا شذوذات حالياً — الوضع مستقر</div>}
        <div className="stack">
          {alerts.map((a) => (
            <div key={a.id} className={`smart-alert sev-${a.severity} ${a.status === 'acknowledged' ? 'acked' : ''}`}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <strong>{a.title}</strong>
                <div className="row">
                  <Badge tone={SEV[a.severity]}>{KIND_LABEL[a.kind] || a.kind}</Badge>
                  {a.status === 'acknowledged' ? (
                    <Badge tone="ok">تمت المتابعة</Badge>
                  ) : (
                    <button type="button" className="btn btn-sm" onClick={() => void ackAlert(a.id)}>
                      تمت المتابعة
                    </button>
                  )}
                </div>
              </div>
              <div className="muted" style={{ marginTop: 6 }}>
                {a.detail}
              </div>
              {a.firstSeen && <div className="muted tiny">أول رصد: {formatDateTime(a.firstSeen)}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
