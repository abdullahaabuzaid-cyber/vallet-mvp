import { Component, type ReactNode } from 'react';

/** Last-resort UI when rendering throws. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
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
