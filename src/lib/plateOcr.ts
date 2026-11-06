import { createWorker, type Worker } from 'tesseract.js';

let workerPromise: Promise<Worker> | null = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker('eng', 1, {
        workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js',
        corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1/tesseract-core.wasm.js',
        langPath: 'https://tessdata.projectnaptha.com/4.0.0',
        logger: () => {},
      });
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ- ',
      });
      return worker;
    })();
  }
  return workerPromise;
}

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const EASTERN = '۰۱۲۳۴۵۶۷۸۹';

export function normalizeJordanPlate(raw: string): string | null {
  let s = raw.toUpperCase().replace(/[\u064B-\u065F]/g, '');
  s = s.replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)));
  s = s.replace(/[۰-۹]/g, (d) => String(EASTERN.indexOf(d)));
  s = s.replace(/[^A-Z0-9\-\s]/g, ' ').replace(/\s+/g, ' ').trim();

  const dashed = s.match(/\b(\d{1,2})\s*[-–]?\s*(\d{4,7})\b/);
  if (dashed) return `${dashed[1]}-${dashed[2]}`;

  const letters = s.match(/\b([A-Z]{1,3})\s*[-–]?\s*(\d{3,6})\b/);
  if (letters) return `${letters[1]}-${letters[2]}`;

  const digits = s.replace(/\D/g, '');
  if (digits.length >= 5 && digits.length <= 9) {
    return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  }
  return null;
}

export async function recognizePlateFromImage(source: HTMLCanvasElement | string | File | Blob): Promise<{
  raw: string;
  plate: string | null;
}> {
  const worker = await getWorker();
  const { data } = await worker.recognize(source);
  const raw = data.text || '';
  return { raw, plate: normalizeJordanPlate(raw) };
}

export function demoPlateFallback(): string {
  const n = String(Math.floor(10000 + Math.random() * 89999));
  const p = String(10 + Math.floor(Math.random() * 40));
  return `${p}-${n}`;
}
