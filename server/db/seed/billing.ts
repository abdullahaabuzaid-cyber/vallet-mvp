import type { DbClient } from '../pool.ts';

/** Demo invoices, payments, ratings and complaints (illustrative amounts, JOD). */
export async function seedBillingAndFeedback(c: DbClient) {
  const days = (n: number) => new Date(Date.now() - n * 86400_000).toISOString();
  const inv = async (operatorId: string | null, payer: string | null, kind: string, desc: string, amount: number, status: string, issued: string, paid?: string, incidentId?: string) => {
    const n = await c.query(`select nextval('invoice_seq') as n`);
    const number = `INV-${new Date(issued).getFullYear()}-${n.rows[0].n}`;
    const r = await c.query(
      `insert into invoices (number, operator_id, payer_name, kind, description, amount, status, issued_at, due_at, paid_at, incident_id, payment_ref)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning id`,
      [number, operatorId, payer, kind, desc, amount, status, issued, new Date(new Date(issued).getTime() + 30 * 86400_000).toISOString(),
        paid ?? null, incidentId ?? null, paid ? `TEST-${n.rows[0].n}` : null]
    );
    if (paid) {
      await c.query(`insert into payments (invoice_id, ref, amount, status, card_last4, created_at, completed_at) values ($1,$2,$3,'succeeded','4242',$4,$4)`, [
        r.rows[0].id, `TEST-${n.rows[0].n}`, amount, paid,
      ]);
    }
  };
  await inv('op-1', null, 'license_fee', 'رسوم ترخيص سنوية — فاليه النخبة', 500, 'paid', days(60), days(58));
  await inv('op-5', null, 'license_fee', 'رسوم ترخيص سنوية — صفّني', 500, 'paid', days(40), days(39));
  await inv('op-3', null, 'fine', 'مخالفة: تأمين مسؤولية منتهي', 1000, 'unpaid', days(12));
  await inv(null, 'فاليه غير مرخّص — الدوار الثالث', 'fine', 'مخالفة تشغيل فاليه بدون ترخيص + إغلاق', 1500, 'paid', days(1), days(0.5), 'inc-2');
  await inv('op-1', null, 'visit_fee', 'رسوم رقابة على الزيارات — الشهر الماضي', 240.5, 'paid', days(20), days(18));
  await inv('op-5', null, 'visit_fee', 'رسوم رقابة على الزيارات — الشهر الماضي', 96.25, 'unpaid', days(20));
  await inv('op-1', null, 'visit_fee', 'رسوم رقابة على الزيارات — هذا الشهر', 118.75, 'unpaid', days(2));

  // Ratings / complaints
  await c.query(`insert into ratings (driver_phone, visit_id, operator_id, site_id, stars, comment, created_at) values
    ('0784445566','v7','op-1','site-2',5,'خدمة سريعة ومرتبة',now() - interval '2 hours'),
    ('0793332211','v6','op-1','site-1',4,'ممتاز بس تأخروا شوي',now() - interval '1.5 hours'),
    ('0798889900','v10','op-5','site-8',3,null,now() - interval '45 hours')`);
  await c.query(`insert into complaints (driver_phone, visit_id, operator_id, site_id, category, description, status, gov_response, created_at, updated_at) values
    ('0773030303','v12','op-1','site-2','delay','انتظرت 20 دقيقة لتسليم السيارة','investigating','تم التواصل مع المشغّل للتحقق',now() - interval '3 hours',now() - interval '2 hours'),
    ('0798889900','v10','op-5','site-8','damage','خدش جديد على الصدام الخلفي بعد الاستلام','open',null,now() - interval '40 hours',now() - interval '40 hours')`);
}
