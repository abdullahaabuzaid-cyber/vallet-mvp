import { q } from '../../db/pool.ts';
import { mapDoc } from '../../db/mappers.ts';
import { iso, und } from '../../utils/rows.ts';

/** Operators (with lots, and documents when `withDocs`) matching a WHERE clause. */
export async function operatorsWith(where: string, params: unknown[], withDocs: boolean, order = 'created_at, id') {
  const ops = await q(`select * from operators ${where} order by ${order}`, params);
  if (!ops.length) return [];
  const ids = ops.map((o) => o.id);
  const sites = await q(`select * from sites where operator_id = any($1) order by id`, [ids]);
  const docs = withDocs ? await q(`select * from documents where owner_type='operator' and owner_id = any($1) order by id`, [ids]) : [];
  return ops.map((o) => ({
    id: o.id, name: o.name, licenseNo: und(o.license_no), status: o.status, licenseExpiry: und(o.license_expiry),
    rejectReason: und(o.reject_reason), submittedAt: iso(o.submitted_at)!, area: o.area || 'عمّان', autoAcceptHandoffs: o.auto_accept,
    sites: sites.filter((s) => s.operator_id === o.id).map((s) => ({ id: s.id, name: s.name, area: s.area, lat: s.lat, lng: s.lng, capacity: s.capacity })),
    docs: docs.filter((d) => d.owner_id === o.id).map(mapDoc),
  }));
}

/** Employees (with login username, and documents + PII when `withDocs`) matching a WHERE clause. */
export async function employeesWith(where: string, params: unknown[], withDocs: boolean) {
  const emps = await q(`select e.*, u.username from employees e left join users u on u.employee_id = e.id ${where} order by e.created_at desc, e.id`, params);
  if (!emps.length) return [];
  const docs = withDocs
    ? await q(`select * from documents where owner_type='employee' and owner_id = any($1) order by id`, [emps.map((e) => e.id)])
    : [];
  return emps.map((e) => ({
    id: e.id, operatorId: e.operator_id, name: e.name, nationalId: withDocs ? e.national_id : '', phone: withDocs ? e.phone : '',
    siteId: und(e.site_id), active: e.active, reviewStatus: e.review_status, rejectReason: und(e.reject_reason),
    username: und(e.username), docs: docs.filter((d) => d.owner_id === e.id).map(mapDoc),
  }));
}
