import { useEffect, useState } from 'react';
import { confirmPayment, formatJod, startCheckout } from '../store/useStore';
import type { Invoice } from '../types';

/** Mock card gateway — TEST MODE only, no real charge. */
export function PaymentModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const [ref, setRef] = useState('');
  const [card, setCard] = useState('4242 4242 4242 4242');
  const [expiry, setExpiry] = useState('12/28');
  const [cvc, setCvc] = useState('123');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');

  useEffect(() => {
    let alive = true;
    startCheckout(invoice.id)
      .then((r) => alive && setRef(r.ref))
      .catch((e) => alive && setError((e as Error).message));
    return () => {
      alive = false;
    };
  }, [invoice.id]);

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await confirmPayment(ref, { cardNumber: card, expiry, cvc, name });
      setDone(r.ref);
    } catch (err) {
      setError((err as Error).message);
      // a declined attempt consumes the intent — open a fresh one
      startCheckout(invoice.id).then((r) => setRef(r.ref)).catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="drawer-backdrop modal-center" onClick={onClose}>
      <div className="pay-modal card" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="الدفع">
        <div className="test-mode-banner">وضع تجريبي — بوابة دفع وهمية، لن يتم خصم أي مبلغ حقيقي</div>
        <h3 style={{ marginBottom: 4 }}>دفع الفاتورة {invoice.number}</h3>
        <div className="muted">{invoice.description}</div>
        <div className="pay-amount">{formatJod(invoice.amount)}</div>
        {done ? (
          <div className="stack">
            <div className="reg-alert ok">تم الدفع بنجاح ✓ مرجع العملية: <span dir="ltr">{done}</span></div>
            <div className="row">
              <a className="btn" href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer">
                تنزيل الفاتورة PDF
              </a>
              <button type="button" className="btn btn-primary" onClick={onClose}>
                إغلاق
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={pay} className="stack">
            <div className="field">
              <label htmlFor="pay-name">الاسم على البطاقة</label>
              <input id="pay-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="pay-card">رقم البطاقة</label>
              <input id="pay-card" value={card} onChange={(e) => setCard(e.target.value)} dir="ltr" inputMode="numeric" required />
            </div>
            <div className="grid2">
              <div className="field">
                <label htmlFor="pay-exp">الانتهاء (MM/YY)</label>
                <input id="pay-exp" value={expiry} onChange={(e) => setExpiry(e.target.value)} dir="ltr" required />
              </div>
              <div className="field">
                <label htmlFor="pay-cvc">CVC</label>
                <input id="pay-cvc" value={cvc} onChange={(e) => setCvc(e.target.value)} dir="ltr" inputMode="numeric" required />
              </div>
            </div>
            <div className="muted tiny">
              بطاقات الاختبار: <span dir="ltr">4242 4242 4242 4242</span> تنجح · <span dir="ltr">4000 0000 0000 0002</span> تُرفض
            </div>
            {error && <div className="reg-alert bad">{error}</div>}
            <div className="row">
              <button type="submit" className="btn btn-primary" disabled={busy || !ref}>
                {busy ? 'جارٍ المعالجة…' : `ادفع ${formatJod(invoice.amount)}`}
              </button>
              <button type="button" className="btn" onClick={onClose}>
                إلغاء
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
