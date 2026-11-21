import { useState } from 'react';
import { documentFileUrl, reviewDocument } from '@/store';
import type { Document } from '@common/types';

/** File link + per-document accept/reject for the authority. */
export function DocReview({ doc }: { doc: Document }) {
  const url = documentFileUrl(doc);
  const [note, setNote] = useState('');
  const [rejecting, setRejecting] = useState(false);
  return (
    <div className="doc-review">
      {doc.fileName && (
        <div className="muted">
          📎{' '}
          {url ? (
            <a href={url} target="_blank" rel="noreferrer" className="link">
              {doc.fileName} — عرض الملف
            </a>
          ) : (
            <span title="ملف تجريبي بدون محتوى مرفوع">{doc.fileName} (تجريبي)</span>
          )}
        </div>
      )}
      {doc.note && <div className="muted tiny">{doc.note}</div>}
      {doc.dbId && doc.status !== 'missing' && (
        <div className="row" style={{ marginTop: 6 }}>
          {doc.status !== 'accepted' && (
            <button type="button" className="btn btn-sm btn-success" onClick={() => void reviewDocument(doc.dbId!, 'accepted')}>
              قبول المستند
            </button>
          )}
          {doc.status !== 'rejected' &&
            (rejecting ? (
              <>
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="سبب الرفض" style={{ maxWidth: 160 }} />
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={() => {
                    void reviewDocument(doc.dbId!, 'rejected', note || 'غير مطابق');
                    setRejecting(false);
                  }}
                >
                  تأكيد الرفض
                </button>
              </>
            ) : (
              <button type="button" className="btn btn-sm" onClick={() => setRejecting(true)}>
                رفض
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
