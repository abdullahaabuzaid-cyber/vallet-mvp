import { makeDoc, rtlLine, rtlTable } from '../../utils/pdf.ts';
import { reportData, type Range } from './reports.service.ts';
import { INCIDENT_STATUS, INCIDENT_TYPE, KIND_LABELS, OP_STATUS, day, fmt, paidLabel } from './format.ts';

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
  ], d.revenueByKind.map((x) => ({ kind: KIND_LABELS[x.kind] || x.kind, status: paidLabel(x.status), n: x.n, total: fmt(x.total) })), y) + 14;
  h('المخالفات حسب النوع والحالة');
  y = rtlTable(doc, [
    { key: 'type', label: 'النوع', width: 220 }, { key: 'status', label: 'الحالة', width: 160 }, { key: 'n', label: 'العدد', width: 80 },
  ], d.violationsByType.map((x) => ({ type: INCIDENT_TYPE[x.type] || x.type, status: INCIDENT_STATUS[x.status] || x.status, n: x.n })), y) + 14;
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
    ], d.fines.map((x) => ({ ...x, amount: fmt(x.amount), status: paidLabel(x.status), date: day(x.issued_at) })), y);
  }
  doc.end();
  return done;
}
