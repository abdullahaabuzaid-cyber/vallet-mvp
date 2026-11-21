import { iso, und } from '../utils/rows.ts';

/** DB row (snake_case) → API object (camelCase) mappers. */

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
    readyAt: iso(v.ready_at), preparingAt: iso(v.preparing_at), arrivalEta: iso(v.arrival_eta), conditionStatus: und(v.condition_status), fee: v.fee == null ? undefined : Number(v.fee),
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
    createdAt: iso(r.created_at)!, driverPhone: und(r.driver_phone), employeeId: und(r.employee_id),
  };
}

export function mapAlert(a: any) {
  return {
    id: a.id, kind: a.kind, severity: a.severity, title: a.title, detail: a.detail, status: a.status, firstSeen: iso(a.first_seen), ackedAt: iso(a.acked_at),
  };
}
