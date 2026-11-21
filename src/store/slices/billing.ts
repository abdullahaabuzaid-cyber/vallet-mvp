import { api } from '@/shared/lib/api';
import { refresh, run } from '../core';

export function issueFine(input: { operatorId?: string; payerName?: string; amount: number; description: string }) {
  return run(() => api('/api/gov/fines', input), 'تم إصدار فاتورة الغرامة');
}

/** Mock gateway (test mode): open a payment for an invoice. */
export async function startCheckout(invoiceId: number) {
  return api<{ ref: string; amount: number; currency: string; testMode: boolean }>(`/api/invoices/${invoiceId}/checkout`, {});
}

export async function confirmPayment(ref: string, card: { cardNumber: string; expiry: string; cvc: string; name: string }) {
  const r = await api<{ ok: boolean; ref: string }>(`/api/payments/${ref}/confirm`, card);
  await refresh();
  return r;
}
