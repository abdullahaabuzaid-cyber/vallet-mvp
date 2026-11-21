import type { Request, Response } from 'express';
import { HttpError } from '../utils/http.ts';

/** JSON 404 for unknown /api routes. */
export function apiNotFound(_req: Request, res: Response) {
  res.status(404).json({ error: 'غير موجود' });
}

/** Last middleware: maps thrown errors to `{ error }` with the right status; hides 5xx details. */
export function errorHandler(err: any, _req: Request, res: Response, _next: unknown) {
  const status = err instanceof HttpError ? err.status : err?.status || (err?.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
  if (status >= 500) console.error('[api]', err);
  res.status(status).json({ error: status >= 500 ? 'خطأ في الخادم' : err.message || 'خطأ' });
}
