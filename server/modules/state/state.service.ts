import { q } from '../../db/pool.ts';
import { mapAlert, mapComplaint, mapHandoff, mapIncident, mapInvoice, mapRating, mapVisit } from '../../db/mappers.ts';
import { refreshAlerts } from '../alerts/alerts.service.ts';
import type { SessionUser } from '../auth/session.ts';
import { employeesWith, operatorsWith } from '../operators/operators.query.ts';

async function lotRatings() {
  const rows = await q(`select site_id, round(avg(stars)::numeric, 1)::float as avg, count(*)::int as n from ratings group by site_id`);
  const out: Record<string, { avg: number; count: number }> = {};
  for (const r of rows) out[r.site_id] = { avg: r.avg, count: r.n };
  return out;
}

/** Everything the signed-in role may see, in one payload (GET /api/state). */
export async function buildState(user?: SessionUser) {
  const role = user?.role ?? 'guest';
  const base = {
    session: user ? { id: user.id, role: user.role, name: user.name, username: user.username, phone: user.phone, operatorId: user.operatorId, employeeId: user.employeeId } : null,
    operators: [] as any[], employees: [] as any[], visits: [] as any[], handoffs: [] as any[], incidents: [] as any[],
    complaints: [] as any[], ratings: [] as any[], invoices: [] as any[], alerts: [] as any[], lotRatings: await lotRatings(),
  };

  if (role === 'guest' || role === 'driver') {
    // Public view: approved + suspended operators' lots (map shows licensed only on driver side)
    base.operators = await operatorsWith(`where status = 'approved'`, [], false);
    if (role === 'driver' && user) {
      const hs = await q(`select * from handoffs where driver_user_id = $1 or owner_phone = $2 order by created_at desc`, [user.id, user.phone]);
      const vs = await q(
        `select * from visits where owner_phone = $1 or id = any($2) or handoff_id = any($3) order by check_in_at desc`,
        [user.phone, hs.map((h) => h.visit_id).filter(Boolean), hs.map((h) => h.id)]
      );
      base.handoffs = hs.map(mapHandoff);
      base.visits = vs.map((v) => ({ ...mapVisit(v), photoThumb: undefined }));
      const empIds = [...new Set([...vs.flatMap((v) => [v.check_in_by, v.check_out_by]), ...hs.map((h) => h.assigned_employee_id)].filter(Boolean))];
      base.employees = (await q(`select id, operator_id, name from employees where id = any($1)`, [empIds])).map((e) => ({
        id: e.id, operatorId: e.operator_id, name: e.name, nationalId: '', phone: '', active: true, reviewStatus: 'approved', docs: [],
      }));
      // also include operators of my visits even if no longer approved (names/sites)
      const opIds = [...new Set([...vs.map((v) => v.operator_id), ...hs.map((h) => h.operator_id)])].filter((id) => !base.operators.some((o) => o.id === id));
      if (opIds.length) base.operators.push(...(await operatorsWith(`where id = any($1)`, [opIds], false)));
      base.complaints = (await q(`select * from complaints where driver_user_id = $1 or driver_phone = $2 order by created_at desc`, [user.id, user.phone])).map(mapComplaint);
      base.ratings = (await q(`select * from ratings where driver_user_id = $1 or driver_phone = $2`, [user.id, user.phone])).map(mapRating);
    }
    return base;
  }

  if (role === 'gov') {
    await refreshAlerts();
    base.operators = await operatorsWith('', [], true);
    base.employees = await employeesWith('', [], true);
    base.visits = (await q(`select * from visits order by check_in_at desc limit 2000`)).map(mapVisit);
    base.handoffs = (await q(`select * from handoffs order by created_at desc limit 2000`)).map(mapHandoff);
    base.incidents = (await q(`select * from incidents order by created_at desc`)).map(mapIncident);
    base.complaints = (await q(`select * from complaints order by created_at desc`)).map(mapComplaint);
    base.ratings = (await q(`select * from ratings order by created_at desc`)).map(mapRating);
    base.invoices = (await q(`select * from invoices order by issued_at desc`)).map(mapInvoice);
    base.alerts = (await q(`select * from alerts where status <> 'resolved' order by case severity when 'high' then 0 when 'medium' then 1 else 2 end, last_seen desc`)).map(mapAlert);
    return base;
  }

  if (role === 'inspector') {
    base.operators = await operatorsWith('', [], false);
    return base;
  }

  // operator / staff
  const opId = user!.operatorId!;
  base.operators = await operatorsWith(`where id = $1`, [opId], role === 'operator');
  base.employees = await employeesWith(`where e.operator_id = $1`, [opId], role === 'operator');
  base.visits = (await q(`select * from visits where operator_id = $1 order by check_in_at desc limit 2000`, [opId])).map(mapVisit);
  base.handoffs = (await q(`select * from handoffs where operator_id = $1 order by created_at desc limit 2000`, [opId])).map(mapHandoff);
  base.incidents = (await q(`select * from incidents where operator_id = $1 order by created_at desc`, [opId])).map(mapIncident);
  if (role === 'operator') {
    base.complaints = (await q(`select * from complaints where operator_id = $1 order by created_at desc`, [opId])).map(mapComplaint);
    base.ratings = (await q(`select * from ratings where operator_id = $1 order by created_at desc`, [opId])).map(mapRating);
    base.invoices = (await q(`select * from invoices where operator_id = $1 order by issued_at desc`, [opId])).map(mapInvoice);
  }
  return base;
}
