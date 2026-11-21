import { InvoiceTable } from '../../components/InvoiceTable';
import { formatJod, useStore } from '../../store/useStore';

export default function OperatorPayments() {
  const invoices = useStore((s) => s.invoices);
  const unpaid = invoices.filter((i) => i.status === 'unpaid');
  const paid = invoices.filter((i) => i.status === 'paid');
  return (
    <div className="reg-page">
      <div className="test-mode-banner">وضع تجريبي — الدفع عبر بوابة وهمية والمبالغ لأغراض العرض</div>
      <div className="tiles">
        <div className="tile"><div className="n">{formatJod(unpaid.reduce((a, i) => a + i.amount, 0))}</div><div className="l">مستحق ({unpaid.length})</div></div>
        <div className="tile"><div className="n">{formatJod(paid.reduce((a, i) => a + i.amount, 0))}</div><div className="l">مدفوع ({paid.length})</div></div>
      </div>
      <div className="card">
        <h2>الفواتير والدفع</h2>
        <p className="muted" style={{ marginTop: 0 }}>رسوم الترخيص السنوية، الغرامات، ورسوم الرقابة الصادرة من الهيئة.</p>
        <InvoiceTable invoices={invoices} canPay />
      </div>
    </div>
  );
}
