import { useSyncExternalStore } from 'react';

export type Toast = { id: number; title: string; body?: string; tone: 'ok' | 'bad' | 'info'; link?: string };
let toasts: Toast[] = [];
const subs = new Set<() => void>();
let seq = 1;

function emit() {
  subs.forEach((s) => s());
}

export function toast(title: string, opts: { body?: string; tone?: Toast['tone']; link?: string; ms?: number } = {}) {
  const t: Toast = { id: seq++, title, body: opts.body, tone: opts.tone || 'info', link: opts.link };
  toasts = [...toasts.slice(-3), t];
  emit();
  setTimeout(() => dismissToast(t.id), opts.ms ?? 5000);
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function useToasts() {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => toasts,
    () => toasts
  );
}
