export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function handle<T>(r: Response): Promise<T> {
  const ct = r.headers.get('content-type') || '';
  const body = ct.includes('application/json') ? await r.json().catch(() => ({})) : {};
  if (!r.ok) throw new ApiError(r.status, (body as { error?: string }).error || `خطأ ${r.status}`);
  return body as T;
}

export async function api<T = any>(path: string, body?: unknown, method?: string): Promise<T> {
  let r: Response;
  try {
    r = await fetch(path, {
      method: method || (body === undefined ? 'GET' : 'POST'),
      credentials: 'same-origin',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'تعذّر الاتصال بالخادم — تحقّق من الإنترنت');
  }
  return handle<T>(r);
}

export async function apiForm<T = any>(path: string, form: FormData): Promise<T> {
  let r: Response;
  try {
    r = await fetch(path, { method: 'POST', credentials: 'same-origin', body: form });
  } catch {
    throw new ApiError(0, 'تعذّر الاتصال بالخادم — تحقّق من الإنترنت');
  }
  return handle<T>(r);
}
