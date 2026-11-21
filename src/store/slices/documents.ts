import { api, apiForm } from '@/shared/lib/api';
import { run } from '../core';

function uploadDoc(ownerType: 'operator' | 'employee', ownerId: string, docKey: string, file: File) {
  const fd = new FormData();
  fd.append('ownerType', ownerType);
  fd.append('ownerId', ownerId);
  fd.append('docKey', docKey);
  fd.append('file', file);
  return apiForm('/api/documents/upload', fd);
}

export function uploadOperatorDoc(operatorId: string, docId: string, file: File) {
  return run(() => uploadDoc('operator', operatorId, docId, file), 'تم رفع المستند');
}

export function uploadEmployeeDoc(employeeId: string, docId: string, file: File) {
  return run(() => uploadDoc('employee', employeeId, docId, file), 'تم رفع المستند');
}

export function reviewDocument(dbId: number, status: 'accepted' | 'rejected', note?: string) {
  return run(() => api(`/api/gov/documents/${dbId}/review`, { status, note }));
}
