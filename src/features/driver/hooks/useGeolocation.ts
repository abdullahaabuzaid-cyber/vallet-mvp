import { useEffect, useState } from 'react';
import { DEMO_AMMAN_PIN } from '@/shared/constants/demo';

export type GeoState =
  | { status: 'loading' }
  | { status: 'ok'; lat: number; lng: number; source: 'gps' | 'demo' }
  | { status: 'error'; lat: number; lng: number; source: 'demo'; reason: string };

/** Browser GPS position, falling back to a demo Amman pin when unavailable or denied. */
export function useGeolocation() {
  const [geo, setGeo] = useState<GeoState>({ status: 'loading' });

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeo({
        status: 'error',
        lat: DEMO_AMMAN_PIN.lat,
        lng: DEMO_AMMAN_PIN.lng,
        source: 'demo',
        reason: 'المتصفح لا يدعم تحديد الموقع',
      });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({
          status: 'ok',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          source: 'gps',
        });
      },
      (err) => {
        setGeo({
          status: 'error',
          lat: DEMO_AMMAN_PIN.lat,
          lng: DEMO_AMMAN_PIN.lng,
          source: 'demo',
          reason: err.message || 'تم رفض إذن الموقع',
        });
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 }
    );
  }, []);

  return geo;
}
