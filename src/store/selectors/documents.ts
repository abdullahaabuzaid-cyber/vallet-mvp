import { STAFF_DOC_DEFS } from '@common/constants/documents';
import type { Document } from '@common/types';

export function emptyStaffDocs(): Document[] {
  return STAFF_DOC_DEFS.map((d) => ({ id: d.id, name: d.name, status: 'missing' as const }));
}

export function docsProgress(docs: Document[]) {
  const done = docs.filter((d) => d.status === 'uploaded' || d.status === 'accepted' || d.status === 'expiring').length;
  return { done, total: docs.length, complete: done === docs.length && docs.length > 0 };
}

export function documentFileUrl(doc: Document) {
  return doc.dbId && doc.hasFile ? `/api/documents/${doc.dbId}/file` : undefined;
}
