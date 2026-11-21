/** One-time browser setup: drop legacy local demo data, register the service worker in production. */
export function setupBrowser() {
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
}
