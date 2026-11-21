/** Error with an HTTP status; the error handler turns it into `{ error }` JSON. */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Shorthand: `throw bad('message', 404)`. Defaults to 400. */
export const bad = (msg: string, status = 400) => new HttpError(status, msg);

/** Trimmed, length-capped string from untrusted input ('' when not a string). */
export const str = (v: unknown, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
