import { useRealtimeConnected } from '@/store';

/** Realtime connection indicator. */
export function LiveDot() {
  const live = useRealtimeConnected();
  return (
    <span className={`live-dot ${live ? 'on' : ''}`} title={live ? 'متصل — تحديثات فورية' : 'غير متصل'}>
      {live ? 'مباشر' : '…'}
    </span>
  );
}
