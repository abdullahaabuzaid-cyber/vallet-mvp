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
