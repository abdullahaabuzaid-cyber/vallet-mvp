import type { Request } from 'express';
import { str } from './http.ts';
import type { SessionUser } from '../modules/auth/session.ts';

/** Common list filters read from the query string (all optional). */
export type ListParams = {
  q: string;
  status: string;
  kind: string;
  operatorId: string;
  employeeId: string;
  siteId: string;
  from?: Date;
  to?: Date;
  sort: string;
  limit: number;
  offset: number;
};

const date = (v: unknown) => {
  const s = str(v, 40);
  if (!s) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
};
const int = (v: unknown, def: number, max: number) => {
  const n = Number.parseInt(str(v, 10), 10);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : def;
};

/** Parse `?q=&status=&kind=&operatorId=&employeeId=&siteId=&from=&to=&sort=&limit=&offset=`. */
export function listParams(req: Request): ListParams {
  const p = req.query;
  return {
    q: str(p.q, 80),
    status: str(p.status, 30),
    kind: str(p.kind, 30),
    operatorId: str(p.operatorId, 40),
    employeeId: str(p.employeeId, 40),
    siteId: str(p.siteId, 40),
    from: date(p.from),
    to: date(p.to),
    sort: str(p.sort, 30),
    limit: int(p.limit, 200, 500),
    offset: int(p.offset, 0, 100_000),
  };
}

/** Builds a parameterised WHERE clause. Use `?` as the placeholder in each condition. */
export class Where {
  private parts: string[] = [];
  readonly params: unknown[] = [];

  add(cond: string, ...vals: unknown[]) {
    let i = 0;
    this.parts.push(cond.replace(/\?/g, () => {
      this.params.push(vals[i++]);
      return `$${this.params.length}`;
    }));
    return this;
  }

  /** `(col1 ilike ? or col2 ilike ? …)` for a free-text needle. Dashes/spaces are ignored for plate-like columns. */
  search(needle: string, cols: string[], plateCols: string[] = []) {
    if (!needle) return this;
    const like = `%${needle.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    const compact = `%${needle.replace(/[\s-]/g, '').replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    const ors = [
      ...cols.map((c) => `${c} ilike ?`),
      ...plateCols.map((c) => `replace(replace(${c}, '-', ''), ' ', '') ilike ?`),
    ];
    return this.add(`(${ors.join(' or ')})`, ...cols.map(() => like), ...plateCols.map(() => compact));
  }

  /** Date range on one column: from <= col < to. */
  range(col: string, from?: Date, to?: Date) {
    if (from) this.add(`${col} >= ?`, from);
    if (to) this.add(`${col} < ?`, to);
    return this;
  }

  /** Date range matched by any of several columns (e.g. a car that came in OR left in the period). */
  rangeAny(cols: string[], from?: Date, to?: Date) {
    if (!from && !to) return this;
    const one = (c: string) => [from && `${c} >= ?`, to && `${c} < ?`].filter(Boolean).join(' and ');
    const vals = cols.flatMap(() => [from, to].filter(Boolean));
    return this.add(`(${cols.map((c) => `(${one(c)})`).join(' or ')})`, ...vals);
  }

  /** Gov sees everything (optionally one operator); operator/staff only their own. */
  scope(col: string, u: SessionUser, operatorId: string) {
    if (u.role === 'gov') {
      if (operatorId === 'none') this.add(`${col} is null`);
      else if (operatorId) this.add(`${col} = ?`, operatorId);
    } else this.add(`${col} = ?`, u.operatorId ?? '');
    return this;
  }

  get sql() {
    return this.parts.length ? `where ${this.parts.join(' and ')}` : '';
  }

  /** Placeholder for the next param (for LIMIT/OFFSET). */
  next(v: unknown) {
    this.params.push(v);
    return `$${this.params.length}`;
  }
}

/** Pick an ORDER BY from a whitelist (first entry is the default). */
export function orderBy(sort: string, options: Record<string, string>) {
  return options[sort] ?? Object.values(options)[0];
}

/** Standard paged response: rows carry `total_count` from `count(*) over()`. */
export function paged<T>(rows: any[], map: (r: any) => T) {
  return { items: rows.map(map), total: rows.length ? Number(rows[0].total_count) : 0 };
}
