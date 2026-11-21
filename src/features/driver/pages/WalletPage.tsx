import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/shared/lib/api';
import { toast } from '@/shared/lib/toast';
import { useResource } from '@/shared/hooks/useResource';
import { formatDateTime, formatJod } from '@/shared/lib/format';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { useStore } from '@/store';
type Plan = { name: string; price: number; benefit: string };
type W = { balance: number; entries: { id: number; kind: string; amount: number; note: string; created_at: string }[]; subscription: { plan: string; ends_at: string } | null; plans: Record<string, Plan> };
const KIND: Record<string, string> = { topup: 'شحن', tip: 'إكرامية', subscription: 'اشتراك' };
export default function WalletPage() {
  const auth = useStore((s) => s.driverAuth);
  const { data, reload } = useResource<W>('/api/wallet', { balance: 0, entries: [], subscription: null, plans: {} });
  const [amount, setAmount] = useState('10'), [card, setCard] = useState('4242 4242 4242 4242'), [expiry, setExpiry] = useState('12/30'), [cvc, setCvc] = useState('123');
  if (!auth?.verified) return <div className="phone-shell"><div className="card"><h2>المحفظة</h2><p className="muted">سجّل الدخول برقم هاتفك أولاً.</p><Link to="/driver/auth" className="btn btn-primary">تسجيل الدخول</Link></div></div>;
  const act = async (fn: () => Promise<unknown>, msg: string) => { try { await fn(); await reload(); toast(msg, { tone: 'ok' }); } catch (e) { toast((e as Error).message, { tone: 'bad' }); } };
  return <div className="phone-shell stack">
    <div className="card wallet-hero"><div className="muted">رصيد المحفظة</div><div className="wallet-balance" data-testid="wallet-balance">{formatJod(data.balance)}</div><span className="demo-pill">وضع تجريبي — لا تُخصم أموال حقيقية</span></div>
    <form className="card stack" onSubmit={(e) => { e.preventDefault(); void act(() => api('/api/wallet/topup', { amount: Number(amount), cardNumber: card, expiry, cvc }), 'تم شحن المحفظة'); }}>
      <h3>شحن المحفظة</h3>
      <div className="row">{['5', '10', '20'].map((n) => <button key={n} type="button" className={`btn btn-sm ${amount === n ? 'btn-primary' : ''}`} onClick={() => setAmount(n)}>{n} د.أ</button>)}</div>
      <input aria-label="مبلغ الشحن" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
      <input aria-label="رقم البطاقة" value={card} onChange={(e) => setCard(e.target.value)} dir="ltr" />
      <div className="grid-2"><input aria-label="تاريخ الانتهاء" value={expiry} onChange={(e) => setExpiry(e.target.value)} dir="ltr" /><input aria-label="CVC" value={cvc} onChange={(e) => setCvc(e.target.value)} dir="ltr" /></div>
      <button className="btn btn-primary" type="submit">شحن الآن</button>
    </form>
    <div className="card stack"><h3>الاشتراك الشهري</h3>
      {data.subscription ? <div className="notice">باقتك الحالية: <strong>{data.plans[data.subscription.plan]?.name}</strong> حتى {formatDateTime(data.subscription.ends_at)}</div> :
        <div className="plan-grid">{Object.entries(data.plans).map(([k, p]) => <div key={k} className="plan-card"><strong>{p.name}</strong><div className="wallet-price">{formatJod(p.price)} / شهر</div><p className="muted tiny">{p.benefit}</p><button type="button" className="btn btn-sm btn-primary" onClick={() => void act(() => api('/api/wallet/subscribe', { plan: k }), `تم الاشتراك بباقة ${p.name}`)}>اشترك من المحفظة</button></div>)}</div>}
    </div>
    <div className="card"><h3>الحركات</h3>{data.entries.length ? <ul className="activity-list">{data.entries.map((e) => <li key={e.id}><span>{KIND[e.kind] || e.kind} · {e.note}</span><strong dir="ltr" className={e.amount < 0 ? 'neg' : 'pos'}>{e.amount > 0 ? '+' : ''}{e.amount.toFixed(3)}</strong><small className="muted">{formatDateTime(e.created_at)}</small></li>)}</ul> : <EmptyState title="لا حركات بعد" icon="wallet" description="اشحن المحفظة لتدفع الإكراميات والاشتراك." />}</div>
  </div>;
}
