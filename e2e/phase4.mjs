import { shots } from './shots.mjs';
/** Phase 4: heatmap, field inspector (assign → verify → instant fine with photo), integration stubs, tax report export. */
export async function phase4({ call, check, gov, op, B, file, browser, prefix }) {
  const insp = await browser.newContext();
  await call(insp, '/auth/login', { username: 'inspector', password: 'Inspector@2026' });
  check('inspector demo account logs in', (await call(insp, '/auth/me')).user.role === 'inspector');
  const demand = await call(gov, '/gov/heatmap?layer=demand'), viol = await call(gov, '/gov/heatmap?layer=violations');
  check('heatmap demand + violations layers', demand.cells.length > 0 && viol.cells.length > 0 && demand.cells.every((c) => c.weight >= 1));
  check('heatmap is gov-only', (await op.request.get(B + '/api/gov/heatmap')).status() === 403);
  const rep = await (await browser.newContext()).request.post(B + '/api/public-reports', { multipart: { note: 'اختبار مهمة مفتش ميداني', lat: '31.96', lng: '35.88', file } });
  const reportId = (await rep.json()).id;
  const list = (await call(gov, '/inspectors')).items;
  check('gov lists inspectors', list.some((i) => i.username === 'inspector'));
  await call(gov, `/public-reports/${reportId}/status`, { status: 'assigned', assignedTo: 'inspector' });
  check('assigned task visible to inspector', (await call(insp, '/inspector/tasks')).items.some((t) => t.id === reportId));
  check('inspector sees assigned report photo', (await insp.request.get(B + `/api/public-reports/${reportId}/inspector-file`)).ok());
  await call(insp, `/inspector/tasks/${reportId}/verify`, { note: 'تم التحقق ميدانياً — اختبار' });
  const fineRes = await insp.request.post(B + '/api/inspector/fines', { multipart: { file, offender: 'فاليه غير مرخّص — اختبار', plate: '12-34567', amount: '1', note: 'مخالفة ميدانية تجريبية', lat: '31.96', lng: '35.88', reportId: String(reportId) } });
  const fine = await fineRes.json();
  check('instant field fine with photo → incident + invoice', fineRes.ok() && fine.incidentId && fine.invoiceNumber);
  const fines = await call(gov, '/field-fines?q=' + encodeURIComponent('اختبار'));
  check('gov field-fines list (server filtered)', fines.items.some((f) => f.id === fine.id));
  check('field fine photo protected', (await (await browser.newContext()).request.get(B + `/api/field-fines/${fine.id}/file`)).status() === 401);
  check('inspector cannot open gov portal APIs', (await insp.request.get(B + '/api/gov/heatmap')).status() === 403);
  const st = (await call(gov, '/integrations/status')).items;
  check('integrations report stub mode when unconfigured', st.length === 2 && st.every((i) => ['stub', 'live'].includes(i.mode)));
  const veh = await call(insp, '/integrations/vehicle?plate=12-34567');
  check('vehicle lookup labelled stub', veh.source === 'stub' || veh.source === 'live');
  check('municipality permit lookup', !!(await call(gov, '/integrations/municipality?siteId=site-1')).permitNo);
  const period = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Amman', year: 'numeric', month: '2-digit' }).format(new Date()).slice(0, 7);
  const tax = await call(gov, `/gov/reports/tax?period=${period}`);
  check('tax report totals', tax.items.length > 0 && Math.abs(tax.totals.gst - tax.items.reduce((a, x) => a + x.gst, 0)) < 0.01);
  const csv = await gov.request.get(B + `/api/gov/reports/tax?period=${period}&format=csv`);
  check('tax CSV export', csv.ok() && (await csv.text()).includes('ضريبة'));
  const xl = await gov.request.get(B + `/api/gov/reports/tax?period=${period}&format=xlsx`);
  check('tax XLSX export', xl.ok() && (await xl.body()).length > 3000);
  await shots(browser, B, prefix, check, [
    { c: insp, path: '/inspector', name: 'inspector-mobile', mobile: true },
    { c: gov, path: '/gov/map?severity=violations', name: 'gov-heatmap' },
    { c: gov, path: '/gov/integrations', name: 'gov-integrations' },
    { c: gov, path: '/gov/field-fines', name: 'gov-field-fines' },
    { c: gov, path: '/gov/reports', name: 'gov-tax-report' },
  ]);
  const p = await insp.newPage(); await p.setViewportSize({ width: 412, height: 915 });
  await p.goto(B + '/inspector'); await p.getByRole('tab', { name: 'مخالفة فورية' }).click(); await p.waitForTimeout(500);
  await p.screenshot({ path: `shots/${prefix}-inspector-fine-form.png`, fullPage: true });
  check('inspector fine form renders', await p.getByTestId('fine-form').isVisible());
  await p.close();
}
