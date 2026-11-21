import { DEMO_ACTIVITY } from './activity.ts';
import { DEMO_OPERATORS } from './operators.ts';

/** Demo dataset inserted on first boot and by the gov "reset demo" button. */
export const DEMO_DATA = { operators: DEMO_OPERATORS, ...DEMO_ACTIVITY };
