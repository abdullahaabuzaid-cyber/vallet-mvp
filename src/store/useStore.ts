import { useRef, useCallback, useSyncExternalStore } from 'react';
import type {
  AppState,
  ComplaintCategory,
  ComplaintStatus,
  Document,
  HandoffRequest,
  IncidentStatus,
  IncidentType,
  LicenseStatus,
  ReviewStatus,
  Visit,
  VisitExtras,
} from '../types';
import { OPERATOR_DOC_DEFS, STAFF_DOC_DEFS } from '../types';
import { api, apiForm, ApiError } from '../lib/api';
import { toast } from '../lib/toast';
export { OPERATOR_DOC_DEFS, STAFF_DOC_DEFS };

function isFiniteCoord(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

const EMPTY: AppState = {
  loaded: false,
  session: null,
  role: 'driver',
  currentEmployeeId: '',
  currentOperatorId: '',
  operators: [],
  employees: [],
  visits: [],
  incidents: [],
  handoffs: [],
  complaints: [],
  ratings: [],
  invoices: [],
  alerts: [],
  lotRatings: {},
  visitSeq: 0,
  incidentSeq: 0,
  handoffSeq: 0,
  driverAuth: null,
};

let state: AppState = EMPTY;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
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
  const cacheRef = useRef<{ state: AppState; selector: (s: AppState) => T; selected: T } | null>(null);

  // Cache per (state, selector) pair: repeated calls within one render are stable,
  // but a selector that closes over new props/state is re-run on the next render.
  const getSnapshot = useCallback(() => {
    const cached = cacheRef.current;
    const sel = selectorRef.current;
    if (cached && cached.state === state && cached.selector === sel) return cached.selected;
    const selected = sel(state);
    cacheRef.current = { state, selector: sel, selected };
    return selected;
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

type ServerState = Omit<AppState, 'loaded' | 'role' | 'currentEmployeeId' | 'currentOperatorId' | 'visitSeq' | 'incidentSeq' | 'handoffSeq' | 'driverAuth'>;

function applyServer(d: ServerState) {
  const prevSessionId = state.session?.id ?? null;
  const sess = d.session;
  state = {
    ...state,
    ...d,
    loaded: true,
    role: sess?.role ?? 'driver',
    currentEmployeeId: sess?.employeeId ?? '',
    currentOperatorId: sess?.operatorId ?? '',
    driverAuth: sess?.role === 'driver' ? { phone: sess.phone || '', verified: true } : null,
  };
  emit();
  if ((sess?.id ?? null) !== prevSessionId) restartRealtime();
}

let inflight: Promise<void> | null = null;
let again = false;
export function refresh(): Promise<void> {
  if (inflight) {
    again = true;
    return inflight;
  }
  inflight = (async () => {
    try {
      do {
        again = false;
        const d = await api<ServerState>('/api/state');
        applyServer(d);
      } while (again);
    } catch (e) {
      if (!state.loaded) {
        state = { ...state, loaded: true };
        emit();
      }
      toast('تعذّر تحميل البيانات', { body: (e as Error).message, tone: 'bad' });
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

// ---------- realtime (SSE) ----------
let es: EventSource | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
export type RtEvent = { type: string; title?: string; body?: string; link?: string };
const rtListeners = new Set<(e: RtEvent) => void>();
export function onRealtime(cb: (e: RtEvent) => void) {
  rtListeners.add(cb);
  return () => {
    rtListeners.delete(cb);
  };
}
let rtConnected = false;
const rtSubs = new Set<() => void>();
export function useRealtimeConnected() {
  return useSyncExternalStore(
    (cb) => {
      rtSubs.add(cb);
      return () => rtSubs.delete(cb);
    },
    () => rtConnected,
    () => rtConnected
  );
}
function setRt(v: boolean) {
  if (rtConnected !== v) {
    rtConnected = v;
    rtSubs.forEach((s) => s());
  }
}

export function restartRealtime() {
  if (typeof EventSource === 'undefined') return;
  es?.close();
  es = new EventSource('/api/events');
  es.addEventListener('open', () => setRt(true));
  es.addEventListener('error', () => setRt(false));
  es.addEventListener('change', (msg) => {
    let ev: RtEvent = { type: 'change' };
    try {
      ev = JSON.parse((msg as MessageEvent).data);
    } catch {
      /* ignore */
    }
    if (ev.title) toast(ev.title, { body: ev.body, link: ev.link, tone: 'info' });
    rtListeners.forEach((l) => l(ev));
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => void refresh(), 150);
  });
}

/** Run a server mutation, refresh state, toast errors. Returns null on failure. */
async function run<T>(fn: () => Promise<T>, okMsg?: string): Promise<T | null> {
  try {
    const r = await fn();
    await refresh();
    if (okMsg) toast(okMsg, { tone: 'ok' });
    return r;
  } catch (e) {
    toast(e instanceof ApiError ? e.message : 'حدث خطأ غير متوقع', { tone: 'bad' });
    return null;
  }
}

// ---------- auth ----------
export async function login(username: string, password: string) {
  const r = await api<{ ok: boolean; role: string }>('/api/auth/login', { username, password });
  await refresh();
  return r;
}

export async function logout() {
  await api('/api/auth/logout', {});
  await refresh();
}

export async function requestDriverOtp(phone: string) {
  return api<{ ok: boolean; phone: string; devMode: boolean; devCode?: string; provider: string }>('/api/auth/otp/request', { phone });
}

export async function verifyDriverOtp(phone: string, code: string) {
  await api('/api/auth/otp/verify', { phone, code });
  await refresh();
  return true;
}

export const logoutDriver = logout;

export function resetDemo() {
  return run(() => api('/api/gov/reset-demo', {}), 'تمت إعادة البيانات التجريبية');
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




export function visitStatusLabel(v: Visit): 'داخل الموقف' | 'تم التسليم' | 'بانتظار التسليم' {
  if (v.checkOutAt) return 'تم التسليم';
  if (v.returnRequestedAt) return 'بانتظار التسليم';
  return 'داخل الموقف';
}

export type TimelineStep = {
  key: string;
  label: string;
  at?: string;
  by?: string;
  done: boolean;
};

export function visitTimeline(v: Visit): TimelineStep[] {
  const handoff = v.handoffId ? state.handoffs.find((h) => h.id === v.handoffId) : undefined;
  const steps: TimelineStep[] = [
    {
      key: 'request',
      label: 'طلب التسليم من المالك',
      at: handoff?.createdAt,
      done: !!handoff?.createdAt,
    },
    {
      key: 'accepted',
      label: 'قبول الطلب',
      at: handoff?.acceptedAt,
      by: handoff?.assignedEmployeeId ? empName(handoff.assignedEmployeeId) : undefined,
      done: !!handoff?.acceptedAt,
    },
    {
      key: 'received',
      label: 'استلام السيارة',
      at: v.checkInAt,
      by: empName(v.checkInBy),
      done: !!v.checkInAt,
    },
    {
      key: 'parked',
      label: 'رُكنت في الموقف',
      at: v.parkedAt,
      by: empName(v.checkInBy),
      done: !!v.parkedAt,
    },
    {
      key: 'return_req',
      label: 'طلب الإرجاع من المالك',
      at: v.returnRequestedAt,
      done: !!v.returnRequestedAt,
    },
    {
      key: 'handed',
      label: 'تسليم السيارة للمالك',
      at: v.checkOutAt,
      by: v.checkOutBy ? empName(v.checkOutBy) : undefined,
      done: !!v.checkOutAt,
    },
  ];
  // Walk-in without app request: collapse request/accepted as N/A skipped
  if (!handoff) {
    steps[0] = { ...steps[0], label: 'دخول مباشر (بدون طلب تطبيق)', done: true, at: v.checkInAt };
    steps[1] = { ...steps[1], label: '—', done: false };
  }
  return steps;
}


export function siteOccupancy(siteId: string) {
  return state.visits.filter((v) => v.siteId === siteId && !v.checkOutAt).length;
}

export function siteHasCapacity(siteId: string) {
  const found = siteById(siteId);
  if (!found) return false;
  const cap = found.site.capacity || 10;
  return siteOccupancy(siteId) < cap;
}











export function emptyStaffDocs(): Document[] {
  return STAFF_DOC_DEFS.map((d) => ({ id: d.id, name: d.name, status: 'missing' as const }));
}

export function emptyOperatorDocs(): Document[] {
  return OPERATOR_DOC_DEFS.map((d) => ({ id: d.id, name: d.name, status: 'missing' as const }));
}










export function docsProgress(docs: Document[]) {
  const done = docs.filter((d) => d.status === 'uploaded' || d.status === 'accepted' || d.status === 'expiring').length;
  return { done, total: docs.length, complete: done === docs.length && docs.length > 0 };
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

export function findActiveVisitByPlate(plate: string, operatorId?: string) {
  const p = plate.trim().toLowerCase();
  return state.visits.find(
    (v) =>
      !v.checkOutAt &&
      v.plate.toLowerCase() === p &&
      (!operatorId || v.operatorId === operatorId)
  );
}

export type SmartAlert = {
  id: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
  kind: 'overstay' | 'exit_no_request' | 'unlicensed_cluster';
};

export function computeSmartAlerts(): SmartAlert[] {
  const alerts: SmartAlert[] = [];
  const now = Date.now();
  const OVERSTAY_MS = 4 * 3600_000;

  for (const v of state.visits) {
    if (!v.checkOutAt) {
      const age = now - new Date(v.checkInAt).getTime();
      if (age >= OVERSTAY_MS) {
        const hours = Math.round(age / 3600_000);
        alerts.push({
          id: `overstay-${v.id}`,
          severity: hours >= 8 ? 'high' : 'medium',
          title: 'تجاوز مدة الوقوف',
          detail: `اللوحة ${v.plate} (${v.receiptNo}) منذ ${hours} ساعة بدون خروج`,
          kind: 'overstay',
        });
      }
    } else if (!v.handoffId) {
      // exited without a driver-app handoff (owner request path)
      const outAge = now - new Date(v.checkOutAt).getTime();
      if (outAge < 48 * 3600_000) {
        alerts.push({
          id: `exit-${v.id}`,
          severity: 'medium',
          title: 'خروج بدون طلب مالك عبر التطبيق',
          detail: `اللوحة ${v.plate} خرجت عبر الموظف دون طلب تسليم مرتبط من السائق`,
          kind: 'exit_no_request',
        });
      }
    }
  }

  const unlicensed = state.incidents.filter((i) => i.type === 'unlicensed' && i.lat != null && i.lng != null);
  const clusters: { key: string; items: typeof unlicensed }[] = [];
  for (const inc of unlicensed) {
    const key = `${(inc.lat as number).toFixed(2)},${(inc.lng as number).toFixed(2)}`;
    let c = clusters.find((x) => x.key === key);
    if (!c) {
      c = { key, items: [] };
      clusters.push(c);
    }
    c.items.push(inc);
  }
  for (const c of clusters) {
    if (c.items.length >= 2) {
      const area = c.items[0].area || 'عمّان';
      alerts.push({
        id: `cluster-${c.key}`,
        severity: 'high',
        title: 'تجمّع بلاغات فاليه غير مرخّص',
        detail: `${c.items.length} بلاغات قريبة في ${area}`,
        kind: 'unlicensed_cluster',
      });
    }
  }

  const order = { high: 0, medium: 1, low: 2 };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
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

// ---------- mutations (server-backed) ----------
export async function checkIn(plate: string, notesOrExtras: string | VisitExtras = '', extras?: VisitExtras): Promise<Visit | null> {
  const extra: VisitExtras =
    typeof notesOrExtras === 'string' ? { ...(extras || {}), notes: notesOrExtras } : { ...notesOrExtras, ...(extras || {}) };
  const r = await run(() => api<{ visit: Visit }>('/api/visits/checkin', { plate, ...extra }));
  return r?.visit ?? null;
}

export function markParked(visitId: string) {
  return run(() => api(`/api/visits/${visitId}/parked`, {}));
}

export function markReady(visitId: string) {
  return run(() => api(`/api/visits/${visitId}/ready`, {}), 'تم إشعار صاحب السيارة بأنها جاهزة');
}

export function requestReturn(visitId: string) {
  return run(() => api(`/api/visits/${visitId}/request-return`, {}), 'تم إرسال طلب إرجاع السيارة');
}

export function checkOut(visitId: string) {
  return run(() => api(`/api/visits/${visitId}/checkout`, {}));
}

export function setAutoAcceptHandoffs(_operatorId: string, enabled: boolean) {
  return run(() => api('/api/operator/auto-accept', { enabled }));
}

export async function createHandoff(siteId: string, plate: string): Promise<HandoffRequest | null> {
  const r = await run(() => api<{ handoff: HandoffRequest }>('/api/handoffs', { siteId, plate }));
  return r?.handoff ?? null;
}

export async function acceptHandoff(handoffId: string, employeeId: string): Promise<Visit | null> {
  const r = await run(() => api<{ visit: Visit }>(`/api/handoffs/${handoffId}/accept`, { employeeId }), 'تم قبول الطلب وإنشاء الزيارة');
  return r?.visit ?? null;
}

export function rejectHandoff(handoffId: string) {
  return run(() => api(`/api/handoffs/${handoffId}/reject`, {}));
}

export function cancelHandoff(handoffId: string) {
  return run(() => api(`/api/handoffs/${handoffId}/cancel`, {}));
}

export async function addIncident(input: {
  type: IncidentType;
  description: string;
  visitId?: string;
  plate?: string;
  operatorId?: string;
  lat?: number;
  lng?: number;
  area?: string;
}) {
  const r = await run(() => api<{ incident: { id: string } }>('/api/incidents', input), 'تم تسجيل البلاغ');
  return r?.incident ?? null;
}

export function updateIncidentStatus(id: string, status: IncidentStatus, fineAmount?: number) {
  return run(() => api(`/api/gov/incidents/${id}/status`, { status, fineAmount }), status === 'fined' ? 'تم تسجيل المخالفة وإصدار فاتورة الغرامة' : undefined);
}

export function approveLicense(operatorId: string) {
  return run(() => api(`/api/gov/operators/${operatorId}/approve`, {}), 'تم اعتماد الترخيص وإصدار فاتورة الرسوم');
}

export function rejectLicense(operatorId: string, reason: string) {
  return run(() => api(`/api/gov/operators/${operatorId}/reject`, { reason }));
}

export function setOperatorStatus(operatorId: string, status: LicenseStatus) {
  return run(() => api(`/api/gov/operators/${operatorId}/status`, { status }));
}

export function createOperator(input: {
  name: string;
  area: string;
  username: string;
  password: string;
  site: { name: string; area: string; lat: number; lng: number; capacity: number };
}) {
  return run(() => api<{ operator: { id: string } }>('/api/gov/operators', input), 'تم إنشاء حساب المشغّل');
}

export function addEmployee(input: {
  name: string;
  nationalId: string;
  phone: string;
  siteId?: string;
  username: string;
  password: string;
}) {
  return run(() => api<{ employee: { id: string } }>('/api/employees', input), 'تم إنشاء حساب الموظف — بانتظار اعتماد الهيئة');
}

async function uploadDoc(ownerType: 'operator' | 'employee', ownerId: string, docKey: string, file: File) {
  const fd = new FormData();
  fd.append('ownerType', ownerType);
  fd.append('ownerId', ownerId);
  fd.append('docKey', docKey);
  fd.append('file', file);
  return apiForm('/api/documents/upload', fd);
}

export function uploadOperatorDoc(operatorId: string, docId: string, file: File) {
  return run(() => uploadDoc('operator', operatorId, docId, file), 'تم رفع المستند');
}

export function uploadEmployeeDoc(employeeId: string, docId: string, file: File) {
  return run(() => uploadDoc('employee', employeeId, docId, file), 'تم رفع المستند');
}

export function documentFileUrl(doc: Document) {
  return doc.dbId && doc.hasFile ? `/api/documents/${doc.dbId}/file` : undefined;
}

export function reviewDocument(dbId: number, status: 'accepted' | 'rejected', note?: string) {
  return run(() => api(`/api/gov/documents/${dbId}/review`, { status, note }));
}

export function submitOperatorForReview(_operatorId: string) {
  return run(() => api('/api/operator/submit', {}), 'تم إرسال الطلب للهيئة');
}

export function approveEmployee(employeeId: string) {
  return run(() => api(`/api/gov/employees/${employeeId}/approve`, {}));
}

export function rejectEmployee(employeeId: string, reason: string) {
  return run(() => api(`/api/gov/employees/${employeeId}/reject`, { reason }));
}

export function toggleEmployee(id: string) {
  return run(() => api(`/api/employees/${id}/toggle`, {}));
}

export function rateVisit(visitId: string, stars: number, comment?: string) {
  return run(() => api('/api/ratings', { visitId, stars, comment }), 'شكراً لتقييمك');
}

export function fileComplaint(input: { visitId?: string; siteId?: string; category: ComplaintCategory; description: string }) {
  return run(() => api('/api/complaints', input), 'تم إرسال الشكوى للهيئة');
}

export function updateComplaint(id: number, status: ComplaintStatus, response?: string) {
  return run(() => api(`/api/gov/complaints/${id}`, { status, response }), 'تم تحديث الشكوى');
}

export function ackAlert(id: string) {
  return run(() => api(`/api/gov/alerts/${encodeURIComponent(id)}/ack`, {}));
}

export function issueFine(input: { operatorId?: string; payerName?: string; amount: number; description: string }) {
  return run(() => api('/api/gov/fines', input), 'تم إصدار فاتورة الغرامة');
}

export async function startCheckout(invoiceId: number) {
  return api<{ ref: string; amount: number; currency: string; testMode: boolean }>(`/api/invoices/${invoiceId}/checkout`, {});
}

export async function confirmPayment(ref: string, card: { cardNumber: string; expiry: string; cvc: string; name: string }) {
  const r = await api<{ ok: boolean; ref: string }>(`/api/payments/${ref}/confirm`, card);
  await refresh();
  return r;
}

export const COMPLAINT_CATEGORY_LABELS: Record<ComplaintCategory, string> = {
  damage: 'ضرر بالسيارة',
  delay: 'تأخير بالتسليم',
  lost_item: 'فقدان غرض',
  behavior: 'سوء معاملة',
  overcharge: 'رسوم زائدة',
  unlicensed: 'فاليه غير مرخّص',
  other: 'أخرى',
};

export const COMPLAINT_STATUS_LABELS: Record<ComplaintStatus, string> = {
  open: 'جديدة',
  investigating: 'قيد المتابعة',
  resolved: 'تمت المعالجة',
  rejected: 'مرفوضة',
};

export const INVOICE_KIND_LABELS = {
  license_fee: 'رسوم ترخيص',
  fine: 'غرامة',
  visit_fee: 'رسوم رقابة',
} as const;

export function formatJod(n: number) {
  return `${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} د.أ`;
}
