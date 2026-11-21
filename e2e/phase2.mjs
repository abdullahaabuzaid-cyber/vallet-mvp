import { shots } from './shots.mjs';
/** Phase 2: wallet + subscription, pre-booking, e-tip + staff rating. */
export async function phase2({ call, check, op, staff, drv, B, browser, prefix }) {
  const card = { cardNumber: '4242 4242 4242 4242', expiry: '12/30', cvc: '123' };
  await call(drv, '/wallet/topup', { amount: 10, ...card });
  check('wallet top-up (mock card)', (await call(drv, '/wallet')).balance === 10);
  const declined = await drv.request.post(B + '/api/wallet/topup', { data: { amount: 5, ...card, cardNumber: '4000 0000 0000 0002' } });
  check('declined test card rejected', declined.status() === 402);
  check('subscription blocked on low balance', (await drv.request.post(B + '/api/wallet/subscribe', { data: { plan: 'basic' } })).status() === 400);
  await call(drv, '/wallet/topup', { amount: 20, ...card });
  await call(drv, '/wallet/subscribe', { plan: 'basic' });
  const w = await call(drv, '/wallet');
  check('monthly subscription debits wallet', w.subscription?.plan === 'basic' && w.balance === 15);
  check('double subscription rejected', (await drv.request.post(B + '/api/wallet/subscribe', { data: { plan: 'plus' } })).status() === 400);
  const at = new Date(Date.now() + 3 * 3600_000).toISOString();
  const bk = await call(drv, '/bookings', { siteId: 'site-1', plate: '77-12345', venue: 'عشاء اختبار', arriveAt: at });
  const opList = await call(op, '/bookings?status=booked&q=77-12345');
  check('operator sees new booking (server filter)', opList.items.some((b) => b.id === bk.id));
  const other = (await call(staff, '/bookings?limit=500')).items.every((b) => b.operatorId === 'op-1');
  check('bookings scoped to operator', other);
  await call(op, `/bookings/${bk.id}/status`, { status: 'arrived' });
  check('closed booking cannot be cancelled', (await drv.request.post(B + `/api/bookings/${bk.id}/status`, { data: { status: 'cancelled' } })).status() === 400);
  check('past booking rejected', (await drv.request.post(B + '/api/bookings', { data: { siteId: 'site-1', plate: '1', arriveAt: new Date().toISOString() } })).status() === 400);
  const me = (await call(drv, '/auth/me')).user;
  const v2 = (await call(staff, '/visits/checkin', { plate: '66-' + String(Date.now()).slice(-5), ownerPhone: me.phone })).visit;
  await call(staff, `/visits/${v2.id}/checkout`, {});
  await call(drv, '/ratings', { visitId: v2.id, stars: 5, comment: 'ممتاز' });
  const rated = (await call(op, '/state')).ratings.find((r) => r.visitId === v2.id);
  check('rating stored against staff by name', rated?.employeeId === 'emp-1');
  await call(drv, '/wallet/tip', { visitId: v2.id, amount: 1 });
  check('e-tip debits wallet', (await call(drv, '/wallet')).balance === 14);
  check('duplicate tip rejected', (await drv.request.post(B + '/api/wallet/tip', { data: { visitId: v2.id, amount: 1 } })).status() === 400);
  await shots(browser, B, prefix, check, [
    { c: drv, path: '/driver/wallet', name: 'driver-wallet', mobile: true },
    { c: drv, path: '/driver/book', name: 'driver-booking', mobile: true },
    { c: drv, path: '/driver/status', name: 'driver-tip', mobile: true },
    { c: op, path: '/operator/bookings?status=', name: 'operator-bookings' },
  ]);
}
