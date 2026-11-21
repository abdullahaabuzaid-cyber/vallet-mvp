export type BadgeTone = 'ok' | 'warn' | 'bad' | 'info' | 'default';

export function Badge({ tone = 'default', children }: { tone?: BadgeTone; children: React.ReactNode }) {
  return <span className={`badge ${tone === 'default' ? '' : tone}`}>{children}</span>;
}
