import { useCallback, useRef, useSyncExternalStore } from 'react';
import { api, ApiError } from '@/shared/lib/api';
import { toast } from '@/shared/lib/toast';
import { connectRealtime } from './realtime';
import type { AppState, ServerState } from './types';

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
  driverAuth: null,
  syncedAt: 0,
};

let state: AppState = EMPTY;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

/** Current snapshot (for non-React helpers such as selectors). */
export function getState() {
  return state;
}

function subscribe(cb: () => void) {
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

// ---------- server sync ----------
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

function onRealtimeChange(ev: { title?: string; body?: string; link?: string }) {
  if (ev.title) toast(ev.title, { body: ev.body, link: ev.link, tone: 'info' });
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => void refresh(), 150);
}

function applyServer(d: ServerState) {
  const prevSessionId = state.session?.id ?? null;
  const sess = d.session;
  state = {
    ...state,
    ...d,
    loaded: true,
    syncedAt: Date.now(),
    role: sess?.role ?? 'driver',
    currentEmployeeId: sess?.employeeId ?? '',
    currentOperatorId: sess?.operatorId ?? '',
    driverAuth: sess?.role === 'driver' ? { phone: sess.phone || '', verified: true } : null,
  };
  emit();
  if ((sess?.id ?? null) !== prevSessionId) connectRealtime(onRealtimeChange);
}

let inflight: Promise<void> | null = null;
let again = false;

/** Reload GET /api/state (coalesces concurrent calls). */
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

/** Run a server mutation, refresh state, toast errors. Returns null on failure. */
export async function run<T>(fn: () => Promise<T>, okMsg?: string): Promise<T | null> {
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
