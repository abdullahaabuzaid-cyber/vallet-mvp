// Desktop + mobile screenshots of every dashboard. Usage: BASE=http://localhost:8080 PREFIX=redesign node e2e/screens.mjs
import { chromium, devices } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:8080';
const PREFIX = process.env.PREFIX || 'redesign';
const SHOTS = new URL('../shots/', import.meta.url).pathname;
fs.mkdirSync(SHOTS, { recursive: true });

const ROLES = [
  { role: 'gov', user: 'admin', pass: 'Gov@2026', paths: ['/gov', '/gov/licenses', '/gov/visits', '/gov/complaints', '/gov/incidents', '/gov/payments', '/gov/map', '/gov/alerts', '/gov/operators', '/gov/reports'] },
  { role: 'operator', user: 'elite', pass: 'Operator@2026', paths: ['/operator', '/operator/visits', '/operator/requests', '/operator/employees', '/operator/payments', '/operator/feedback', '/operator/license'] },
  { role: 'staff', user: 'ahmad', pass: 'Staff@2026', paths: ['/staff', '/staff/cars', '/staff/scan', '/staff/checkin', '/staff/checkout', '/staff/incident'] },
  { role: 'driver', paths: ['/driver', '/driver/status', '/login'] },
];
const VIEWPORTS = { desktop: { viewport: { width: 1440, height: 900 } }, mobile: devices['Pixel 7'] };

const browser = await chromium.launch();
const errors = [];
const files = [];
for (const [vp, opts] of Object.entries(VIEWPORTS)) {
  for (const r of ROLES) {
    const c = await browser.newContext({ ...opts, locale: 'ar-JO', geolocation: { latitude: 31.9539, longitude: 35.9006 }, permissions: ['geolocation'] });
    const p = await c.newPage();
    p.on('pageerror', (e) => errors.push(`${r.role}/${vp}: ${e.message}`));
    p.on('console', (m) => m.type() === 'error' && errors.push(`${r.role}/${vp}: ${m.text()}`));
    if (r.user) {
      await p.goto(`${BASE}/login`);
      await p.fill('#login-user', r.user);
      await p.fill('#login-pass', r.pass);
      await p.click('button[type=submit]');
      await p.waitForURL((u) => !u.pathname.startsWith('/login'));
    }
    for (const path of r.paths) {
      await p.goto(BASE + path);
      await p.waitForLoadState('networkidle').catch(() => undefined);
      await p.waitForTimeout(600);
      const name = `${SHOTS}${PREFIX}-${path.slice(1).replace(/\//g, '-') || 'root'}-${vp}.png`;
      await p.screenshot({ path: name, fullPage: true });
      files.push(name);
    }
    await c.close();
  }
}
await browser.close();
console.log(files.join('\n'));
console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'no console errors');
process.exit(errors.length ? 1 : 0);
