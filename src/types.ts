export type * from '../shared/types/index.ts';
export { OPERATOR_DOC_DEFS, STAFF_DOC_DEFS } from '../shared/constants/documents.ts';
import type {
  Complaint, Employee, HandoffRequest, Incident, Invoice, Operator, Rating, Role, SessionInfo, StoredAlert, Visit,
} from '../shared/types/index.ts';

export interface DriverAuth {
  phone: string;
  verified: boolean;
  verifiedAt?: string;
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
