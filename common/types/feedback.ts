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
  /** Staff member rated by name (who handed the car back). */
  employeeId?: string;
}
