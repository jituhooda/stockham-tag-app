/**
 * Autodesk Forma project lookup, called straight from the browser (Autodesk allows it):
 *   GET {apiBase}{projectsPath}?filter[jobNumber]=<job no>   Authorization: Bearer <Autodesk token>
 * A job should have a Forma project (non-empty `results`); the caller turns "none" into a warning.
 *
 * The Autodesk token is short-lived. It is fetched on demand from `forma.tokenUrl`
 * ({ access_token, expires_at } in epoch seconds, no login), kept in memory until shortly before
 * it expires, and renewed once if Autodesk rejects it anyway. It is never stored on disk.
 * This uses its own fetch (not the eMachine client) so a Forma problem never signs the user out.
 */
import { apexConfig } from './apexConfig';
import { ApiError } from './apexHttp';

const cfg = apexConfig.forma;
const EXPIRY_MARGIN_S = 60;

let cached = null; // { token, expiresAt }
let inflight = null;

const timeout = () => AbortSignal.timeout(apexConfig.emachine.timeoutMs);

async function fetchToken() {
  let res;
  try {
    res = await fetch(cfg.tokenUrl, { headers: { Accept: 'application/json' }, signal: timeout() });
  } catch {
    throw new ApiError('Can’t get an Autodesk token. Check your connection.');
  }
  if (!res.ok) throw new ApiError(`The Autodesk token service returned an error (${res.status})`, { status: res.status });
  let body;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  const token = body?.access_token;
  if (!token || typeof token !== 'string') throw new ApiError('The Autodesk token service returned an unexpected response');
  const expiresAt = Number(body.expires_at);
  return { token, expiresAt: Number.isFinite(expiresAt) ? expiresAt : Date.now() / 1000 + 300 };
}

/** A valid Autodesk token: the cached one, or a fresh one when missing, expired or forced. */
export async function getFormaToken({ force = false } = {}) {
  if (!cfg.tokenUrl) throw new ApiError('The Autodesk token service isn’t configured (forma.tokenUrl).');
  const fresh = cached && cached.expiresAt - EXPIRY_MARGIN_S > Date.now() / 1000;
  if (!force && fresh) return cached.token;
  inflight ??= fetchToken().then((t) => (cached = t)).finally(() => { inflight = null; });
  return (await inflight).token;
}

export const clearFormaToken = () => { cached = null; };

async function requestProjects(jobNo, token, signal) {
  const path = cfg.projectsPath.replace('{accountId}', encodeURIComponent(cfg.accountId));
  const url = `${cfg.apiBase}${path}?${cfg.jobFilter}=${encodeURIComponent(jobNo)}`;
  try {
    return await fetch(url, { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }, signal: signal ?? timeout() });
  } catch {
    throw new ApiError('Can’t reach Autodesk Forma. Check your connection.');
  }
}

export async function formaProjectExists(jobNo, signal) {
  let res = await requestProjects(jobNo, await getFormaToken(), signal);
  if (res.status === 401 || res.status === 403) {
    // Expired or revoked early: get a new token and try once more.
    res = await requestProjects(jobNo, await getFormaToken({ force: true }), signal);
  }
  if (res.status === 401 || res.status === 403) {
    throw new ApiError('Autodesk Forma rejected the token. Contact the Office.', { status: res.status });
  }
  if (!res.ok) throw new ApiError(`Autodesk Forma returned an error (${res.status})`, { status: res.status });

  let body;
  try {
    body = await res.json();
  } catch {
    throw new ApiError('Autodesk Forma returned an unexpected response');
  }
  if (!body || !Array.isArray(body.results)) throw new ApiError('Autodesk Forma returned an unexpected response');
  return body.results.length > 0;
}
