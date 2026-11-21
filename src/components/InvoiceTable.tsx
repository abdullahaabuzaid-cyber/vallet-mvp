import { useState } from 'react';
import { Badge } from './Layout';
import { PaymentModal } from './PaymentModal';
import { INVOICE_KIND_LABELS, formatDate, formatJod, operatorName } from '../store/useStore';
import type { Invoice } from '../types';

export function InvoiceTable({ invoices, canPay, showPayer }: { invoices: Invoice[]; canPay?: boolean; showPayer?: boolean }) {
  const [paying, setPaying] = useState<Invoice | null>(null);
  if (!invoices.length) return <div className="empty">لا فواتير</div>;
  return (
    <>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>الفاتورة</th>
              {showPayer && <th>الجهة</th>}
              <th>النوع</th>
              <th>المبلغ</th>
              <th>الإصدار</th>
              <th>الحالة</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((i) => (
              <tr key={i.id} data-testid="invoice-row">
                <td>
                  <strong dir="ltr">{i.number}</strong>
                  <div className="muted tiny">{i.description}</div>
                </td>
                {showPayer && <td>{i.operatorId ? operatorName(i.operatorId) : i.payerName || '—'}</td>}
                <td>{INVOICE_KIND_LABELS[i.kind]}</td>
                <td>{formatJod(i.amount)}</td>
                <td>{formatDate(i.issuedAt)}</td>
                <td>
                  {i.status === 'paid' ? <Badge tone="ok">مدفوعة</Badge> : <Badge tone="warn">غير مدفوعة</Badge>}
                  {i.paidAt && <div className="muted tiny">{formatDate(i.paidAt)}</div>}
                </td>
                <td className="row">
                  <a className="btn btn-sm" href={`/api/invoices/${i.id}/pdf`} target="_blank" rel="noreferrer">
                    PDF
                  </a>
                  {canPay && i.status === 'unpaid' && (
                    <button type="button" className="btn btn-sm btn-primary" onClick={() => setPaying(i)}>
                      ادفع الآن
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {paying && <PaymentModal invoice={paying} onClose={() => setPaying(null)} />}
    </>
  );
}
