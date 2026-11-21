export type Role = 'gov' | 'operator' | 'staff' | 'driver';

export type SessionInfo = {
  id: number;
  role: Role;
  name: string;
  username?: string | null;
  phone?: string | null;
  operatorId?: string | null;
  employeeId?: string | null;
};
