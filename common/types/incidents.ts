export type IncidentType = 'damage' | 'lost_keys' | 'delay' | 'unlicensed' | 'other';
export type IncidentStatus = 'open' | 'investigating' | 'closed' | 'fined';

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
