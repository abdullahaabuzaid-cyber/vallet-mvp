import type { Document, DocStatus } from '@common/types';
import { Badge } from '@/shared/components/ui/Badge';
import { DOC_STATUS_LABELS } from '@/shared/constants/labels';
import { DocReview } from './DocReview';

function toneFor(status: DocStatus): 'ok' | 'warn' | 'bad' | 'info' | 'default' {
  if (status === 'accepted') return 'ok';
  if (status === 'uploaded' || status === 'expiring') return 'warn';
  if (status === 'missing' || status === 'rejected') return 'bad';
  return 'default';
}

/** Required documents with status and per-document review controls. */
export function DocChecklist({ docs }: { docs: Document[] }) {
  return (
    <div className="reg-checklist">
      {docs.map((d) => (
        <div key={d.id} className={`reg-item status-${d.status}`}>
          <div className="reg-item-main">
            <strong>{d.name}</strong>
            <Badge tone={toneFor(d.status)}>{DOC_STATUS_LABELS[d.status]}</Badge>
          </div>
          <DocReview doc={d} />
          {d.note && <div className="muted">{d.note}</div>}
        </div>
      ))}
    </div>
  );
}
