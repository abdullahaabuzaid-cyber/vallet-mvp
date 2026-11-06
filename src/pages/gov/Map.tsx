import { useMemo } from 'react';
import { LotsMap } from '../../components/LotsMap';
import { allLotsForMap, unlicensedPins, useStore } from '../../store/useStore';

export default function GovMap() {
  const opSig = useStore((s) =>
    s.operators.map((o) => `${o.id}:${o.status}:${o.sites.length}`).join('|')
  );
  const incSig = useStore((s) =>
    s.incidents
      .filter((i) => i.type === 'unlicensed')
      .map((i) => `${i.id}:${i.status}:${i.lat}`)
      .join('|')
  );

  const lots = useMemo(() => allLotsForMap(), [opSig]);
  const unlicensed = useMemo(() => unlicensedPins(), [incSig]);

  const licensed = lots.filter((l) => l.status === 'approved').length;
  const pending = lots.filter((l) => l.status === 'pending').length;
  const suspended = lots.filter((l) => l.status === 'suspended').length;

  return (
    <>
      <div className="tiles">
        <div className="tile">
          <div className="n">{licensed}</div>
          <div className="l">مواقع مرخّصة</div>
        </div>
        <div className="tile">
          <div className="n">{pending}</div>
          <div className="l">قيد المراجعة</div>
        </div>
        <div className="tile">
          <div className="n">{suspended}</div>
          <div className="l">موقوفة</div>
        </div>
        <div className="tile">
          <div className="n">{unlicensed.length}</div>
          <div className="l">بلاغات غير مرخّصة</div>
        </div>
      </div>

      <div className="card">
        <h2>خريطة المواقف المعتمدة</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          جميع مواقع الفاليه في عمّان حسب حالة الترخيص، مع بلاغات الفاليه غير المرخّص على الخريطة.
        </p>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <LotsMap mode="gov" lots={lots} unlicensed={unlicensed} />
      </div>
    </>
  );
}
