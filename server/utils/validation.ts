export function validUsername(u: string) {
  return /^[a-z0-9._-]{3,32}$/.test(u);
}

export function validPassword(p: string) {
  return typeof p === 'string' && p.length >= 8;
}

/** Finite number from a body field, or null when missing/invalid. */
export function optionalNumber(v: unknown): number | null {
  return Number.isFinite(Number(v)) && v !== null && v !== undefined ? Number(v) : null;
}
