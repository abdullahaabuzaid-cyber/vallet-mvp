import { api } from '@/shared/lib/api';
import { refresh, run } from '../core';

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

/** Gov-only: restore the demo dataset. */
export function resetDemo() {
  return run(() => api('/api/gov/reset-demo', {}), 'تمت إعادة البيانات التجريبية');
}
