// End-to-end verification across roles. Usage: BASE=http://localhost:8080 PREFIX=local node e2e/run.mjs
import { chromium, devices } from 'playwright';
import { filterChecks } from './filters.mjs';
import fs from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:8080';
const PREFIX = process.env.PREFIX || 'local';
const PHASE = process.env.PHASE || 'all';
const SHOTS = new URL('../shots/', import.meta.url).pathname;
fs.mkdirSync(SHOTS, { recursive: true });

const errors = [];
const results = [];
const ok = (name, cond, extra = '') => {
  results.push({ name, ok: !!cond, extra });
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
};

const browser = await chromium.launch();
async function ctx(label, mobile = false) {
  const c = await browser.newContext({
    ...(mobile ? devices['Pixel 7'] : { viewport: { width: 1360, height: 900 } }),
    locale: 'ar-JO',
    geolocation: { latitude: 31.9539, longitude: 35.9006 },
    permissions: ['geolocation'],
  });
  const p = await c.newPage();
  p.on('console', (m) => {
    if (m.type() === 'error') errors.push(`[${label}] console: ${m.text()} @ ${p.url()}`);
  });
  p.on('pageerror', (e) => errors.push(`[${label}] pageerror: ${e.message} @ ${p.url()}`));
  return { c, p };
}
const shot = (p, name) => p.screenshot({ path: `${SHOTS}${PREFIX}-${name}.png`, fullPage: false });
const settle = (p) => p.waitForLoadState('networkidle').catch(() => undefined);

async function login(p, user, pass) {
  await p.goto(`${BASE}/login`);
  await p.fill('#login-user', user);
  await p.fill('#login-pass', pass);
  await p.click('button[type=submit]');
  await p.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 10000 });
  await settle(p);
}

async function driverLogin(p, phone) {
  await p.goto(`${BASE}/driver/auth`);
  await p.fill('#drv-phone', phone);
  await p.click('button[type=submit]');
  const dev = p.getByTestId('dev-otp');
  await dev.waitFor({ timeout: 10000 });
  const code = (await dev.locator('strong').innerText()).trim();
  await p.fill('#drv-otp', code);
  await p.click('button[type=submit]');
  await p.waitForURL(/\/driver$/, { timeout: 10000 });
  await settle(p);
  return code;
}

