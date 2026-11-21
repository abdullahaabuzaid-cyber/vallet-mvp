import { useState } from 'react';
import { InvoiceTable } from '../../components/InvoiceTable';
import { formatJod, issueFine, useStore } from '../../store/useStore';

export default function GovPayments() {
  const invoices = useStore((s) => s.invoices);
  const operators = useStore((s) => s.operators);
  const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [open, setOpen] = useState(false);
  const [operatorId, setOperatorId] = useState('');
  const [payerName, setPayerName] = useState('');
  const [amount, setAmount] = useState(500);
  const [desc, setDesc] = useState('');

  const sum = (pred: (i: (typeof invoices)[number]) => boolean) => invoices.filter(pred).reduce((a, i) => a + i.amount, 0);
  const list = invoices.filter((i) => filter === 'all' || i.status === filter);

  return (
    <div className="reg-page">
      <div className="test-mode-banner">وضع تجريبي — المبالغ توضيحية والدفع عبر بوابة وهمية</div>
      <div className="tiles">
        <div className="tile"><div className="n">{formatJod(sum((i) => i.status === 'paid'))}</div><div className="l">إجمالي المحصّل</div></div>
        <div className="tile"><div className="n">{formatJod(sum((i) => i.status === 'paid' && i.kind === 'license_fee'))}</div><div className="l">رسوم ترخيص</div></div>
        <div className="tile"><div className="n">{formatJod(sum((i) => i.status === 'paid' && i.kind === 'fine'))}</div><div className="l">غرامات محصّلة</div></div>
        <div className="tile"><div className="n">{formatJod(sum((i) => i.status === 'unpaid'))}</div><div className="l">مستحقات</div></div>
      </div>
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0 }}>الفواتير والإيرادات</h2>
          <div className="row">
            <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} aria-label="تصفية">
              <option value="all">الكل</option>
              <option value="unpaid">غير مدفوعة</option>
              <option value="paid">مدفوعة</option>
            </select>
            <button type="button" className="btn btn-primary" onClick={() => setOpen(!open)}>
              {open ? 'إغلاق' : '+ إصدار غرامة'}
            </button>
          </div>
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
        <div style={{ marginTop: 12 }}>
          <InvoiceTable invoices={list} showPayer canPay />
        </div>
      </div>
    </div>
  );
}
