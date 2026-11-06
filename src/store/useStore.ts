import { useSyncExternalStore } from 'react';
import { SEED } from '../data/seed';
import type {
  AppState,
  Employee,
  HandoffRequest,
  Incident,
  IncidentStatus,
  IncidentType,
  LicenseStatus,
  Role,
  Visit,
} from '../types';

const KEY = 'vallet-mvp-v3';

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppState>;
      return {
        ...structuredClone(SEED),
        ...parsed,
        handoffs: parsed.handoffs ?? [],
        handoffSeq: parsed.handoffSeq ?? SEED.handoffSeq,
      };
    }
  } catch {
    /* ignore */
  }
  return structuredClone(SEED);
}

let state: AppState = load();
const listeners = new Set<() => void>();

function emit() {
  localStorage.setItem(KEY, JSON.stringify(state));
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
  return () => listeners.delete(cb);
}

export function useStore<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(state));
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
            docs: o.docs.map((d) => ({ ...d, status: 'accepted' as const })),
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

export function addEmployee(input: { name: string; nationalId: string; phone: string; siteId?: string }) {
  const emp: Employee = {
    id: `emp-${Date.now()}`,
    operatorId: state.currentOperatorId,
    name: input.name.trim(),
    nationalId: input.nationalId.trim(),
    phone: input.phone.trim(),
    siteId: input.siteId || undefined,
    active: true,
  };
  set((s) => ({ ...s, employees: [emp, ...s.employees] }));
  return emp;
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
    .filter((i) => i.type === 'unlicensed' && i.lat != null && i.lng != null)
    .map((i) => ({
      id: i.id,
      area: i.area ?? 'عمّان',
      description: i.description,
      lat: i.lat as number,
      lng: i.lng as number,
      statusLabel: INCIDENT_STATUS_LABELS[i.status],
    }));
}
