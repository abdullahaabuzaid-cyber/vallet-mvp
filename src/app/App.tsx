import { useEffect } from 'react';
import { AppLayout } from '@/shared/components/layout/AppLayout';
import { refresh, useStore } from '@/store';
import { AppRoutes } from './routes';

export default function App() {
  const loaded = useStore((s) => s.loaded);

  useEffect(() => {
    void refresh();
  }, []);

  if (!loaded) {
    return (
      <div className="splash" aria-busy="true">
        <div className="brand-mark" aria-hidden>
          <span className="brand-mark-letter">ف</span>
        </div>
        <span className="muted">جارٍ التحميل…</span>
      </div>
    );
  }

  return (
    <AppLayout>
      <AppRoutes />
    </AppLayout>
  );
}
