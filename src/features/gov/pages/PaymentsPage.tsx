import { useState } from 'react';
import { InvoiceList } from '@/shared/components/billing/InvoiceList';
import { StatCard } from '@/shared/components/ui/StatCard';
import { formatJod } from '@/shared/lib/format';
import { issueFine, useStore } from '@/store';

export default function PaymentsPage() {
  const invoices = useStore((s) => s.invoices);
  const operators = useStore((s) => s.operators);
  const [open, setOpen] = useState(false);
  const [operatorId, setOperatorId] = useState('');
  const [payerName, setPayerName] = useState('');
  const [amount, setAmount] = useState(500);
  const [desc, setDesc] = useState('');

  const sum = (pred: (i: (typeof invoices)[number]) => boolean) => invoices.filter(pred).reduce((a, i) => a + i.amount, 0);

  return (
    <div className="reg-page">
      <div className="test-mode-banner">وضع تجريبي — المبالغ توضيحية والدفع عبر بوابة وهمية</div>
      <div className="stat-grid">
        <StatCard label="إجمالي المحصّل" value={formatJod(sum((i) => i.status === 'paid'))} icon="wallet" tone="teal" />
        <StatCard label="رسوم ترخيص" value={formatJod(sum((i) => i.status === 'paid' && i.kind === 'license_fee'))} icon="file" />
        <StatCard label="غرامات محصّلة" value={formatJod(sum((i) => i.status === 'paid' && i.kind === 'fine'))} icon="shield" tone="violet" />
        <StatCard label="مستحقات" value={formatJod(sum((i) => i.status === 'unpaid'))} icon="clock" tone="amber" />
      </div>
      <div className="card">
        <div className="section-head">
          <h2>الفواتير والإيرادات</h2>
          <button type="button" className="btn btn-primary" onClick={() => setOpen(!open)}>
            {open ? 'إلغاء' : '+ إصدار غرامة'}
          </button>
        </div>
        {open && (
          <form
            className="card"
            style={{ background: 'var(--surface-2)', boxShadow: 'none', marginTop: 12 }}
            onSubmit={async (e) => {
              e.preventDefault();
              const r = await issueFine({ operatorId: operatorId || undefined, payerName: operatorId ? undefined : payerName, amount, description: desc });
              if (r) {
                setOpen(false);
                setDesc('');
              }
            }}
          >
            <div className="grid2">
              <div className="field">
                <label>المشغّل</label>
                <select value={operatorId} onChange={(e) => setOperatorId(e.target.value)}>
                  <option value="">جهة غير مسجّلة</option>
                  {operators.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
              {!operatorId && (
                <div className="field">
                  <label>اسم المخالف</label>
                  <input value={payerName} onChange={(e) => setPayerName(e.target.value)} required />
                </div>
              )}
              <div className="field">
                <label>المبلغ (دينار)</label>
                <input type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} required />
              </div>
              <div className="field">
                <label>الوصف</label>
                <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="سبب الغرامة" required />
              </div>
            </div>
            <button className="btn btn-danger" type="submit">إصدار الفاتورة</button>
          </form>
        )}
        <InvoiceList gov />
      </div>
    </div>
  );
}
