/** Helpers for turning DB rows into API objects. */
export const iso = (d: unknown) => (d ? new Date(d as string).toISOString() : undefined);
export const und = <T>(v: T | null) => (v === null ? undefined : v);
