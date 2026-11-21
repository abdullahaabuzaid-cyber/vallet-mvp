import { Badge } from '@/shared/components/ui/Badge';
import { ackAlert, useStore } from '@/store';
import { formatDateTime } from '@/shared/lib/format';
import { FilterBar, type FilterField } from '@/shared/components/ui/filters';
import { kindField, searchField, sortField, statusField } from '@/shared/components/ui/filters/fields';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { StatCard } from '@/shared/components/ui/StatCard';
import { filterList } from '@/shared/hooks/filterList';
import { useFilters } from '@/shared/hooks/useFilters';

const SEV: Record<string, 'bad' | 'warn' | 'info'> = {
  high: 'bad',
  medium: 'warn',
  low: 'info',
};

const KIND_LABEL: Record<string, string> = {
  lot_full: 'الموقف ممتلئ', fraud_short: 'مدة قصيرة', fraud_long: 'مدة طويلة', fraud_unlogged: 'تسجيل/وردية', fraud_ocr: 'تعارض OCR', damage_flag: 'فحص حالة تجريبي',
  overstay: 'تجاوز مدة',
  exit_no_request: 'خروج بلا طلب',
  unlicensed_cluster: 'تجمّع غير مرخّص',
  complaints: 'تكرار شكاوى',
};

export default function AlertsPage() {
  const alerts = useStore((s) => s.alerts);
  const open = alerts.filter((a) => a.status === 'open');
  const high = open.filter((a) => a.severity === 'high').length;
  const med = open.filter((a) => a.severity === 'medium').length;
  const filters = useFilters();
  const fields: FilterField[] = [
    searchField('عنوان التنبيه أو تفاصيله'),
    statusField({ open: 'مفتوح', acknowledged: 'تمت المتابعة' }),
    kindField(KIND_LABEL),
    { type: 'select', key: 'severity', label: 'الخطورة', options: [{ value: 'high', label: 'حرجة' }, { value: 'medium', label: 'متوسطة' }, { value: 'low', label: 'منخفضة' }] },
    sortField,
  ];
  const list = filterList(alerts, filters.values, (a) => ({ text: `${a.title} ${a.detail || ''}`, status: a.status, kind: a.kind, severity: a.severity, date: a.firstSeen }));

  return (
    <div className="reg-page">
      <div className="stat-grid">
        <StatCard label="تنبيهات مفتوحة" value={open.length} icon="bell" />
        <StatCard label="حرجة" value={high} icon="shield" tone="amber" />
        <StatCard label="متوسطة" value={med} icon="clock" tone="violet" />
      </div>
      <FilterBar fields={fields} filters={filters} count={list.length} total={alerts.length} />
      <div className="card">
        <h2>تنبيهات ذكية</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          رصد تلقائي على الخادم: تجاوز مدة الوقوف، خروج بدون طلب مالك عبر التطبيق، تجمّعات بلاغات الفاليه غير المرخّص، وتكرار الشكاوى. التنبيه يُغلق تلقائياً لما تزول المشكلة.
        </p>
        {!list.length && <EmptyState icon="check" title={alerts.length ? 'لا نتائج مطابقة' : 'لا شذوذات حالياً — الوضع مستقر'} description={alerts.length ? 'غيّر الفلاتر أو امسحها.' : 'الرصد التلقائي يعمل على مدار الساعة.'} />}
        <div className="stack">
          {list.map((a) => (
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
