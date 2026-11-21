import { Router } from 'express';
import { q1 } from '../../db/pool.ts';
import { mapInvoice } from '../../db/mappers.ts';
import { requireRole } from '../../middleware/auth.ts';
import { bad, str } from '../../utils/http.ts';
import { publish } from '../realtime/sse.ts';
import { invoicePdf } from './invoice.pdf.ts';
import { invoiceForUser, issueInvoice } from './invoices.service.ts';
import { confirmPayment, startCheckout } from './payments.service.ts';
import { listParams } from '../../utils/listQuery.ts';
import { listInvoices } from './invoices.list.ts';

export const paymentsRouter = Router();

/** Invoices list with filters (gov: all; operator: own). */
paymentsRouter.get('/invoices', requireRole('operator', 'gov'), async (req, res) => {
  res.json(await listInvoices(req.user!, listParams(req)));
});

paymentsRouter.post('/invoices/:id/checkout', requireRole('operator', 'gov'), async (req, res) => {
  const { inv, ref } = await startCheckout(Number(req.params.id), req.user!);
  res.json({ ref, amount: Number(inv.amount), currency: 'JOD', testMode: true, invoice: mapInvoice(inv) });
});

paymentsRouter.post('/payments/:ref/confirm', requireRole('operator', 'gov'), async (req, res) => {
  const ref = await confirmPayment(String(req.params.ref), req.user!, req.body);
  res.json({ ok: true, ref });
});

paymentsRouter.get('/invoices/:id/pdf', requireRole('operator', 'gov'), async (req, res) => {
  const inv = await invoiceForUser(Number(req.params.id), req.user!);
  const op = inv.operator_id ? await q1(`select name from operators where id=$1`, [inv.operator_id]) : null;
  const pay = await q1(`select * from payments where invoice_id=$1 and status='succeeded' order by id desc limit 1`, [inv.id]);
  const buf = await invoicePdf(inv, op?.name ?? null, pay ?? null);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${inv.number}.pdf"`);
  res.send(buf);
});

/** Mounted under /api/gov (gov-only). */
export const paymentsGovRouter = Router();

paymentsGovRouter.post('/fines', async (req, res) => {
  const amount = Number(req.body?.amount);
  if (!(amount > 0)) throw bad('أدخل مبلغ الغرامة');
  const operatorId = str(req.body?.operatorId, 40) || null;
  const payer = str(req.body?.payerName, 120) || null;
  if (!operatorId && !payer) throw bad('حدّد المشغّل أو اسم المخالف');
  const inv = await issueInvoice(operatorId, payer, 'fine', str(req.body?.description, 200) || 'غرامة مخالفة', amount);
  publish({ gov: true }, { type: 'invoice_new' });
  res.json({ invoice: mapInvoice(inv) });
});
