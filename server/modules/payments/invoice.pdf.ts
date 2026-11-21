import { makeDoc, rtlLine } from '../../utils/pdf.ts';
import { KIND_LABELS, day, fmt } from '../reports/format.ts';

export async function invoicePdf(inv: any, operatorName: string | null, payment: any | null): Promise<Buffer> {
  const doc = makeDoc({ size: 'A5', margin: 28 });
  const chunks: Buffer[] = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise<Buffer>((res) => doc.on('end', () => res(Buffer.concat(chunks))));
  const right = doc.page.width - 28;
  doc.rect(0, 0, doc.page.width, 70).fill('#0f2a4a');
  rtlLine(doc, 'فاتورة — هيئة تنظيم خدمات الفاليه', right, 16, { font: 'ar-bold', size: 15, color: '#ffffff' });
  rtlLine(doc, `رقم: ${inv.number}`, right, 42, { size: 10, color: '#cfe0f5' });
  let y = 90;
  const row = (k: string, v: string) => {
    rtlLine(doc, k, right, y, { size: 10, color: '#64748b', font: 'ar' });
    rtlLine(doc, v, right - 120, y, { size: 11, color: '#0f172a', font: 'ar-bold' });
    y += 24;
  };
  row('الجهة', operatorName || inv.payer_name || '—');
  row('النوع', KIND_LABELS[inv.kind] || inv.kind);
  row('الوصف', String(inv.description || '—').slice(0, 48));
  row('تاريخ الإصدار', day(inv.issued_at));
  if (inv.due_at) row('تاريخ الاستحقاق', day(inv.due_at));
  row('المبلغ', `${fmt(Number(inv.amount))} دينار أردني`);
  row('الحالة', inv.status === 'paid' ? 'مدفوعة' : 'غير مدفوعة');
  if (inv.paid_at) row('تاريخ الدفع', day(inv.paid_at));
  if (payment) row('مرجع الدفع', `${payment.ref} · بطاقة ****${payment.card_last4 || '----'}`);
  y += 10;
  doc.roundedRect(28, y, doc.page.width - 56, 40, 6).fill('#fff7ed');
  rtlLine(doc, 'وضع تجريبي: لم تتم أي عملية دفع حقيقية. المبالغ لأغراض العرض فقط.', right - 10, y + 13, { size: 9, color: '#9a3412' });
  doc.end();
  return done;
}
