import { api } from '@/shared/lib/api';
import { run } from '../core';

export function addEmployee(input: {
  name: string;
  nationalId: string;
  phone: string;
  siteId?: string;
  username: string;
  password: string;
}) {
  return run(() => api<{ employee: { id: string } }>('/api/employees', input), 'تم إنشاء حساب الموظف — بانتظار اعتماد الهيئة');
}

export function toggleEmployee(id: string) {
  return run(() => api(`/api/employees/${id}/toggle`, {}));
}

export function approveEmployee(employeeId: string) {
  return run(() => api(`/api/gov/employees/${employeeId}/approve`, {}));
}

export function rejectEmployee(employeeId: string, reason: string) {
  return run(() => api(`/api/gov/employees/${employeeId}/reject`, { reason }));
}
