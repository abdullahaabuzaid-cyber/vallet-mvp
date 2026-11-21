import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import type { Response } from 'express';
import type { Role } from '../../../shared/types/index.ts';
import { env } from '../../config/env.ts';
import { q1 } from '../../db/pool.ts';

export type { Role };
export type SessionUser = {
  id: number;
  role: Role;
  name: string;
  username?: string | null;
  phone?: string | null;
  operatorId?: string | null;
  employeeId?: string | null;
};

const SECRET = env.jwtSecret || (env.isProd ? '' : 'dev-secret-change-me');
if (!SECRET) {
  console.warn('[auth] JWT_SECRET missing — generating ephemeral secret (sessions reset on restart)');
}
const EFFECTIVE_SECRET = SECRET || crypto.randomBytes(32).toString('hex');
export const COOKIE = 'vallet_session';
const MAX_AGE_S = 7 * 24 * 3600;

export function signSession(u: Pick<SessionUser, 'id' | 'role'>) {
  return jwt.sign({ sub: String(u.id), role: u.role }, EFFECTIVE_SECRET, { expiresIn: MAX_AGE_S });
}

/** Returns the user id from a valid token; throws on invalid/expired tokens. */
export function verifySession(token: string) {
  const payload = jwt.verify(token, EFFECTIVE_SECRET) as { sub: string };
  return Number(payload.sub);
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProd,
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

export function hashOtp(phone: string, code: string) {
  return crypto.createHash('sha256').update(`${phone}:${code}:${EFFECTIVE_SECRET}`).digest('hex');
}
