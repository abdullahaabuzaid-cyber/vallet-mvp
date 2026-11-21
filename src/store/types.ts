import type {
  Complaint, Employee, HandoffRequest, Incident, Invoice, Operator, Rating, Role, SessionInfo, StoredAlert, Visit,
} from '@common/types';

export interface DriverAuth {
  phone: string;
  verified: boolean;
  verifiedAt?: string;
}

/** Client state: the server payload from GET /api/state plus a few derived session fields. */
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
  driverAuth: DriverAuth | null;
  /** ms timestamp of the last /api/state load (version for side lists). */
  syncedAt: number;
}

/** Shape returned by GET /api/state. */
export type ServerState = Omit<AppState, 'loaded' | 'role' | 'currentEmployeeId' | 'currentOperatorId' | 'driverAuth' | 'syncedAt'>;
