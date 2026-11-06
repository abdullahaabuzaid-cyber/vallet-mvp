import { useRef, useCallback, useSyncExternalStore } from 'react';
import { SEED } from '../data/seed';
import type {
  AppState,
  Document,
  Employee,
  HandoffRequest,
  Incident,
  IncidentStatus,
  IncidentType,
  LicenseStatus,
  ReviewStatus,
  Role,
  Site,
  Visit,
} from '../types';
import { DEMO_OTP, OPERATOR_DOC_DEFS, STAFF_DOC_DEFS } from '../types';
export { DEMO_OTP, OPERATOR_DOC_DEFS, STAFF_DOC_DEFS };

/** Bump when seed shape changes; old keys are cleared safely */
const KEY = 'vallet-mvp-v6';
const LEGACY_KEYS = ['vallet-mvp-v1', 'vallet-mvp-v2', 'vallet-mvp-v3', 'vallet-mvp-v4', 'vallet-mvp-v5'];

function isFiniteCoord(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

function sanitizeSite(site: Partial<Site> | undefined, fallback?: Site): Site | null {
  if (!site && !fallback) return null;
  const id = site?.id || fallback?.id;
  const name = site?.name || fallback?.name;
  const area = site?.area || fallback?.area || 'عمّان';
  if (!id || !name) return null;
  const lat = isFiniteCoord(site?.lat) ? site!.lat : fallback?.lat;
  const lng = isFiniteCoord(site?.lng) ? site!.lng : fallback?.lng;
  if (!isFiniteCoord(lat) || !isFiniteCoord(lng)) return null;
  return { id, name, area, lat, lng };
}

function migrate(parsed: Partial<AppState>): AppState {
  const base = structuredClone(SEED);
  const seedByOp = new Map(base.operators.map((o) => [o.id, o]));
  const seedSiteById = new Map<string, Site>();
  for (const o of base.operators) {
    for (const s of o.sites) seedSiteById.set(s.id, s);
  }

  const operators =
    Array.isArray(parsed.operators) && parsed.operators.length
      ? parsed.operators.map((op) => {
          const seedOp = seedByOp.get(op.id);
          const sitesRaw = Array.isArray(op.sites) ? op.sites : seedOp?.sites ?? [];
          const sites = sitesRaw
            .map((s) => sanitizeSite(s, s?.id ? seedSiteById.get(s.id) : undefined))
            .filter((s): s is Site => !!s);
          return {
            ...seedOp,
            ...op,
            docs: Array.isArray(op.docs) && op.docs.length ? op.docs : seedOp?.docs ?? [],
            sites: sites.length ? sites : seedOp?.sites ?? [],
            status: op.status ?? seedOp?.status ?? 'pending',
            name: op.name || seedOp?.name || 'مشغّل',
            area: op.area || seedOp?.area || 'عمّان',
            submittedAt: op.submittedAt || seedOp?.submittedAt || new Date().toISOString(),
          };
        })
      : base.operators;

  const role: Role =
    parsed.role === 'gov' ||
    parsed.role === 'operator' ||
    parsed.role === 'staff' ||
    parsed.role === 'driver'
      ? parsed.role
      : base.role;

  const employees = (Array.isArray(parsed.employees) ? parsed.employees : base.employees).map((e) => {
    const docs =
      Array.isArray(e.docs) && e.docs.length
        ? e.docs
        : STAFF_DOC_DEFS.map((d) => ({ id: d.id, name: d.name, status: 'missing' as const }));
    return {
      ...e,
      docs,
      reviewStatus: (e.reviewStatus as ReviewStatus) || 'approved',
    };
  });

  return {
    ...base,
    ...parsed,
    role,
    operators,
    employees,
    visits: Array.isArray(parsed.visits) ? parsed.visits : base.visits,
    incidents: Array.isArray(parsed.incidents) ? parsed.incidents : base.incidents,
    handoffs: Array.isArray(parsed.handoffs) ? parsed.handoffs : [],
    visitSeq: typeof parsed.visitSeq === 'number' ? parsed.visitSeq : base.visitSeq,
    incidentSeq: typeof parsed.incidentSeq === 'number' ? parsed.incidentSeq : base.incidentSeq,
    handoffSeq: typeof parsed.handoffSeq === 'number' ? parsed.handoffSeq : base.handoffSeq,
    currentEmployeeId: parsed.currentEmployeeId || base.currentEmployeeId,
    currentOperatorId: parsed.currentOperatorId || base.currentOperatorId,
    driverAuth: parsed.driverAuth ?? base.driverAuth ?? null,
  };
}

function load(): AppState {
  try {
    for (const k of LEGACY_KEYS) {
      if (localStorage.getItem(k) != null) localStorage.removeItem(k);
    }
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppState>;
      return migrate(parsed);
    }
  } catch {
    /* ignore corrupt storage */
  }
  return structuredClone(SEED);
}

