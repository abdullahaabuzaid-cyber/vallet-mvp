import { useEffect, useRef, useState } from 'react';
import { api } from '@/shared/lib/api';

export type ListResult<T> = { items: T[]; total: number; loading: boolean; error: string };

/**
 * Fetch a filtered list from the server (`{ items, total }`).
 * Refetches when the query changes (debounced for typing) or when `version` changes —
 * pass a store slice so realtime updates and mutations refresh the list too.
 */
export function useServerList<T>(path: string, query: string, version?: unknown): ListResult<T> {
  const [state, setState] = useState<ListResult<T>>({ items: [], total: 0, loading: true, error: '' });
  const lastQuery = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const typing = lastQuery.current !== null && lastQuery.current !== query;
    lastQuery.current = query;
    setState((s) => ({ ...s, loading: true }));
    const t = setTimeout(async () => {
      try {
        const d = await api<{ items: T[]; total: number }>(`${path}?${query}`);
        if (!cancelled) setState({ items: d.items, total: d.total, loading: false, error: '' });
      } catch (e) {
        if (!cancelled) setState((s) => ({ ...s, loading: false, error: (e as Error).message }));
      }
    }, typing ? 250 : 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [path, query, version]);

  return state;
}
