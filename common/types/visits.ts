export type HandoffStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

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
