import { Component, type ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-screen" dir="rtl">
          <div className="card" style={{ maxWidth: 420, margin: '48px auto' }}>
            <h2>حدث خطأ في الواجهة</h2>
            <p className="muted">{this.state.error.message}</p>
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => {
                window.location.href = '/';
              }}
            >
              إعادة تشغيل التطبيق
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Old localStorage-only demo data is no longer used — data lives on the server now.
try {
  for (let i = 1; i <= 8; i++) localStorage.removeItem(`vallet-mvp-v${i}`);
} catch {
  /* private mode */
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);
