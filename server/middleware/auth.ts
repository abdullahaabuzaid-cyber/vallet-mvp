import type { Request, Response, NextFunction } from 'express';
import { COOKIE, loadUser, verifySession, type Role, type SessionUser } from '../modules/auth/session.ts';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

/** Reads the session (Bearer header or cookie) and sets `req.user`; anonymous on any failure. */
export async function attachUser(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : (req as any).cookies?.[COOKIE];
    if (token) req.user = await loadUser(verifySession(token));
  } catch {
    /* invalid/expired token → anonymous */
  }
  next();
}

/** 401 when signed out, 403 when the role is not allowed. */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'يجب تسجيل الدخول' });
    if (roles.length && !roles.includes(req.user.role)) return res.status(403).json({ error: 'غير مصرّح لهذا الدور' });
    next();
  };
}
