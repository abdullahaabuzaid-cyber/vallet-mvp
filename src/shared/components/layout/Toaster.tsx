import { useNavigate } from 'react-router-dom';
import { dismissToast, useToasts } from '@/shared/lib/toast';

export function Toaster() {
  const toasts = useToasts();
  const nav = useNavigate();
  if (!toasts.length) return null;
  return (
    <div className="toaster" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast-item tone-${t.tone}`}
          onClick={() => {
            if (t.link) nav(t.link);
            dismissToast(t.id);
          }}
        >
          <strong>{t.title}</strong>
          {t.body && <span>{t.body}</span>}
        </div>
      ))}
    </div>
  );
}