let state: AppState = load();
const listeners = new Set<() => void>();

function emit() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* quota / private mode */
  }
  listeners.forEach((l) => l());
}

function set(partial: Partial<AppState> | ((s: AppState) => AppState)) {
  state = typeof partial === 'function' ? partial(state) : { ...state, ...partial };
  emit();
}

export function getState() {
  return state;
}

export function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/**
 * Stable snapshots for useSyncExternalStore.
 * Recomputes only when AppState identity changes so selectors that
 * return new arrays (.filter/.map) do not trigger React error #185.
 */
export function useStore<T>(selector: (s: AppState) => T): T {
  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  const cacheRef = useRef<{ state: AppState; selected: T } | null>(null);

  const getSnapshot = useCallback(() => {
    const cached = cacheRef.current;
    if (cached && cached.state === state) return cached.selected;
    const selected = selectorRef.current(state);
    cacheRef.current = { state, selected };
    return selected;
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function setRole(role: Role) {
  set({ role });
}

export function resetDemo() {
  state = structuredClone(SEED);
  emit();
}

export function empName(id: string) {
  return state.employees.find((e) => e.id === id)?.name ?? id;
}

export function siteName(id: string) {
  for (const op of state.operators) {
    const s = op.sites.find((x) => x.id === id);
    if (s) return `${s.name} — ${s.area}`;
  }
  return id;
}

export function siteById(id: string) {
  for (const op of state.operators) {
    const s = op.sites.find((x) => x.id === id);
    if (s) return { site: s, operator: op };
  }
  return undefined;
}

export function operatorName(id: string) {
  return state.operators.find((o) => o.id === id)?.name ?? id;
}

/** Haversine distance in km */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  if (!isFiniteCoord(a.lat) || !isFiniteCoord(a.lng) || !isFiniteCoord(b.lat) || !isFiniteCoord(b.lng)) {
    return Number.POSITIVE_INFINITY;
  }
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function licensedLotsNear(origin: { lat: number; lng: number }) {
  const lots: {
    siteId: string;
    siteName: string;
    area: string;
    operatorId: string;
    operatorName: string;
    licenseNo?: string;
    lat: number;
    lng: number;
    distanceKm: number;
  }[] = [];

  for (const op of state.operators) {
    if (op.status !== 'approved') continue;
    for (const site of op.sites) {
      if (!isFiniteCoord(site.lat) || !isFiniteCoord(site.lng)) continue;
      lots.push({
        siteId: site.id,
        siteName: site.name,
        area: site.area,
        operatorId: op.id,
        operatorName: op.name,
        licenseNo: op.licenseNo,
        lat: site.lat,
        lng: site.lng,
        distanceKm: distanceKm(origin, site),
      });
    }
  }
  return lots.sort((a, b) => a.distanceKm - b.distanceKm);
}

export function checkIn(plate: string, notes: string): Visit {
  const emp = state.employees.find((e) => e.id === state.currentEmployeeId)!;
  const seq = state.visitSeq + 1;
  const visit: Visit = {
    id: `v-${seq}`,
    receiptNo: `V-${seq}`,
    plate: plate.trim(),
    operatorId: emp.operatorId,
    siteId: emp.siteId || state.operators.find((o) => o.id === emp.operatorId)!.sites[0].id,
    checkInBy: emp.id,
    checkInAt: new Date().toISOString(),
    notes: notes.trim() || undefined,
  };
  set((s) => ({
    ...s,
    visitSeq: seq,
    visits: [visit, ...s.visits],
  }));
  return visit;
}

export function checkOut(visitId: string) {
  set((s) => ({
    ...s,
    visits: s.visits.map((v) =>
      v.id === visitId && !v.checkOutAt
        ? { ...v, checkOutAt: new Date().toISOString(), checkOutBy: s.currentEmployeeId }
        : v
    ),
  }));
}

export function createHandoff(siteId: string, plate: string): HandoffRequest {
  const found = siteById(siteId);
  if (!found) throw new Error('site not found');
  const seq = state.handoffSeq + 1;
  const handoff: HandoffRequest = {
    id: `h-${seq}`,
    plate: plate.trim(),
    siteId,
    operatorId: found.operator.id,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  set((s) => ({
    ...s,
    handoffSeq: seq,
    handoffs: [handoff, ...s.handoffs],
  }));
  return handoff;
}

export function acceptHandoff(handoffId: string, employeeId: string): Visit | null {
  const handoff = state.handoffs.find((h) => h.id === handoffId);
  if (!handoff || handoff.status !== 'pending') return null;
  const emp = state.employees.find((e) => e.id === employeeId && e.active);
  if (!emp || emp.operatorId !== handoff.operatorId) return null;

  const seq = state.visitSeq + 1;
  const visit: Visit = {
    id: `v-${seq}`,
    receiptNo: `V-${seq}`,
    plate: handoff.plate,
    operatorId: handoff.operatorId,
    siteId: handoff.siteId,
    checkInBy: emp.id,
    checkInAt: new Date().toISOString(),
    notes: 'تسليم من السائق عبر التطبيق',
    handoffId: handoff.id,
  };

  set((s) => ({
    ...s,
    visitSeq: seq,
    visits: [visit, ...s.visits],
    handoffs: s.handoffs.map((h) =>
      h.id === handoffId
        ? {
            ...h,
            status: 'accepted' as const,
            acceptedAt: visit.checkInAt,
            assignedEmployeeId: emp.id,
            visitId: visit.id,
          }
        : h
    ),
  }));
  return visit;
}

export function rejectHandoff(handoffId: string) {
  set((s) => ({
    ...s,
    handoffs: s.handoffs.map((h) =>
      h.id === handoffId && h.status === 'pending'
        ? { ...h, status: 'rejected' as const }
        : h
    ),
  }));
}

export function cancelHandoff(handoffId: string) {
  set((s) => ({
    ...s,
    handoffs: s.handoffs.map((h) =>
      h.id === handoffId && h.status === 'pending'
        ? { ...h, status: 'cancelled' as const }
        : h
    ),
  }));
}

export function addIncident(input: {
  type: IncidentType;
  description: string;
  visitId?: string;
  plate?: string;
  operatorId?: string;
}) {
  const seq = state.incidentSeq + 1;
  const incident: Incident = {
    id: `inc-${seq}`,
    type: input.type,
    description: input.description.trim(),
    visitId: input.visitId,
    plate: input.plate,
    operatorId: input.operatorId ?? state.employees.find((e) => e.id === state.currentEmployeeId)?.operatorId,
    status: 'open',
    createdAt: new Date().toISOString(),
    createdBy: state.role === 'gov' ? 'gov' : state.currentEmployeeId,
  };
  set((s) => ({
    ...s,
    incidentSeq: seq,
    incidents: [incident, ...s.incidents],
  }));
  return incident;
}

export function updateIncidentStatus(id: string, status: IncidentStatus) {
  set((s) => ({
    ...s,
    incidents: s.incidents.map((i) => (i.id === id ? { ...i, status } : i)),
  }));
}

export function approveLicense(operatorId: string) {
  const year = new Date().getFullYear();
  set((s) => ({
    ...s,
    operators: s.operators.map((o) =>
      o.id === operatorId
        ? {
            ...o,
            status: 'approved' as LicenseStatus,
            licenseNo: o.licenseNo || `LIC-AMM-${year}-${String(Math.floor(Math.random() * 900) + 100)}`,
            licenseExpiry: `${year + 1}-12-31`,
            rejectReason: undefined,
            docs: o.docs.map((d) => ({ ...d, status: 'accepted' as const, note: undefined })),
          }
        : o
    ),
  }));
}

export function rejectLicense(operatorId: string, reason: string) {
  set((s) => ({
    ...s,
    operators: s.operators.map((o) =>
      o.id === operatorId
        ? { ...o, status: 'rejected' as LicenseStatus, rejectReason: reason }
        : o
    ),
  }));
}

export function setOperatorStatus(operatorId: string, status: LicenseStatus) {
  set((s) => ({
    ...s,
    operators: s.operators.map((o) => (o.id === operatorId ? { ...o, status } : o)),
  }));
}

export function emptyStaffDocs(): Document[] {
  return STAFF_DOC_DEFS.map((d) => ({ id: d.id, name: d.name, status: 'missing' as const }));
}

export function emptyOperatorDocs(): Document[] {
  return OPERATOR_DOC_DEFS.map((d) => ({ id: d.id, name: d.name, status: 'missing' as const }));
}

export function addEmployee(input: {
  name: string;
  nationalId: string;
  phone: string;
  siteId?: string;
  docs?: Document[];
}) {
  const docs = input.docs?.length ? input.docs : emptyStaffDocs();
  const emp: Employee = {
    id: `emp-${Date.now()}`,
    operatorId: state.currentOperatorId,
    name: input.name.trim(),
    nationalId: input.nationalId.trim(),
    phone: input.phone.trim(),
    siteId: input.siteId || undefined,
    active: false,
    docs,
    reviewStatus: 'pending',
  };
  set((s) => ({ ...s, employees: [emp, ...s.employees] }));
  return emp;
}

export function uploadOperatorDoc(operatorId: string, docId: string, fileName: string) {
  const now = new Date().toISOString();
  set((s) => ({
    ...s,
    operators: s.operators.map((o) =>
      o.id !== operatorId
        ? o
        : {
            ...o,
            docs: o.docs.map((d) =>
              d.id === docId
                ? { ...d, status: 'uploaded' as const, fileName, uploadedAt: now, note: undefined }
                : d
            ),
          }
    ),
  }));
}

export function submitOperatorForReview(operatorId: string) {
  set((s) => ({
    ...s,
    operators: s.operators.map((o) =>
      o.id === operatorId
        ? { ...o, status: 'pending' as LicenseStatus, submittedAt: new Date().toISOString(), rejectReason: undefined }
        : o
    ),
  }));
}

export function uploadEmployeeDoc(employeeId: string, docId: string, fileName: string) {
  const now = new Date().toISOString();
  set((s) => ({
    ...s,
    employees: s.employees.map((e) =>
      e.id !== employeeId
        ? e
        : {
            ...e,
            reviewStatus: 'pending' as ReviewStatus,
            docs: e.docs.map((d) =>
              d.id === docId
                ? { ...d, status: 'uploaded' as const, fileName, uploadedAt: now, note: undefined }
                : d
            ),
          }
    ),
  }));
}

export function approveEmployee(employeeId: string) {
  set((s) => ({
    ...s,
    employees: s.employees.map((e) =>
      e.id === employeeId
        ? {
            ...e,
            reviewStatus: 'approved' as ReviewStatus,
            active: true,
            rejectReason: undefined,
            docs: e.docs.map((d) =>
              d.status === 'uploaded' || d.status === 'accepted' || d.status === 'expiring'
                ? { ...d, status: 'accepted' as const }
                : d
            ),
          }
        : e
    ),
  }));
}

export function rejectEmployee(employeeId: string, reason: string) {
  set((s) => ({
    ...s,
    employees: s.employees.map((e) =>
      e.id === employeeId
        ? { ...e, reviewStatus: 'rejected' as ReviewStatus, active: false, rejectReason: reason }
        : e
    ),
  }));
}

export function requestDriverOtp(phone: string) {
  const cleaned = phone.trim();
  set({ driverAuth: { phone: cleaned, verified: false } });
  return DEMO_OTP;
}

export function verifyDriverOtp(code: string): boolean {
  if (code.trim() !== DEMO_OTP) return false;
  const phone = state.driverAuth?.phone || '';
  set({
    driverAuth: { phone, verified: true, verifiedAt: new Date().toISOString() },
  });
  return true;
}

export function logoutDriver() {
  set({ driverAuth: null });
}

export function docsProgress(docs: Document[]) {
  const done = docs.filter((d) => d.status === 'uploaded' || d.status === 'accepted' || d.status === 'expiring').length;
  return { done, total: docs.length, complete: done === docs.length && docs.length > 0 };
}

export function toggleEmployee(id: string) {
  set((s) => ({
    ...s,
    employees: s.employees.map((e) => (e.id === id ? { ...e, active: !e.active } : e)),
  }));
}

export function setCurrentEmployee(id: string) {
  set({ currentEmployeeId: id });
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ar-JO', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Amman',
  });
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ar-JO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Amman',
  });
}

