/**
 * eMachine client.
 *   Reads:  GET  {queryPath}?query=<base64 SQL>
 *   Writes: POST {tablePath} with form fields (Id present = update, absent = insert)
 * Both send `Authorization: Bearer <token>`.
 */
import { apexConfig } from './apexConfig';
import { storage } from './storage';

const cfg = apexConfig.emachine;

export class ApiError extends Error {
  constructor(message, { status = 0, problems = [] } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.problems = problems;
  }
}

export class WritesDisabledError extends ApiError {
  constructor(requests) {
    super('Read-only mode: saving to eMachine is turned off (VITE_EMACHINE_WRITES). Nothing was sent.');
    this.name = 'WritesDisabledError';
    this.requests = requests;
  }
}

const listeners = new Set();
/** Subscribe to 401/403 responses (the app returns to the sign-in screen). */
export const onUnauthorized = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const getToken = () => cfg.token || storage.get(apexConfig.storageKeys.token, '');
export const setToken = (token) =>
  token ? storage.set(apexConfig.storageKeys.token, token) : storage.remove(apexConfig.storageKeys.token);

/** Base64 of UTF-8 text (btoa alone only handles Latin-1). */
export function encodeQuery(sql) {
  const bytes = new TextEncoder().encode(sql);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

/** Quote a value for a single-quoted SQL string (MySQL escaping). */
export const sqlString = (value) => `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;

/** Integer ids only: never let anything else into a query. */
export function sqlInt(value) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0) throw new ApiError(`Invalid id: ${value}`);
  return String(n);
}

/** The API may return a bare array or wrap it in an envelope. */
export function extractRows(body) {
  if (Array.isArray(body)) return body.filter((r) => r && typeof r === 'object');
  if (body && typeof body === 'object') {
    for (const key of ['data', 'rows', 'result', 'results', 'records', 'items']) {
      const v = body[key];
      if (Array.isArray(v)) return v.filter((r) => r && typeof r === 'object');
      if (v && typeof v === 'object') {
        const nested = extractRows(v);
        if (nested.length) return nested;
      }
    }
  }
  return [];
}

async function send(url, init, signal) {
  const headers = { Accept: 'application/json', ...init.headers };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new DOMException('timeout', 'TimeoutError')), cfg.timeoutMs);
  signal?.addEventListener('abort', () => ctrl.abort(signal.reason), { once: true });
  let res;
  try {
    res = await fetch(url, { ...init, headers, signal: ctrl.signal });
  } catch (e) {
    if (signal?.aborted) throw e;
    throw new ApiError(ctrl.signal.reason?.name === 'TimeoutError'
      ? 'eMachine took too long to respond'
      : 'Can’t reach eMachine. Check your connection.');
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 401 || res.status === 403) {
    listeners.forEach((fn) => fn());
    throw new ApiError('eMachine rejected the access token. Sign in again.', { status: res.status });
  }
  if (!res.ok) throw new ApiError(`eMachine returned an error (${res.status})`, { status: res.status });
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Run a named query from config with parameters already made SQL-safe by the caller. */
export function sql(name, params = {}) {
  const template = cfg.queries[name];
  if (!template) throw new ApiError(`No query configured for “${name}”`);
  return template.replace(/\{(\w+)\}/g, (_, k) => {
    if (!(k in params)) throw new ApiError(`Query “${name}” needs {${k}}`);
    return params[k];
  });
}

export async function query(name, params, signal) {
  const url = `${cfg.baseUrl}${cfg.queryPath}?query=${encodeURIComponent(encodeQuery(sql(name, params)))}`;
  const body = await send(url, { method: 'GET' }, signal);
  if (typeof body === 'string') throw new ApiError('eMachine returned an unexpected response');
  return extractRows(body);
}

/** Build the form body for a table write, keeping only allow-listed fields. */
export function writeRequest(table, fields) {
  const allowed = cfg.writes[table];
  if (!allowed) throw new ApiError(`Saving to ${table} isn’t configured`);
  const body = new URLSearchParams();
  for (const key of ['Id', 'tag_id', ...allowed]) {
    const v = fields[key];
    if (v !== undefined && v !== null) body.append(key, String(v));
  }
  return { method: 'POST', url: `${cfg.baseUrl}${cfg.tablePath.replace('{table}', table)}`, table, body: body.toString() };
}

/** Send prepared writes in order. Refuses (and logs) when writes are disabled. */
export async function runWrites(requests) {
  if (!requests.length) return [];
  if (!cfg.writesEnabled) {
    console.info('[read-only] eMachine writes that would have been sent:', requests);
    throw new WritesDisabledError(requests);
  }
  const results = [];
  for (const r of requests) {
    results.push(await send(r.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'eml-service': 'True' },
      body: r.body,
    }));
  }
  return results;
}

/**
 * Delete one row, the way the existing app does: a `delete from <table> where Id='…'` statement sent through
 * the model_query GET. `table` must come from the app's own allow-list, never from user input.
 */
export async function runDelete(table, id) {
  const statement = sql('deleteLine', { table, id: sqlString(sqlInt(id)) });
  // Same bytes as the existing app: base64 without trailing '=' padding.
  const url = `${cfg.baseUrl}${cfg.queryPath}?query=${encodeURIComponent(encodeQuery(statement).replace(/=+$/, ''))}`;
  if (!cfg.writesEnabled) {
    console.info('[read-only] eMachine delete that would have been sent:', url, statement);
    throw new WritesDisabledError([{ method: 'GET', url, table, statement }]);
  }
  await send(url, { method: 'GET', headers: { 'eml-service': 'True' } });
}

/** Find a new row's Id in an insert response, whatever envelope eMachine uses. */
export function insertedId(response) {
  if (response == null) return null;
  if (typeof response === 'number') return response;
  if (typeof response === 'string') return /^\d+$/.test(response.trim()) ? Number(response.trim()) : null;
  for (const key of ['Id', 'id', 'ID', 'insertId', 'insert_id', 'lastrowid', 'lastInsertId']) {
    if (Number.isSafeInteger(Number(response[key])) && response[key] !== '' && response[key] != null) return Number(response[key]);
  }
  for (const key of ['data', 'result', 'record', 'row']) {
    const nested = insertedId(Array.isArray(response[key]) ? response[key][0] : response[key]);
    if (nested != null) return nested;
  }
  return null;
}

/** Decode a JWT's claims for display (no verification; eMachine verifies). */
export function tokenClaims(token = getToken()) {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(decodeURIComponent(escape(atob(part + '='.repeat((4 - (part.length % 4)) % 4)))));
    return { ...claims, ...(claims.payload || {}) };
  } catch {
    return {};
  }
}
