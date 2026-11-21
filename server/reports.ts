import ExcelJS from 'exceljs';
import { q } from './db.ts';
import { makeDoc, rtlLine, rtlTable } from './pdf.ts';

export const KIND_LABELS: Record<string, string> = {
  license_fee: 'رسوم ترخيص',
  fine: 'غرامة',
  visit_fee: 'رسوم رقابة على الزيارات',
};
export const INCIDENT_TYPE_LABELS: Record<string, string> = {
  damage: 'ضرر', lost_keys: 'فقدان مفاتيح', delay: 'تأخير', unlicensed: 'فاليه غير مرخّص', other: 'أخرى',
};
export const INCIDENT_STATUS_LABELS: Record<string, string> = {
  open: 'مفتوح', investigating: 'قيد التحقيق', closed: 'مغلق', fined: 'مخالفة + إغلاق',
};
const OP_STATUS: Record<string, string> = { pending: 'قيد المراجعة', approved: 'ساري', rejected: 'مرفوض', suspended: 'موقوف' };

export type Range = { from: string; to: string };

export function parseRange(fromRaw?: unknown, toRaw?: unknown): Range {
  const to = toRaw ? new Date(String(toRaw)) : new Date();
  const from = fromRaw ? new Date(String(fromRaw)) : new Date(to.getTime() - 90 * 86400_000);
  if (isNaN(+from) || isNaN(+to)) throw Object.assign(new Error('نطاق تاريخ غير صالح'), { status: 400 });
  // make "to" inclusive of the whole day
  const toEnd = new Date(to);
  if (toRaw && String(toRaw).length <= 10) toEnd.setUTCHours(23, 59, 59, 999);
  return { from: from.toISOString(), to: toEnd.toISOString() };
}

export async function reportData(r: Range) {
  const p = [r.from, r.to];
  const revenueByKind = await q(
    `select kind, status, count(*)::int as n, coalesce(sum(amount),0)::float as total
     from invoices where issued_at between $1 and $2 group by kind, status order by kind, status`, p);
  const monthly = await q(
    `select to_char(date_trunc('month', paid_at), 'YYYY-MM') as month, kind, sum(amount)::float as total
     from invoices where status='paid' and paid_at between $1 and $2 group by 1,2 order by 1`, p);
  const violationsByType = await q(
    `select type, status, count(*)::int as n from incidents where created_at between $1 and $2 group by type, status order by type`, p);
  const fines = await q(
    `select i.number, coalesce(o.name, i.payer_name, '—') as payer, i.description, i.amount::float as amount, i.status, i.issued_at
     from invoices i left join operators o on o.id = i.operator_id where i.kind='fine' and i.issued_at between $1 and $2 order by i.issued_at desc`, p);
  const operators = await q(
    `select o.id, o.name, o.status, o.license_no,
       (select count(*)::int from visits v where v.operator_id=o.id and v.check_in_at between $1 and $2) as visits,
       (select count(*)::int from visits v where v.operator_id=o.id and v.check_out_at between $1 and $2) as delivered,
       (select round(avg(extract(epoch from (v.check_out_at - v.check_in_at))/60)::numeric,0)::float from visits v
          where v.operator_id=o.id and v.check_out_at between $1 and $2) as avg_minutes,
       (select count(*)::int from handoffs h where h.operator_id=o.id and h.created_at between $1 and $2) as handoffs,
       (select count(*)::int from handoffs h where h.operator_id=o.id and h.status='accepted' and h.created_at between $1 and $2) as handoffs_accepted,
       (select round(extract(epoch from avg(h.accepted_at - h.created_at))::numeric/60,1)::float from handoffs h
          where h.operator_id=o.id and h.accepted_at is not null and h.created_at between $1 and $2) as avg_accept_min,
       (select round(avg(stars)::numeric,1)::float from ratings r where r.operator_id=o.id) as rating,
       (select count(*)::int from ratings r where r.operator_id=o.id) as rating_count,
       (select count(*)::int from complaints c where c.operator_id=o.id and c.created_at between $1 and $2) as complaints,
       (select count(*)::int from incidents i where i.operator_id=o.id and i.created_at between $1 and $2) as incidents,
       (select coalesce(sum(amount),0)::float from invoices i where i.operator_id=o.id and i.status='paid' and i.paid_at between $1 and $2) as paid,
       (select coalesce(sum(amount),0)::float from invoices i where i.operator_id=o.id and i.status='unpaid') as outstanding
     from operators o order by o.name`, p);
  const complaints = await q(
    `select status, count(*)::int as n from complaints where created_at between $1 and $2 group by status`, p);

  const sum = (rows: any[], pred: (x: any) => boolean) => rows.filter(pred).reduce((a, x) => a + Number(x.total), 0);
  const totals = {
    collected: sum(revenueByKind, (x) => x.status === 'paid'),
    outstanding: sum(revenueByKind, (x) => x.status === 'unpaid'),
    licenseFees: sum(revenueByKind, (x) => x.kind === 'license_fee' && x.status === 'paid'),
    fines: sum(revenueByKind, (x) => x.kind === 'fine' && x.status === 'paid'),
    visitFees: sum(revenueByKind, (x) => x.kind === 'visit_fee' && x.status === 'paid'),
    violations: violationsByType.reduce((a, x) => a + x.n, 0),
    unlicensed: violationsByType.filter((x) => x.type === 'unlicensed').reduce((a, x) => a + x.n, 0),
    visits: operators.reduce((a, o) => a + o.visits, 0),
    complaints: complaints.reduce((a, x) => a + x.n, 0),
  };
  return { range: r, totals, revenueByKind, monthly, violationsByType, fines, operators, complaints, generatedAt: new Date().toISOString() };
}

