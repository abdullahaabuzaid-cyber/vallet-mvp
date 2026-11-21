// FilterBar checks: URL-persisted search, chips, clear-all, server-side status + role scoping.
export async function filterChecks({ BASE, gov, op, plate, ok, settle }) {
  await gov.p.goto(`${BASE}/gov/visits`);
  await settle(gov.p);
  await gov.p.getByTestId('filter-search').fill(plate.replace('-', ''));
  await gov.p.waitForURL((u) => u.searchParams.get('q') === plate.replace('-', ''), { timeout: 5000 });
  await gov.p.waitForTimeout(700);
  const rows = gov.p.getByTestId('visit-row');
  const rowTexts = await rows.allInnerTexts();
  ok('filter: search by plate (server) narrows the car log', rowTexts.length >= 1 && rowTexts.every((t) => t.includes(plate)), `${rowTexts.length} rows`);
  await gov.p.reload();
  await settle(gov.p);
  ok('filter: state persists in URL after reload', (await gov.p.getByTestId('filter-search').inputValue()) === plate.replace('-', ''));
  await gov.p.getByTestId('filter-clear').click();
  await gov.p.waitForTimeout(500);
  ok('filter: clear-all resets URL and results', !new URL(gov.p.url()).searchParams.get('q') && (await gov.p.getByTestId('visit-row').count()) > rowTexts.length);
  const delivered = await (await gov.c.request.get(`${BASE}/api/visits?status=delivered&limit=100`)).json();
  ok('filter: server status filter returns only delivered visits', delivered.total > 0 && delivered.items.every((v) => !!v.checkOutAt));
  const scoped = await (await op.c.request.get(`${BASE}/api/visits?operatorId=op-2&limit=500`)).json();
  ok('filter: operator list stays scoped to own operator', scoped.items.length > 0 && scoped.items.every((v) => v.operatorId === 'op-1'));
  await gov.p.goto(`${BASE}/gov/complaints?status=resolved&q=${encodeURIComponent(plate)}`);
  await settle(gov.p);
  await gov.p.waitForTimeout(500);
  ok('filter: complaints status + search from URL (chips shown)', (await gov.p.getByTestId('complaint').filter({ hasText: plate }).count()) === 1 && (await gov.p.locator('.fb-chips .chip').count()) >= 3);
}
