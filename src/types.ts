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
  /** Server row id (for file download / review) */
  dbId?: number;
  hasFile?: boolean;
  mime?: string;
  size?: number;
}

export interface Site {
  id: string;
  name: string;
  area: string;
  lat: number;
  lng: number;
  /** Max concurrent parked cars */
  capacity: number;
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
  /** Auto-accept driver handoffs when site has free capacity */
  autoAcceptHandoffs: boolean;
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
  username?: string;
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
  /** Optional vehicle details captured at staff entry */
  carMake?: string;
  carModel?: string;
  carColor?: string;
  ownerPhone?: string;
  /** Compressed capture thumbnail (data URL) */
  photoThumb?: string;
  /** When car was marked parked after receive */
  parkedAt?: string;
  /** Owner asked for return via app (or staff) */
  returnRequestedAt?: string;
  /** Staff marked the car ready at the gate */
  readyAt?: string;
}

export type VisitStatusFilter = 'all' | 'inside' | 'delivered' | 'return_pending';

export interface VisitExtras {
  notes?: string;
  carMake?: string;
  carModel?: string;
  carColor?: string;
  ownerPhone?: string;
  photoThumb?: string;
  parkedAt?: string;
  returnRequestedAt?: string;
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
  ownerPhone?: string;
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

export type SessionInfo = {
  id: number;
  role: Role;
  name: string;
  username?: string | null;
  phone?: string | null;
  operatorId?: string | null;
  employeeId?: string | null;
};

export type ComplaintCategory = 'damage' | 'delay' | 'lost_item' | 'behavior' | 'overcharge' | 'unlicensed' | 'other';
export type ComplaintStatus = 'open' | 'investigating' | 'resolved' | 'rejected';

export interface Complaint {
  id: number;
  driverPhone?: string;
  visitId?: string;
  operatorId?: string;
  siteId?: string;
  category: ComplaintCategory;
  description: string;
  status: ComplaintStatus;
  govResponse?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Rating {
  id: number;
  visitId?: string;
  operatorId?: string;
  siteId?: string;
  stars: number;
  comment?: string;
  createdAt: string;
  driverPhone?: string;
}

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

export interface StoredAlert {
  id: string;
  kind: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
  status: 'open' | 'acknowledged' | 'resolved';
  firstSeen?: string;
  ackedAt?: string;
}

export interface AppState {
  loaded: boolean;
  session: SessionInfo | null;
  complaints: Complaint[];
  ratings: Rating[];
  invoices: Invoice[];
  alerts: StoredAlert[];
  lotRatings: Record<string, { avg: number; count: number }>;
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

