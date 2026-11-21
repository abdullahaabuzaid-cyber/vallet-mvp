import { publish, type RtEvent } from './sse.ts';

/** Notify an operator's users (operator + staff) and the gov portal. */
export function notifyOperator(operatorId: string | null | undefined, ev: RtEvent) {
  publish({ operatorId, gov: true }, ev);
}
