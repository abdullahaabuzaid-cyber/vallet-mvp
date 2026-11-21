import { useSyncExternalStore } from 'react';

/** Realtime (SSE) connection to /api/events. Does not import the store, so no cycles. */
export type RtEvent = { type: string; title?: string; body?: string; link?: string };

let es: EventSource | null = null;
let connected = false;
const subs = new Set<() => void>();

function setConnected(v: boolean) {
  if (connected !== v) {
    connected = v;
    subs.forEach((s) => s());
  }
}

export function useRealtimeConnected() {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => connected,
    () => connected
  );
}

/** (Re)open the stream; `onChange` runs for every server "change" event. */
export function connectRealtime(onChange: (ev: RtEvent) => void) {
  if (typeof EventSource === 'undefined') return;
  es?.close();
  es = new EventSource('/api/events');
  es.addEventListener('open', () => setConnected(true));
  es.addEventListener('error', () => setConnected(false));
  es.addEventListener('change', (msg) => {
    let ev: RtEvent = { type: 'change' };
    try {
      ev = JSON.parse((msg as MessageEvent).data);
    } catch {
      /* ignore */
    }
    onChange(ev);
  });
}
