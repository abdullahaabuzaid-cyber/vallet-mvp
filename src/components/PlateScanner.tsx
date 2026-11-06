import { useEffect, useRef, useState } from 'react';
import { demoPlateFallback, recognizePlateFromImage } from '../lib/plateOcr';

type Props = {
  onPlate: (plate: string, meta: { source: 'ocr' | 'demo' | 'manual'; raw?: string }) => void;
  busy?: boolean;
};

export function PlateScanner({ onPlate, busy }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState('وجّه الكاميرا نحو لوحة السيارة');
  const [preview, setPreview] = useState<string | null>(null);
  const [manual, setManual] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function startCamera() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
      setStatus('جاهز — اضغط صوّر النمرة');
    } catch {
      setError('تعذّر فتح الكاميرا — استخدم رفع صورة أو الإدخال اليدوي');
      setCameraOn(false);
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  async function runOcr(source: HTMLCanvasElement | File | Blob) {
    setScanning(true);
    setStatus('جاري قراءة اللوحة (OCR)…');
    setError('');
    try {
      const result = await recognizePlateFromImage(source);
      if (result.plate) {
        setStatus(`تم التعرّف: ${result.plate}`);
        onPlate(result.plate, { source: 'ocr', raw: result.raw });
      } else {
        const fallback = demoPlateFallback();
        setStatus('تعذّر قراءة واضحة — جرّب يدوياً أو استخدم اقتراح تجريبي');
        setError(`النص المقروء: ${(result.raw || '—').slice(0, 80)}`);
        setManual(fallback);
      }
    } catch (e) {
      setError('فشل OCR — استخدم الإدخال اليدوي');
      setStatus('خطأ في التعرّف');
      console.warn(e);
    } finally {
      setScanning(false);
    }
  }

  async function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    setPreview(canvas.toDataURL('image/jpeg', 0.85));
    await runOcr(canvas);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    await runOcr(file);
  }

  return (
    <div className="plate-scanner">
      <div className="plate-stage">
        {preview && !cameraOn ? (
          <img src={preview} alt="لقطة اللوحة" className="plate-preview" />
        ) : (
          <video ref={videoRef} className="plate-video" playsInline muted />
        )}
        {!cameraOn && !preview && (
          <div className="plate-placeholder">
            <div className="plate-icon">📷</div>
            <div>صوّر النمرة</div>
          </div>
        )}
        <canvas ref={canvasRef} hidden />
      </div>

      <div className="muted" style={{ margin: '8px 0' }}>{status}</div>
      {error && <div className="reg-alert bad">{error}</div>}

      <div className="row" style={{ marginTop: 8 }}>
        {!cameraOn ? (
          <button className="btn btn-primary" type="button" onClick={startCamera} disabled={busy || scanning}>
            فتح الكاميرا
          </button>
        ) : (
          <>
            <button className="btn btn-primary" type="button" onClick={capture} disabled={busy || scanning}>
              {scanning ? 'جاري القراءة…' : 'صوّر النمرة'}
            </button>
            <button className="btn" type="button" onClick={stopCamera}>
              إيقاف
            </button>
          </>
        )}
        <label className="btn upload-btn">
          رفع صورة
          <input
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => {
              void onFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>
      </div>

      <div className="field" style={{ marginTop: 12 }}>
        <label>إدخال يدوي (احتياطي)</label>
        <div className="row">
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="12-34567"
            style={{ flex: 1 }}
          />
          <button
            className="btn btn-primary"
            type="button"
            disabled={!manual.trim() || busy}
            onClick={() => onPlate(manual.trim(), { source: 'manual' })}
          >
            استخدم
          </button>
        </div>
      </div>
    </div>
  );
}