const fmt = (n: number) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const day = (s: string) => new Date(s).toISOString().slice(0, 10);

export async function reportXlsx(r: Range) {
  const d = await reportData(r);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Vallet — هيئة تنظيم الفاليه';
  const sheet = (name: string, cols: { header: string; key: string; width: number }[], rows: any[]) => {
    const ws = wb.addWorksheet(name, { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] });
    ws.columns = cols;
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F2A4A' } };
    rows.forEach((x) => ws.addRow(x));
    return ws;
  };
  sheet('الملخص', [{ header: 'البند', key: 'k', width: 34 }, { header: 'القيمة', key: 'v', width: 22 }], [
    { k: 'الفترة', v: `${day(d.range.from)} → ${day(d.range.to)}` },
    { k: 'الإيرادات المحصّلة (دينار)', v: d.totals.collected },
    { k: 'رسوم الترخيص المحصّلة', v: d.totals.licenseFees },
    { k: 'الغرامات المحصّلة', v: d.totals.fines },
    { k: 'رسوم الرقابة المحصّلة', v: d.totals.visitFees },
    { k: 'مستحقات غير مدفوعة', v: d.totals.outstanding },
    { k: 'عدد المخالفات/البلاغات', v: d.totals.violations },
    { k: 'بلاغات فاليه غير مرخّص', v: d.totals.unlicensed },
    { k: 'عدد الزيارات', v: d.totals.visits },
    { k: 'الشكاوى', v: d.totals.complaints },
    { k: 'ملاحظة', v: 'المبالغ تجريبية لأغراض العرض' },
  ]);
  sheet('الإيرادات', [
    { header: 'النوع', key: 'kind', width: 26 }, { header: 'الحالة', key: 'status', width: 14 },
    { header: 'عدد الفواتير', key: 'n', width: 14 }, { header: 'المجموع (دينار)', key: 'total', width: 18 },
  ], d.revenueByKind.map((x) => ({ kind: KIND_LABELS[x.kind] || x.kind, status: x.status === 'paid' ? 'مدفوعة' : 'غير مدفوعة', n: x.n, total: x.total })));
  sheet('المخالفات', [
    { header: 'النوع', key: 'type', width: 24 }, { header: 'الحالة', key: 'status', width: 18 }, { header: 'العدد', key: 'n', width: 10 },
  ], d.violationsByType.map((x) => ({ type: INCIDENT_TYPE_LABELS[x.type] || x.type, status: INCIDENT_STATUS_LABELS[x.status] || x.status, n: x.n })));
  sheet('الغرامات', [
    { header: 'رقم الفاتورة', key: 'number', width: 18 }, { header: 'المخالف', key: 'payer', width: 30 }, { header: 'الوصف', key: 'description', width: 40 },
    { header: 'المبلغ', key: 'amount', width: 12 }, { header: 'الحالة', key: 'status', width: 12 }, { header: 'التاريخ', key: 'date', width: 14 },
  ], d.fines.map((x) => ({ ...x, status: x.status === 'paid' ? 'مدفوعة' : 'غير مدفوعة', date: day(x.issued_at) })));
  sheet('أداء المشغّلين', [
    { header: 'المشغّل', key: 'name', width: 22 }, { header: 'الترخيص', key: 'status', width: 12 }, { header: 'الزيارات', key: 'visits', width: 10 },
    { header: 'مُسلّمة', key: 'delivered', width: 10 }, { header: 'متوسط المدة (د)', key: 'avg_minutes', width: 14 },
    { header: 'طلبات التسليم', key: 'handoffs', width: 12 }, { header: 'نسبة القبول %', key: 'acceptRate', width: 12 },
    { header: 'زمن القبول (د)', key: 'avg_accept_min', width: 12 }, { header: 'التقييم', key: 'rating', width: 10 },
    { header: 'الشكاوى', key: 'complaints', width: 10 }, { header: 'البلاغات', key: 'incidents', width: 10 },
    { header: 'مدفوع (دينار)', key: 'paid', width: 14 }, { header: 'مستحق (دينار)', key: 'outstanding', width: 14 },
  ], d.operators.map((o) => ({ ...o, status: OP_STATUS[o.status] || o.status, acceptRate: o.handoffs ? Math.round((o.handoffs_accepted / o.handoffs) * 100) : null })));
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function reportPdf(r: Range): Promise<Buffer> {
  const d = await reportData(r);
  const doc = makeDoc({ size: 'A4', layout: 'landscape', margin: 32 });
  const chunks: Buffer[] = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise<Buffer>((res) => doc.on('end', () => res(Buffer.concat(chunks))));
  const right = doc.page.width - 32;
  doc.rect(0, 0, doc.page.width, 64).fill('#0f2a4a');
  rtlLine(doc, 'فاليت — تقرير هيئة تنظيم الفاليه', right, 16, { font: 'ar-bold', size: 18, color: '#ffffff' });
  rtlLine(doc, `الفترة: ${day(d.range.from)} إلى ${day(d.range.to)} · أُنشئ ${day(d.generatedAt)} · المبالغ تجريبية`, right, 42, { size: 10, color: '#cfe0f5' });
  let y = 80;
  const kpis: [string, string][] = [
    ['الإيرادات المحصّلة', `${fmt(d.totals.collected)} د.أ`],
    ['مستحقات غير مدفوعة', `${fmt(d.totals.outstanding)} د.أ`],
    ['الغرامات المحصّلة', `${fmt(d.totals.fines)} د.أ`],
    ['المخالفات/البلاغات', String(d.totals.violations)],
    ['الزيارات', String(d.totals.visits)],
    ['الشكاوى', String(d.totals.complaints)],
  ];
  const boxW = (doc.page.width - 64 - 5 * 8) / 6;
  kpis.forEach(([k, v], i) => {
    const x = right - (i + 1) * boxW - i * 8;
    doc.roundedRect(x, y, boxW, 48, 6).fill('#eef3f9');
    rtlLine(doc, k, x + boxW - 8, y + 7, { size: 9, color: '#475569', font: 'ar' });
    rtlLine(doc, v, x + boxW - 8, y + 24, { size: 13, color: '#0f2a4a', font: 'ar-bold' });
  });
  y += 64;
  const h = (t: string) => {
    if (y > doc.page.height - 120) { doc.addPage(); y = 32; }
    rtlLine(doc, t, right, y, { font: 'ar-bold', size: 13, color: '#0f2a4a' });
    y += 22;
  };
  h('الإيرادات حسب النوع');
  y = rtlTable(doc, [
    { key: 'kind', label: 'النوع', width: 220 }, { key: 'status', label: 'الحالة', width: 120 },
    { key: 'n', label: 'عدد الفواتير', width: 100 }, { key: 'total', label: 'المجموع (د.أ)', width: 140 },
  ], d.revenueByKind.map((x) => ({ kind: KIND_LABELS[x.kind] || x.kind, status: x.status === 'paid' ? 'مدفوعة' : 'غير مدفوعة', n: x.n, total: fmt(x.total) })), y) + 14;
  h('المخالفات حسب النوع والحالة');
  y = rtlTable(doc, [
    { key: 'type', label: 'النوع', width: 220 }, { key: 'status', label: 'الحالة', width: 160 }, { key: 'n', label: 'العدد', width: 80 },
  ], d.violationsByType.map((x) => ({ type: INCIDENT_TYPE_LABELS[x.type] || x.type, status: INCIDENT_STATUS_LABELS[x.status] || x.status, n: x.n })), y) + 14;
  h('أداء المشغّلين');
  y = rtlTable(doc, [
    { key: 'name', label: 'المشغّل', width: 120 }, { key: 'status', label: 'الترخيص', width: 70 }, { key: 'visits', label: 'الزيارات', width: 60 },
    { key: 'delivered', label: 'مُسلّمة', width: 55 }, { key: 'avg', label: 'متوسط المدة', width: 75 }, { key: 'accept', label: 'نسبة القبول', width: 70 },
    { key: 'rating', label: 'التقييم', width: 60 }, { key: 'complaints', label: 'الشكاوى', width: 55 }, { key: 'incidents', label: 'البلاغات', width: 55 },
    { key: 'paid', label: 'مدفوع (د.أ)', width: 80 }, { key: 'outstanding', label: 'مستحق (د.أ)', width: 80 },
  ], d.operators.map((o) => ({
    name: o.name, status: OP_STATUS[o.status] || o.status, visits: o.visits, delivered: o.delivered,
    avg: o.avg_minutes != null ? `${o.avg_minutes} د` : '—', accept: o.handoffs ? `${Math.round((o.handoffs_accepted / o.handoffs) * 100)}%` : '—',
    rating: o.rating != null ? `${o.rating} / 5` : '—', complaints: o.complaints, incidents: o.incidents, paid: fmt(o.paid), outstanding: fmt(o.outstanding),
  })), y) + 14;
  if (d.fines.length) {
    h('الغرامات الصادرة');
    rtlTable(doc, [
      { key: 'number', label: 'رقم الفاتورة', width: 110 }, { key: 'payer', label: 'المخالف', width: 190 }, { key: 'description', label: 'الوصف', width: 260 },
      { key: 'amount', label: 'المبلغ (د.أ)', width: 90 }, { key: 'status', label: 'الحالة', width: 80 }, { key: 'date', label: 'التاريخ', width: 80 },
    ], d.fines.map((x) => ({ ...x, amount: fmt(x.amount), status: x.status === 'paid' ? 'مدفوعة' : 'غير مدفوعة', date: day(x.issued_at) })), y);
  }
  doc.end();
  return done;
}

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
