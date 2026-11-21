import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { q1 } from './db.ts';

export type Role = 'gov' | 'operator' | 'staff' | 'driver';
export type SessionUser = {
  id: number;
  role: Role;
  name: string;
  username?: string | null;
  phone?: string | null;
  operatorId?: string | null;
  employeeId?: string | null;
};

const SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev-secret-change-me');
if (!SECRET) {
  console.warn('[auth] JWT_SECRET missing — generating ephemeral secret (sessions reset on restart)');
}
const EFFECTIVE_SECRET = SECRET || crypto.randomBytes(32).toString('hex');
export const COOKIE = 'vallet_session';
const MAX_AGE_S = 7 * 24 * 3600;

export function signSession(u: SessionUser) {
  return jwt.sign({ sub: String(u.id), role: u.role }, EFFECTIVE_SECRET, { expiresIn: MAX_AGE_S });
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE_S * 1000,
    path: '/',
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE, { path: '/' });
}

export async function loadUser(id: number): Promise<SessionUser | undefined> {
  const u = await q1(`select id, role, name, username, phone, operator_id, employee_id from users where id = $1`, [id]);
  if (!u) return undefined;
  return { id: u.id, role: u.role, name: u.name, username: u.username, phone: u.phone, operatorId: u.operator_id, employeeId: u.employee_id };
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

export async function attachUser(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : (req as any).cookies?.[COOKIE];
    if (token) {
      const payload = jwt.verify(token, EFFECTIVE_SECRET) as { sub: string };
      req.user = await loadUser(Number(payload.sub));
    }
  } catch {
    /* invalid/expired token → anonymous */
  }
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'يجب تسجيل الدخول' });
    if (roles.length && !roles.includes(req.user.role)) return res.status(403).json({ error: 'غير مصرّح لهذا الدور' });
    next();
  };
}

export function normalizePhone(raw: string) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.startsWith('00962')) d = d.slice(5);
  else if (d.startsWith('962')) d = d.slice(3);
  if (d.length === 9 && d.startsWith('7')) d = '0' + d;
  return d;
}

export function isJordanMobile(phone: string) {
  return /^07[789]\d{7}$/.test(phone);
}

export function hashOtp(phone: string, code: string) {
  return crypto.createHash('sha256').update(`${phone}:${code}:${EFFECTIVE_SECRET}`).digest('hex');
}