export function formatDateTime(iso: string) {
  return `${formatDate(iso)} · ${formatTime(iso)}`;
}

export function durationLabel(from: string, to?: string) {
  const ms = (to ? new Date(to).getTime() : Date.now()) - new Date(from).getTime();
  const mins = Math.max(1, Math.round(ms / 60000));
  if (mins < 60) return `${mins}د`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}س${m}د` : `${h}س`;
}

export const INCIDENT_LABELS: Record<IncidentType, string> = {
  damage: 'ضرر',
  lost_keys: 'فقدان مفاتيح',
  delay: 'تأخير',
  unlicensed: 'فاليه غير مرخّص',
  other: 'أخرى',
};

export const DOC_STATUS_LABELS: Record<import('../types').DocStatus, string> = {
  missing: 'غير مرفوعة',
  uploaded: 'بانتظار المراجعة',
  accepted: 'مقبولة',
  expiring: 'تنتهي قريباً',
  rejected: 'مرفوضة',
};

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: 'قيد المراجعة',
  approved: 'معتمد',
  rejected: 'مرفوض',
};

export const STATUS_LABELS: Record<LicenseStatus, string> = {
  pending: 'قيد المراجعة',
  approved: 'ساري',
  rejected: 'مرفوض',
  suspended: 'موقوف',
};

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  open: 'مفتوح',
  investigating: 'قيد التحقيق',
  closed: 'مغلق',
  fined: 'مخالفة + إغلاق',
};

export const HANDOFF_STATUS_LABELS = {
  pending: 'بانتظار القبول',
  accepted: 'مقبول',
  rejected: 'مرفوض',
  cancelled: 'ملغى',
} as const;

/** All operator sites for gov / map views, optionally with distance from origin */
export function allLotsForMap(origin?: { lat: number; lng: number }) {
  const lots: {
    siteId: string;
    siteName: string;
    area: string;
    operatorId: string;
    operatorName: string;
    licenseNo?: string;
    status: LicenseStatus;
    lat: number;
    lng: number;
    distanceKm?: number;
  }[] = [];
  for (const op of state.operators) {
    for (const site of op.sites) {
      if (!isFiniteCoord(site.lat) || !isFiniteCoord(site.lng)) continue;
      lots.push({
        siteId: site.id,
        siteName: site.name,
        area: site.area,
        operatorId: op.id,
        operatorName: op.name,
        licenseNo: op.licenseNo,
        status: op.status,
        lat: site.lat,
        lng: site.lng,
        distanceKm: origin ? distanceKm(origin, site) : undefined,
      });
    }
  }
  if (origin) lots.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  return lots;
}

export function unlicensedPins() {
  return state.incidents
    .filter((i) => i.type === 'unlicensed' && isFiniteCoord(i.lat) && isFiniteCoord(i.lng))
    .map((i) => ({
      id: i.id,
      area: i.area ?? 'عمّان',
      description: i.description,
      lat: i.lat as number,
      lng: i.lng as number,
      statusLabel: INCIDENT_STATUS_LABELS[i.status],
    }));
}