try {
  // ---- public / driver landing
  const guest = await ctx('guest', true);
  await guest.p.goto(`${BASE}/driver`);
  await settle(guest.p);
  ok('driver landing shows licensed lots', (await guest.p.locator('.lot-sheet-card').count()) > 0);
  await shot(guest.p, 'driver-landing-mobile');
  await guest.p.goto(`${BASE}/login`);
  await settle(guest.p);
  ok('login page lists demo accounts', (await guest.p.locator('.demo-account').count()) >= 5);
  await shot(guest.p, 'login-mobile');
  // portal guarded
  await guest.p.goto(`${BASE}/gov`);
  await guest.p.waitForURL(/\/login/);
  ok('portal routes require login', guest.p.url().includes('/login'));

  // ---- gov
  const gov = await ctx('gov');
  await login(gov.p, 'admin', 'Gov@2026');
  ok('gov login lands on /gov', gov.p.url().endsWith('/gov'));
  await shot(gov.p, 'gov-summary');
  for (const path of ['alerts', 'map', 'licenses', 'operators', 'visits', 'incidents', 'complaints', 'payments', 'reports']) {
    await gov.p.goto(`${BASE}/gov/${path}`);
    await settle(gov.p);
    await gov.p.waitForTimeout(400);
    await shot(gov.p, `gov-${path}`);
  }
  ok('gov complaints queue has items', (await (async () => { await gov.p.goto(`${BASE}/gov/complaints`); await settle(gov.p); return gov.p.getByTestId('complaint').count(); })()) >= 1);
  const x = await gov.c.request.get(`${BASE}/api/gov/reports/export.xlsx`);
  ok('reports xlsx export', x.ok() && (x.headers()['content-type'] || '').includes('spreadsheet') && (await x.body()).length > 3000);
  const pdf = await gov.c.request.get(`${BASE}/api/gov/reports/export.pdf`);
  const pdfBody = await pdf.body();
  ok('reports pdf export', pdf.ok() && pdfBody.subarray(0, 4).toString() === '%PDF');
  fs.writeFileSync(`${SHOTS}${PREFIX}-report.pdf`, pdfBody);
  fs.writeFileSync(`${SHOTS}${PREFIX}-report.xlsx`, await x.body());

  // ---- operator + driver + staff realtime handoff flow
  const op = await ctx('operator');
  await login(op.p, 'elite', 'Operator@2026');
  ok('operator login', op.p.url().endsWith('/operator'));
  await op.c.request.post(`${BASE}/api/operator/auto-accept`, { data: { enabled: false } });
  await op.p.goto(`${BASE}/operator/requests`);
  await settle(op.p);

  const drv = await ctx('driver', true);
  await driverLogin(drv.p, `079${String(Math.floor(Math.random() * 1e7)).padStart(7, '0')}`);
  ok('driver OTP login (dev code shown)', true);
  await drv.p.locator('.lot-sheet-card', { hasText: 'مطعم الشام' }).locator('.lot-cta').click();
  const plate = `${Math.floor(10 + Math.random() * 80)}-${Math.floor(10000 + Math.random() * 89999)}`;
  await drv.p.fill('.handoff-sheet input', plate);
  await drv.p.click('.handoff-sheet button[type=submit]');
  await drv.p.waitForSelector('.tracking-card');
  await shot(drv.p, 'driver-handoff-pending');

  // operator receives realtime toast + row without reload
  const toastSeen = await op.p.locator('.toast-item', { hasText: 'طلب تسليم جديد' }).waitFor({ timeout: 8000 }).then(() => true).catch(() => false);
  ok('operator gets realtime new-request notification', toastSeen);
  const block = op.p.locator('.lot-card').filter({ hasText: plate });
  await block.waitFor({ timeout: 8000 });
  await shot(op.p, 'operator-requests-live');
  // accept: choose employee ahmad (emp-1) and accept
  await block.getByRole('button', { name: /قبول/ }).click();
  const accepted = await drv.p.getByText('مقبول').first().waitFor({ timeout: 8000 }).then(() => true).catch(() => false);
  ok('driver sees accepted/received status live', accepted);
  await shot(drv.p, 'driver-handoff-accepted');
  await op.c.request.post(`${BASE}/api/operator/auto-accept`, { data: { enabled: true } });

  // staff marks ready -> driver sees ready live
  const staff = await ctx('staff', true);
  await login(staff.p, 'ahmad', 'Staff@2026');
  ok('staff login', staff.p.url().endsWith('/staff'));
  await staff.p.goto(`${BASE}/staff/cars`);
  await settle(staff.p);
  const row = staff.p.locator('tr', { hasText: plate });
  await row.getByRole('button', { name: 'جاهزة' }).click();
  const ready = await drv.p.locator('.tracking-card').getByText('سيارتك جاهزة عند المدخل').waitFor({ timeout: 8000 }).then(() => true).catch(() => false);
  ok('driver sees "ready" live', ready);
  await shot(drv.p, 'driver-ready-live');
  await shot(staff.p, 'staff-cars');
  await row.getByRole('button', { name: 'تسليم' }).click();
  await staff.p.waitForTimeout(800);

  // driver rates + complains
  await drv.p.goto(`${BASE}/driver/status`);
  await settle(drv.p);
  const card = drv.p.getByTestId('driver-visit').filter({ hasText: plate });
  await card.locator('.stars button').nth(3).click();
  await card.getByRole('button', { name: 'إرسال التقييم' }).click();
  await drv.p.waitForTimeout(600);
  await card.getByRole('button', { name: 'تقديم شكوى' }).click();
  await card.locator('textarea').fill(`اختبار شكوى ${plate}: تأخير بالتسليم`);
  await card.getByRole('button', { name: 'إرسال الشكوى للهيئة' }).click();
  await drv.p.waitForTimeout(800);
  await shot(drv.p, 'driver-status-feedback');
  await gov.p.goto(`${BASE}/gov/complaints`);
  await settle(gov.p);
  ok('gov receives driver complaint', (await gov.p.getByTestId('complaint').filter({ hasText: plate }).count()) === 1);
  await gov.p.getByTestId('complaint').filter({ hasText: plate }).getByRole('button', { name: 'تمت المعالجة' }).click();
  await gov.p.waitForTimeout(500);

  await filterChecks({ BASE, gov, op, plate, ok, settle });

  // operator uploads a real document; gov can open it
  await op.p.goto(`${BASE}/operator/license`);
  await settle(op.p);
  const pdfPath = '/tmp/vallet-test-doc.pdf';
  fs.writeFileSync(pdfPath, pdfBody);
  await op.p.locator('input[type=file]').first().setInputFiles(pdfPath);
  await op.p.locator('.toast-item', { hasText: 'تم رفع المستند' }).waitFor({ timeout: 8000 });
  const st = await (await gov.c.request.get(`${BASE}/api/state`)).json();
  const doc = st.operators.find((o) => o.id === 'op-1').docs.find((d) => d.hasFile);
  const f = doc ? await gov.c.request.get(`${BASE}/api/documents/${doc.dbId}/file`) : null;
  ok('uploaded document stored & viewable by gov', !!f && f.ok() && (await f.body()).length > 1000);
  const anon = doc ? await guest.c.request.get(`${BASE}/api/documents/${doc.dbId}/file`) : null;
  ok('document not viewable anonymously', !!anon && anon.status() === 401);
  await gov.p.goto(`${BASE}/gov/licenses`);
  await settle(gov.p);
  await shot(gov.p, 'gov-licenses-docs');

  // operator creates a staff account; it can log in
  const uname = `t${Date.now().toString().slice(-6)}`;
  const cr = await op.c.request.post(`${BASE}/api/employees`, { data: { name: 'موظف اختبار', nationalId: '9990001112', phone: '0791112223', siteId: 'site-1', username: uname, password: 'Test@12345' } });
  ok('operator creates staff account', cr.ok());
  const sl = await browser.newContext();
  const lr = await sl.request.post(`${BASE}/api/auth/login`, { data: { username: uname, password: 'Test@12345' } });
  ok('new staff account can log in', lr.ok());
  await sl.close();

  // payments (operator pays an unpaid invoice with test card)
  await op.p.goto(`${BASE}/operator/payments`);
  await settle(op.p);
  await shot(op.p, 'operator-payments');
  const payBtn = op.p.getByRole('button', { name: 'ادفع الآن' }).first();
  if (await payBtn.count()) {
    await payBtn.click();
    await op.p.waitForSelector('.pay-modal');
    await shot(op.p, 'operator-pay-modal');
    await op.p.waitForTimeout(500);
    await op.p.locator('.pay-modal button[type=submit]').click();
    const paid = await op.p.getByText('تم الدفع بنجاح').waitFor({ timeout: 8000 }).then(() => true).catch(() => false);
    ok('mock payment succeeds (test mode)', paid);
    await shot(op.p, 'operator-paid');
    await op.p.getByRole('button', { name: 'إغلاق' }).click();
  } else ok('mock payment succeeds (test mode)', false, 'no unpaid invoice');
  const inv = (await (await op.c.request.get(`${BASE}/api/state`)).json()).invoices[0];
  const ipdf = await op.c.request.get(`${BASE}/api/invoices/${inv.id}/pdf`);
  ok('invoice PDF', ipdf.ok() && (await ipdf.body()).subarray(0, 4).toString() === '%PDF');
  fs.writeFileSync(`${SHOTS}${PREFIX}-invoice.pdf`, await ipdf.body());

  // operator other pages
  for (const path of ['', 'visits', 'employees', 'license', 'feedback']) {
    await op.p.goto(`${BASE}/operator${path ? '/' + path : ''}`);
    await settle(op.p);
    await op.p.waitForTimeout(300);
    await shot(op.p, `operator-${path || 'home'}`);
  }
  // staff pages
  for (const path of ['', 'scan', 'checkin', 'checkout', 'incident']) {
    await staff.p.goto(`${BASE}/staff${path ? '/' + path : ''}`);
    await settle(staff.p);
    await shot(staff.p, `staff-${path || 'home'}`);
  }
  // staff manual check-in
  await staff.p.goto(`${BASE}/staff/checkin`);
  await settle(staff.p);
  const ciPlate = `${Math.floor(10 + Math.random() * 80)}-${Math.floor(10000 + Math.random() * 89999)}`;
  const plateInput = staff.p.locator('form input').first();
  await plateInput.fill(ciPlate);
  await staff.p.locator('form button[type=submit]').last().click();
  const rec = await staff.p.getByText(/V-\d+/).first().waitFor({ timeout: 8000 }).then(() => true).catch(() => false);
  ok('staff manual check-in issues receipt', rec);
  await shot(staff.p, 'staff-checkin-receipt');

  // ---- PWA
  const m = await guest.c.request.get(`${BASE}/manifest.webmanifest`);
  const mj = m.ok() ? await m.json() : {};
  ok('manifest served with icons', m.ok() && mj.icons?.length >= 3 && mj.display === 'standalone');
  const pw = await ctx('pwa', true);
  await pw.p.goto(`${BASE}/driver`);
  await settle(pw.p);
  const swOk = await pw.p.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false;
    const reg = await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(() => r(null), 8000))]);
    return !!reg;
  });
  ok('service worker registered', swOk);
  if (swOk) {
    await pw.p.reload();
    await settle(pw.p);
    await pw.c.setOffline(true);
    await pw.p.goto(`${BASE}/driver/status`).catch(() => undefined);
    await pw.p.waitForTimeout(1500);
    const html = await pw.p.content();
    ok('offline shell loads', html.includes('id="root"') || html.includes('غير متصل'));
    await shot(pw.p, 'pwa-offline');
    await pw.c.setOffline(false);
  }
} catch (e) {
  ok('script completed without exception', false, e.message);
} finally {
  // filter: offline phase intentionally produces network errors
  const relevant = errors.filter((e) => !e.startsWith('[pwa]'));
  ok('zero console errors (excluding intentional offline test)', relevant.length === 0, relevant.slice(0, 10).join('\n'));
  fs.writeFileSync(`${SHOTS}${PREFIX}-e2e.json`, JSON.stringify({ base: BASE, results, errors }, null, 2));
  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
}
