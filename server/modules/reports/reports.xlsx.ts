import ExcelJS from 'exceljs';
import { reportData, type Range } from './reports.service.ts';
import { INCIDENT_STATUS, INCIDENT_TYPE, KIND_LABELS, OP_STATUS, day, paidLabel } from './format.ts';

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
  ], d.revenueByKind.map((x) => ({ kind: KIND_LABELS[x.kind] || x.kind, status: paidLabel(x.status), n: x.n, total: x.total })));
  sheet('المخالفات', [
    { header: 'النوع', key: 'type', width: 24 }, { header: 'الحالة', key: 'status', width: 18 }, { header: 'العدد', key: 'n', width: 10 },
  ], d.violationsByType.map((x) => ({ type: INCIDENT_TYPE[x.type] || x.type, status: INCIDENT_STATUS[x.status] || x.status, n: x.n })));
  sheet('الغرامات', [
    { header: 'رقم الفاتورة', key: 'number', width: 18 }, { header: 'المخالف', key: 'payer', width: 30 }, { header: 'الوصف', key: 'description', width: 40 },
    { header: 'المبلغ', key: 'amount', width: 12 }, { header: 'الحالة', key: 'status', width: 12 }, { header: 'التاريخ', key: 'date', width: 14 },
  ], d.fines.map((x) => ({ ...x, status: paidLabel(x.status), date: day(x.issued_at) })));
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
