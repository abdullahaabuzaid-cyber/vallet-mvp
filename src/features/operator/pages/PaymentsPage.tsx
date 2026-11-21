import { InvoiceList } from '@/shared/components/billing/InvoiceList';
import { StatCard } from '@/shared/components/ui/StatCard';
import { formatJod } from '@/shared/lib/format';
import { useStore } from '@/store';

export default function PaymentsPage() {
  const invoices = useStore((s) => s.invoices);
  const unpaid = invoices.filter((i) => i.status === 'unpaid');
  const paid = invoices.filter((i) => i.status === 'paid');
  return (
    <div className="reg-page">
      <div className="test-mode-banner">وضع تجريبي — الدفع عبر بوابة وهمية والمبالغ لأغراض العرض</div>
      <div className="stat-grid">
        <StatCard label={`مستحق (${unpaid.length})`} value={formatJod(unpaid.reduce((a, i) => a + i.amount, 0))} icon="wallet" tone="amber" />
        <StatCard label={`مدفوع (${paid.length})`} value={formatJod(paid.reduce((a, i) => a + i.amount, 0))} icon="check" tone="teal" />
        <StatCard label="إجمالي الفواتير" value={invoices.length} icon="file" />
      </div>
      <div className="card">
        <div className="section-head"><div><h2>الفواتير والدفع</h2><p>رسوم الترخيص السنوية، الغرامات، ورسوم الرقابة الصادرة من الهيئة.</p></div></div>
        <InvoiceList />
      </div>
    </div>
  );
}
