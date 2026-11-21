import { useCallback, useEffect, useState } from 'react';
import { useStore } from '@/store';
import { api } from '@/shared/lib/api';
/** Small role-scoped resource; global SSE state refreshes invalidate the resource. */
export function useResource<T>(path:string,initial:T) {
  const version=useStore(s=>s.visits);
  const [data,setData]=useState<T>(initial),[error,setError]=useState('');
  const reload=useCallback(async()=>{try{setData(await api<T>(path));setError('');}catch(e){setError((e as Error).message);}},[path]);
  useEffect(()=>{void reload();},[reload,version]);
  return {data,error,reload};
}
