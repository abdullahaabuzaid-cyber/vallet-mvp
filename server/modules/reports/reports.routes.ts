import { taxCsv, taxReport, TAX_COLS } from './tax.service.ts';
import ExcelJS from 'exceljs';
import { Router } from 'express';
import { parseRange, reportData } from './reports.service.ts';
import { reportXlsx } from './reports.xlsx.ts';
import { reportPdf } from './reports.pdf.ts';

/** Mounted under /api/gov (gov-only). */
export const reportsGovRouter = Router();

const fileName = (ext: string) => `vallet-report-${new Date().toISOString().slice(0, 10)}.${ext}`;

reportsGovRouter.get('/reports', async (req, res) => {
  res.json(await reportData(parseRange(req.query.from, req.query.to)));
});

reportsGovRouter.get('/reports/export.xlsx', async (req, res) => {
  const buf = await reportXlsx(parseRange(req.query.from, req.query.to));
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName('xlsx')}"`);
  res.send(buf);
});

reportsGovRouter.get('/reports/export.pdf', async (req, res) => {
  const buf = await reportPdf(parseRange(req.query.from, req.query.to));
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName('pdf')}"`);
  res.send(buf);
});

/** Monthly tax / revenue report: JSON, CSV or XLSX. */
reportsGovRouter.get('/reports/tax', async (req, res) => {
  const d = await taxReport(String(req.query.period || ''));
  const fmt = String(req.query.format || 'json');
  if (fmt === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="vallet-tax-${d.period}.csv"`);
    return res.send(taxCsv(d));
  }
  if (fmt === 'xlsx') {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(`ضريبة ${d.period}`, { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] });
    ws.columns = TAX_COLS.map(([key, header]) => ({ key, header, width: 18 }));
    ws.getRow(1).font = { bold: true };
    d.items.forEach((x) => ws.addRow(x));
    ws.addRow({ name: 'الإجمالي', ...d.totals }).font = { bold: true };
    ws.addRow({ name: d.note });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="vallet-tax-${d.period}.xlsx"`);
    return res.send(Buffer.from(await wb.xlsx.writeBuffer()));
  }
  res.json(d);
});
