import { apexConfig } from './apexConfig';
import { storage } from './storage';

export class ApiError extends Error {
  constructor(message, { status = 0, problems = [], requestId = '' } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.problems = problems;
    this.requestId = requestId;
  }
}

const listeners = new Set();
/** Subscribe to 401 responses (the app shows the sign-in screen). */
export const onUnauthorized = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const getToken = () => storage.get(apexConfig.storageKeys.token, '');
export const setToken = (token) =>
  token ? storage.set(apexConfig.storageKeys.token, token) : storage.remove(apexConfig.storageKeys.token);

export function url(path, params) {
  const base = `${apexConfig.apiBaseUrl}${path.startsWith('/api') || path.startsWith('/health') ? '' : apexConfig.apiPrefix}${path}`;
  if (!params) return base;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v == null || v === '') continue;
    (Array.isArray(v) ? v : [v]).forEach((item) => qs.append(k, item));
  }
  const s = qs.toString();
  return s ? `${base}?${s}` : base;
}

/**
 * fetch() with auth, JSON handling, a timeout and uniform errors.
 * `body` may be a plain object (sent as JSON) or FormData.
 */
export async function request(path, { method = 'GET', params, body, signal, raw = false } = {}) {
  const headers = { Accept: 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload = body;
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new DOMException('Request timed out', 'TimeoutError')), apexConfig.requestTimeoutMs);
  signal?.addEventListener('abort', () => ctrl.abort(signal.reason), { once: true });

  let res;
  try {
    res = await fetch(url(path, params), { method, headers, body: payload, signal: ctrl.signal });
  } catch (e) {
    if (signal?.aborted) throw e;
    throw new ApiError(e?.name === 'TimeoutError' || ctrl.signal.reason?.name === 'TimeoutError'
      ? 'The server took too long to respond'
      : 'Can’t reach the server. Check your connection.');
  } finally {
    clearTimeout(timer);
  }

  const requestId = res.headers.get('X-Request-ID') || '';
  if (res.status === 401) listeners.forEach((fn) => fn());
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    let problems = [];
    try {
      const data = await res.json();
      detail = data.detail || detail;
      problems = data.problems || [];
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(detail, { status: res.status, problems, requestId });
  }
  if (raw) return res;
  if (res.status === 204) return null;
  return res.json();
}
