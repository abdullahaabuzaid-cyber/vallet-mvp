import type { Request, Response } from 'express';
import type { SessionUser } from '../auth/session.ts';

type Client = { id: number; res: Response; user?: SessionUser };
const clients = new Map<number, Client>();
let nextClientId = 1;

export type Audience = {
  gov?: boolean;
  operatorId?: string | null; // operator + staff users of this operator
  driverPhone?: string | null;
  driverUserId?: number | null;
  public?: boolean; // everyone (e.g. lot list changed)
};

export type RtEvent = { type: string; title?: string; body?: string; link?: string; [k: string]: unknown };

/** GET /api/events — Server-Sent Events stream scoped to the caller's session. */
export function sseHandler(req: Request, res: Response) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(`retry: 3000\n\n`);
  const id = nextClientId++;
  clients.set(id, { id, res, user: req.user });
  res.write(`event: hello\ndata: ${JSON.stringify({ role: req.user?.role ?? 'guest' })}\n\n`);
  req.on('close', () => clients.delete(id));
}

setInterval(() => {
  for (const c of clients.values()) c.res.write(`: ping\n\n`);
}, 25_000).unref();

function matches(u: SessionUser | undefined, a: Audience) {
  if (a.public) return true;
  if (!u) return false;
  if (a.gov && u.role === 'gov') return true;
  if (a.operatorId && (u.role === 'operator' || u.role === 'staff') && u.operatorId === a.operatorId) return true;
  if (u.role === 'driver' && ((a.driverPhone && u.phone === a.driverPhone) || (a.driverUserId && u.id === a.driverUserId))) return true;
  return false;
}

/** Push an event to every connected client in the audience. */
export function publish(a: Audience, ev: RtEvent) {
  const data = `event: change\ndata: ${JSON.stringify(ev)}\n\n`;
  for (const c of clients.values()) {
    if (matches(c.user, a)) c.res.write(data);
  }
}
