import { useState } from 'react';
import { api } from '@/shared/lib/api';
import { toast } from '@/shared/lib/toast';
import { useResource } from '@/shared/hooks/useResource';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { formatDateTime } from '@/shared/lib/format';
import { FineForm } from '../components/FineForm';
import { FineTable, type Fine } from '@/features/gov/pages/FieldFinesPage';
type Task = { id: number; note: string; lat: number; lng: number; status: string; inspection_note?: string; created_at: string };
/** Field inspector (mobile-first): assigned public reports, instant fines with photo, my fines. */
export default function InspectorPage() {
  const [tab, setTab] = useState<'tasks' | 'fine' | 'mine'>('tasks');
  const [finingFor, setFiningFor] = useState<number | undefined>();
  const tasks = useResource<{ items: Task[] }>('/api/inspector/tasks', { items: [] });
  const fines = useResource<{ items: Fine[] }>('/api/field-fines?limit=50', { items: [] });
  const [notes, setNotes] = useState<Record<number, string>>({});
  const verify = async (id: number) => { try { await api(`/api/inspector/tasks/${id}/verify`, { note: notes[id] || '' }); await tasks.reload(); toast('تم إرسال نتيجة المعاينة للهيئة', { tone: 'ok' }); } catch (e) { toast((e as Error).message, { tone: 'bad' }); } };
  return <div className="staff-page stack">
    <div className="segmented inspector-tabs" role="tablist">{([['tasks', `المهام (${tasks.data.items.filter((t) => t.status === 'assigned').length})`], ['fine', 'مخالفة فورية'], ['mine', 'مخالفاتي']] as const).map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
    {tab === 'tasks' && (tasks.data.items.length ? tasks.data.items.map((t) => <article key={t.id} className="card stack" data-testid="inspector-task">
      <img className="report-photo" src={`/api/public-reports/${t.id}/inspector-file`} alt="صورة البلاغ" />
      <div className="row" style={{ justifyContent: 'space-between' }}><strong>بلاغ #{t.id}</strong><span className="badge">{t.status === 'assigned' ? 'بانتظار المعاينة' : t.status === 'verified' ? 'تم التحقق' : t.status}</span></div>
      <p>{t.note}</p><small className="muted">{formatDateTime(t.created_at)}</small>
      <a className="btn btn-sm" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${t.lat},${t.lng}`}>فتح الموقع بالخريطة</a>
      {t.status === 'assigned' ? <><input aria-label="نتيجة المعاينة" value={notes[t.id] || ''} onChange={(e) => setNotes({ ...notes, [t.id]: e.target.value })} placeholder="نتيجة المعاينة" /><div className="row"><button className="btn btn-success" type="button" onClick={() => void verify(t.id)}>تأكيد المخالفة</button><button className="btn" type="button" onClick={() => { setFiningFor(t.id); setTab('fine'); }}>مخالفة فورية</button></div></> : <small>{t.inspection_note}</small>}
    </article>) : <div className="card"><EmptyState title="لا مهام مسندة" icon="pin" description="البلاغات اللي تسندها الهيئة إلك بتظهر هون." /></div>)}
    {tab === 'fine' && <FineForm reportId={finingFor} onDone={() => { void fines.reload(); setTab('mine'); }} />}
    {tab === 'mine' && <div className="card">{fines.data.items.length ? <FineTable items={fines.data.items} /> : <EmptyState title="لا مخالفات بعد" icon="shield" />}</div>}
  </div>;
}
