import { Router } from 'express';
import { str } from '../../utils/http.ts';
import { normalizePhone } from '../../utils/phone.ts';
import { loginWithPassword, requestOtp, verifyOtp } from './auth.service.ts';
import { clearSessionCookie, setSessionCookie, signSession } from './session.ts';

export const authRouter = Router();

authRouter.post('/auth/login', async (req, res) => {
  const username = str(req.body?.username, 64).toLowerCase();
  const password = String(req.body?.password || '');
  const u = await loginWithPassword(req.ip, username, password);
  setSessionCookie(res, signSession({ id: u.id, role: u.role }));
  res.json({ ok: true, role: u.role });
});

authRouter.post('/auth/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

authRouter.get('/auth/me', (req, res) => res.json({ user: req.user ?? null }));

authRouter.post('/auth/otp/request', async (req, res) => {
  res.json(await requestOtp(normalizePhone(str(req.body?.phone, 20))));
});

authRouter.post('/auth/otp/verify', async (req, res) => {
  const u = await verifyOtp(normalizePhone(str(req.body?.phone, 20)), str(req.body?.code, 10));
  setSessionCookie(res, signSession({ id: u.id, role: 'driver' }));
  res.json({ ok: true });
});
