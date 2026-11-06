export type Role = 'gov' | 'operator' | 'staff' | 'driver';
export type LicenseStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type DocStatus = 'missing' | 'uploaded' | 'accepted' | 'expiring' | 'rejected';
export type ReviewStatus = 'pending' | 'approved' | 'rejected';
export type IncidentType = 'damage' | 'lost_keys' | 'delay' | 'unlicensed' | 'other';
export type IncidentStatus = 'open' | 'investigating' | 'closed' | 'fined';
export type HandoffStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface Document {
  id: string;
  name: string;
  status: DocStatus;
  note?: string;
  fileName?: string;
  uploadedAt?: string;
}

export interface Site {
  id: string;
  name: string;
  area: string;
  lat: number;
  lng: number;
}

export interface Operator {
  id: string;
  name: string;
  licenseNo?: string;
  status: LicenseStatus;
  licenseExpiry?: string;
  sites: Site[];
  docs: Document[];
  rejectReason?: string;
  submittedAt: string;
  area: string;
}

export interface Employee {
  id: string;
  operatorId: string;
  name: string;
  nationalId: string;
  phone: string;
  siteId?: string;
  active: boolean;
  docs: Document[];
  reviewStatus: ReviewStatus;
  rejectReason?: string;
}

export interface Visit {
  id: string;
  receiptNo: string;
  plate: string;
  operatorId: string;
  siteId: string;
  checkInBy: string;
  checkOutBy?: string;
  checkInAt: string;
  checkOutAt?: string;
  notes?: string;
  handoffId?: string;
}

export interface HandoffRequest {
  id: string;
  plate: string;
  siteId: string;
  operatorId: string;
  status: HandoffStatus;
  createdAt: string;
  acceptedAt?: string;
  assignedEmployeeId?: string;
  visitId?: string;
}

export interface Incident {
  id: string;
  type: IncidentType;
  visitId?: string;
  operatorId?: string;
  description: string;
  status: IncidentStatus;
  createdAt: string;
  createdBy: string;
  plate?: string;
  lat?: number;
  lng?: number;
  area?: string;
}

export interface DriverAuth {
  phone: string;
  verified: boolean;
  verifiedAt?: string;
}

export interface AppState {
  role: Role;
  currentEmployeeId: string;
  currentOperatorId: string;
  operators: Operator[];
  employees: Employee[];
  visits: Visit[];
  incidents: Incident[];
  handoffs: HandoffRequest[];
  visitSeq: number;
  incidentSeq: number;
  handoffSeq: number;
  driverAuth: DriverAuth | null;
}

export const OPERATOR_DOC_DEFS = [
  { id: 'nid', name: 'الهوية الوطنية' },
  { id: 'cr', name: 'السجل التجاري' },
  { id: 'deed', name: 'سند الملكية / عقد الإيجار' },
  { id: 'ins', name: 'تأمين المسؤولية' },
  { id: 'clearance', name: 'شهادة عدم محكومية' },
] as const;

export const STAFF_DOC_DEFS = [
  { id: 'nid', name: 'الهوية' },
  { id: 'license', name: 'رخصة قيادة سارية' },
  { id: 'clearance', name: 'شهادة عدم محكومية' },
] as const;

export const DEMO_OTP = '1234';
