import { shots } from './shots.mjs';
/** Phase 3: pricing rules, live capacity, shifts + performance, B2B contracts + monthly invoicing. */
export async function phase3({ call, check, op, staff, B, browser, prefix }) {
  const rule = await call(op, '/pricing/rules', { name: 'اختبار ذروة', siteId: 'site-1', days: '0123456', startHour: 0, endHour: 24, fee: 9.75 });
  check('site quote uses most specific/highest rule', (await call(op, '/pricing/quote?siteId=site-1')).fee === 9.75);
  check('invalid rule rejected', (await op.request.post(B + '/api/pricing/rules', { data: { name: 'x', days: '1', startHour: 5, endHour: 5, fee: 1 } })).status() === 400);
  const v = (await call(staff, '/visits/checkin', { plate: '88-' + String(Date.now()).slice(-5) })).visit;
  check('check-in applies current price', v.fee === 9.75);
  const cap = (await call(staff, '/capacity')).items;
  check('live capacity counter (staff scoped)', cap.length > 0 && cap.every((l) => l.operatorId === 'op-1') && cap.find((l) => l.siteId === 'site-1').occupied >= 1);
  const start = new Date(Date.now() - 3600_000), end = new Date(Date.now() + 3600_000);
  const sh = await call(op, '/shifts', { employeeId: 'emp-1', startsAt: start.toISOString(), endsAt: end.toISOString() });
  check('overlapping shift rejected', (await op.request.post(B + '/api/shifts', { data: { employeeId: 'emp-1', startsAt: start.toISOString(), endsAt: end.toISOString() } })).status() === 400);
  const perf = (await call(op, '/staff-performance')).items.find((p) => p.id === 'emp-1');
  check('staff performance metrics', perf && perf.cars_in >= 1 && perf.shift_hours > 0 && perf.ratings >= 1);
  const k = await call(op, '/contracts', { venue: 'مطعم اختبار', venueType: 'restaurant', siteId: 'site-1', monthlyFee: 100, perVisitFee: 0.5 });
  const period = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Amman', year: 'numeric', month: '2-digit' }).format(new Date()).slice(0, 7);
  const inv = await call(op, `/contracts/${k.id}/invoice`, { period });
  check('monthly B2B invoice = fixed + per-car × visits', inv.visits >= 1 && Math.abs(inv.amount - (100 + 0.5 * inv.visits)) < 0.001);
  check('duplicate monthly invoice rejected', (await op.request.post(B + `/api/contracts/${k.id}/invoice`, { data: { period } })).status() === 400);
  await call(op, `/contract-invoices/${inv.id}/paid`, {});
  check('contracts are operator-private', (await staff.request.get(B + '/api/contracts')).status() === 403);
  await shots(browser, B, prefix, check, [
    { c: op, path: '/operator', name: 'operator-capacity' },
    { c: op, path: '/operator/pricing', name: 'operator-pricing' },
    { c: op, path: '/operator/shifts', name: 'operator-shifts' },
    { c: op, path: '/operator/contracts', name: 'operator-contracts' },
  ]);
  await call(op, `/pricing/rules/${rule.id}`, { delete: true });
  await call(op, `/shifts/${sh.id}/delete`, {});
  await call(op, `/contracts/${k.id}/end`, {});
  await call(staff, `/visits/${v.id}/checkout`, {});
  check('phase 3 test data cleaned up', true);
}
