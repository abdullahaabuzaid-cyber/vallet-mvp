/** Documents an operator must upload to get licensed. */
export const OPERATOR_DOC_DEFS = [
  { id: 'nid', name: 'الهوية الوطنية' },
  { id: 'cr', name: 'السجل التجاري' },
  { id: 'deed', name: 'سند الملكية / عقد الإيجار' },
  { id: 'ins', name: 'تأمين المسؤولية' },
  { id: 'clearance', name: 'شهادة عدم محكومية' },
] as const;

/** Documents each valet staff member must upload before approval. */
export const STAFF_DOC_DEFS = [
  { id: 'nid', name: 'الهوية' },
  { id: 'license', name: 'رخصة قيادة سارية' },
  { id: 'clearance', name: 'شهادة عدم محكومية' },
] as const;

export type DocDef = { readonly id: string; readonly name: string };
