import { Link } from 'react-router-dom';
import { api } from '@/shared/lib/api';
import { toast } from '@/shared/lib/toast';
import { useResource } from '@/shared/hooks/useResource';
type W = { balance: number; tips: { visit_id: string; amount: number }[] };
/** E-tip from the (mock) wallet to the staff member who handed the car back. */
export function TipBox({ visitId, staffName }: { visitId: string; staffName: string }) {
  const { data, reload } = useResource<W>('/api/wallet', { balance: 0, tips: [] });
  const sent = data.tips.find((t) => t.visit_id === visitId);
  if (sent) return <div className="tip-box">أرسلت إكرامية {sent.amount.toFixed(3)} د.أ إلى {staffName} — شكراً!</div>;
  async function send(amount: number) {
    try { await api('/api/wallet/tip', { visitId, amount }); await reload(); toast(`وصلت الإكرامية إلى ${staffName}`, { tone: 'ok' }); }
    catch (e) { toast((e as Error).message, { tone: 'bad' }); }
  }
  return <div className="tip-box" data-testid="tip-box">
    <div className="muted tiny">إكرامية إلكترونية لـ <strong>{staffName}</strong> · رصيدك {data.balance.toFixed(3)} د.أ</div>
    <div className="row">{[0.5, 1, 2].map((n) => <button key={n} type="button" className="btn btn-sm" onClick={() => void send(n)}>{n} د.أ</button>)}<Link className="btn btn-sm btn-ghost" to="/driver/wallet">شحن المحفظة</Link></div>
  </div>;
}
