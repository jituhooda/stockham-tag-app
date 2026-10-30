const API_URL = import.meta.env.VITE_API_URL || '/datamodel/api/model_query';
const API_TOKEN = import.meta.env.VITE_API_TOKEN || '';

export type Row = Record<string, unknown>;

/** Base64-encode a UTF-8 string (btoa alone only handles Latin-1). */
export function encodeQuery(sql: string): string {
  const bytes = new TextEncoder().encode(sql);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

/** Escape a value for use inside a single-quoted SQL literal. */
export function sqlString(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
}

export class ApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

/** The API may wrap rows in an envelope; find the array wherever it lives. */
function extractRows(body: unknown): Row[] {
  if (Array.isArray(body)) return body as Row[];
  if (body && typeof body === 'object') {
    const obj = body as Record<string, unknown>;
    for (const key of ['data', 'rows', 'result', 'results', 'records', 'items']) {
      const val = obj[key];
      if (Array.isArray(val)) return val as Row[];
      if (val && typeof val === 'object') {
        const nested = extractRows(val);
        if (nested.length) return nested;
      }
    }
  }
  return [];
}

export async function runQuery(sql: string, signal?: AbortSignal): Promise<Row[]> {
  const url = `${API_URL}?query=${encodeURIComponent(encodeQuery(sql))}`;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

  const res = await fetch(url, { headers, signal });
  if (!res.ok) throw new ApiError(`Request failed (${res.status})`, res.status);
  const text = await res.text();
  try {
    return extractRows(JSON.parse(text));
  } catch {
    throw new ApiError('Unexpected response from server');
  }
}
