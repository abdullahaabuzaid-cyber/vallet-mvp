export type LicenseStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type DocStatus = 'missing' | 'uploaded' | 'accepted' | 'expiring' | 'rejected';
export type ReviewStatus = 'pending' | 'approved' | 'rejected';

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
