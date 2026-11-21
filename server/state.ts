import { q } from './db.ts';
import type { SessionUser } from './auth.ts';

const iso = (d: unknown) => (d ? new Date(d as string).toISOString() : undefined);
const und = <T>(v: T | null) => (v === null ? undefined : v);

export function mapDoc(d: any) {
  return {
    id: d.doc_key,
    dbId: d.id,
    name: d.name,
    status: d.status,
    note: und(d.note),
    fileName: und(d.file_name),
    uploadedAt: iso(d.uploaded_at),
    hasFile: !!d.storage_key,
    mime: und(d.mime),
    size: und(d.size),
  };
}

export function mapVisit(v: any) {
  return {
    id: v.id, receiptNo: v.receipt_no, plate: v.plate, operatorId: v.operator_id, siteId: v.site_id,
    checkInBy: v.check_in_by, checkOutBy: und(v.check_out_by), checkInAt: iso(v.check_in_at)!, checkOutAt: iso(v.check_out_at),
    notes: und(v.notes), handoffId: und(v.handoff_id), carMake: und(v.car_make), carModel: und(v.car_model), carColor: und(v.car_color),
    ownerPhone: und(v.owner_phone), photoThumb: und(v.photo_thumb), parkedAt: iso(v.parked_at), returnRequestedAt: iso(v.return_requested_at),
    readyAt: iso(v.ready_at),
  };
}

export function mapHandoff(h: any) {
  return {
    id: h.id, plate: h.plate, siteId: h.site_id, operatorId: h.operator_id, status: h.status, createdAt: iso(h.created_at)!,
    acceptedAt: iso(h.accepted_at), assignedEmployeeId: und(h.assigned_employee_id), visitId: und(h.visit_id), ownerPhone: und(h.owner_phone),
  };
}

export function mapIncident(i: any) {
  return {
    id: i.id, type: i.type, visitId: und(i.visit_id), operatorId: und(i.operator_id), description: i.description, status: i.status,
    createdAt: iso(i.created_at)!, createdBy: i.created_by, plate: und(i.plate), lat: und(i.lat), lng: und(i.lng), area: und(i.area),
  };
}

export function mapInvoice(i: any) {
  return {
    id: i.id, number: i.number, operatorId: und(i.operator_id), payerName: und(i.payer_name), kind: i.kind, description: und(i.description),
    amount: Number(i.amount), status: i.status, issuedAt: iso(i.issued_at)!, dueAt: iso(i.due_at), paidAt: iso(i.paid_at),
    incidentId: und(i.incident_id), paymentRef: und(i.payment_ref),
  };
}

export function mapComplaint(c: any) {
  return {
    id: c.id, driverPhone: und(c.driver_phone), visitId: und(c.visit_id), operatorId: und(c.operator_id), siteId: und(c.site_id),
    category: c.category, description: c.description, status: c.status, govResponse: und(c.gov_response),
    createdAt: iso(c.created_at)!, updatedAt: iso(c.updated_at)!,
  };
}

export function mapRating(r: any) {
  return {
    id: r.id, visitId: und(r.visit_id), operatorId: und(r.operator_id), siteId: und(r.site_id), stars: r.stars, comment: und(r.comment),
    createdAt: iso(r.created_at)!, driverPhone: und(r.driver_phone),
  };
}

async function operatorsWith(where: string, params: unknown[], withDocs: boolean) {
  const ops = await q(`select * from operators ${where} order by created_at, id`, params);
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

async function employeesWith(where: string, params: unknown[], withDocs: boolean) {
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

export async function lotRatings() {
  const rows = await q(`select site_id, round(avg(stars)::numeric, 1)::float as avg, count(*)::int as n from ratings group by site_id`);
  const out: Record<string, { avg: number; count: number }> = {};
  for (const r of rows) out[r.site_id] = { avg: r.avg, count: r.n };
  return out;
}

/** Compute smart alerts from live data and persist them (status survives recompute). */
export async function refreshAlerts() {
  const found: { id: string; kind: string; severity: string; title: string; detail: string }[] = [];
  const open = await q(`select id, plate, receipt_no, check_in_at from visits where check_out_at is null and check_in_at < now() - interval '4 hours'`);
  for (const v of open) {
    const hours = Math.round((Date.now() - new Date(v.check_in_at).getTime()) / 3600_000);
    found.push({ id: `overstay-${v.id}`, kind: 'overstay', severity: hours >= 8 ? 'high' : 'medium', title: 'تجاوز مدة الوقوف', detail: `اللوحة ${v.plate} (${v.receipt_no}) منذ ${hours} ساعة بدون خروج` });
  }
  const exits = await q(`select id, plate from visits where check_out_at is not null and handoff_id is null and check_out_at > now() - interval '48 hours'`);
  for (const v of exits) {
    found.push({ id: `exit-${v.id}`, kind: 'exit_no_request', severity: 'medium', title: 'خروج بدون طلب مالك عبر التطبيق', detail: `اللوحة ${v.plate} خرجت عبر الموظف دون طلب تسليم مرتبط من السائق` });
  }
  const clusters = await q(`select round(lat::numeric,2) as la, round(lng::numeric,2) as ln, count(*)::int as n, min(area) as area
    from incidents where type='unlicensed' and lat is not null and lng is not null group by 1,2 having count(*) >= 2`);
  for (const c of clusters) {
    found.push({ id: `cluster-${c.la},${c.ln}`, kind: 'unlicensed_cluster', severity: 'high', title: 'تجمّع بلاغات فاليه غير مرخّص', detail: `${c.n} بلاغات قريبة في ${c.area || 'عمّان'}` });
  }
  const openComplaints = await q(`select operator_id, count(*)::int as n from complaints where status in ('open','investigating') and operator_id is not null group by 1 having count(*) >= 2`);
  for (const c of openComplaints) {
    found.push({ id: `complaints-${c.operator_id}`, kind: 'complaints', severity: 'medium', title: 'تكرار شكاوى على مشغّل', detail: `${c.n} شكاوى مفتوحة على المشغّل ${c.operator_id}` });
  }
  for (const a of found) {
    await q(
      `insert into alerts (id, kind, severity, title, detail) values ($1,$2,$3,$4,$5)
       on conflict (id) do update set severity = excluded.severity, detail = excluded.detail, last_seen = now()`,
      [a.id, a.kind, a.severity, a.title, a.detail]
    );
  }
  const ids = found.map((a) => a.id);
  await q(`update alerts set status = 'resolved' where status = 'open' and not (id = any($1))`, [ids]);
}

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
    base.alerts = (await q(`select * from alerts where status <> 'resolved' order by case severity when 'high' then 0 when 'medium' then 1 else 2 end, last_seen desc`)).map((a) => ({
      id: a.id, kind: a.kind, severity: a.severity, title: a.title, detail: a.detail, status: a.status, firstSeen: iso(a.first_seen), ackedAt: iso(a.acked_at),
    }));
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
