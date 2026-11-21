export type InvoiceKind = 'license_fee' | 'fine' | 'visit_fee';

export interface Invoice {
  id: number;
  number: string;
  operatorId?: string;
  payerName?: string;
  kind: InvoiceKind;
  description?: string;
  amount: number;
  status: 'paid' | 'unpaid';
  issuedAt: string;
  dueAt?: string;
  paidAt?: string;
  incidentId?: string;
  paymentRef?: string;
}
