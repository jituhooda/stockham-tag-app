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

/** GET a Forma URL with the Autodesk token; one retry with a fresh token if it is rejected. Resolves to the parsed JSON. */
async function formaGet(url, signal) {
  const attempt = async (token) => {
    try {
      return await fetch(url, { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }, signal: signal ?? timeout() });
    } catch (e) {
      if (signal?.aborted) throw e;
      throw new ApiError('Can’t reach Autodesk Forma. Check your connection.');
    }
  };
  let res = await attempt(await getFormaToken());
  if (res.status === 401 || res.status === 403) {
    // Expired or revoked early: get a new token and try once more.
    res = await attempt(await getFormaToken({ force: true }));
  }
  if (res.status === 401 || res.status === 403) {
    throw new ApiError('Autodesk Forma rejected the token. Contact the Office.', { status: res.status });
  }
  if (!res.ok) throw new ApiError(`Autodesk Forma returned an error (${res.status})`, { status: res.status });
  try {
    return await res.json();
  } catch {
    throw new ApiError('Autodesk Forma returned an unexpected response');
  }
}

/** The Forma project for a job number, or null when there is none. */
export async function formaFindProject(jobNo, signal) {
  const path = cfg.projectsPath.replace('{accountId}', encodeURIComponent(cfg.accountId));
  const body = await formaGet(`${cfg.apiBase}${path}?${cfg.jobFilter}=${encodeURIComponent(jobNo)}`, signal);
  if (!body || !Array.isArray(body.results)) throw new ApiError('Autodesk Forma returned an unexpected response');
  return body.results[0] || null;
}

export async function formaProjectExists(jobNo, signal) {
  return !!(await formaFindProject(jobNo, signal));
}

const issuesUrl = (projectId) => `${cfg.apiBase}${cfg.issuesPath.replace('{projectId}', encodeURIComponent(projectId))}`;

/** Open and in-progress issues of a project (all pages), as { id, displayId, title, description }. */
export async function formaIssues(projectId, signal) {
  const out = [];
  for (let offset = 0; offset < 2000; offset += cfg.issuePageSize) {
    const q = `filter[status]=${cfg.issueStatuses}&fields=id,displayId,title,description&limit=${cfg.issuePageSize}&offset=${offset}`;
    const body = await formaGet(`${issuesUrl(projectId)}?${q}`, signal);
    if (!body || !Array.isArray(body.results)) throw new ApiError('Autodesk Forma returned an unexpected response');
    out.push(...body.results);
    if (!body.results.length || out.length >= (body.pagination?.totalResults ?? 0)) break;
  }
  return out;
}

/** One issue by its id (for a saved issue that is no longer open); null if Forma doesn't have it. */
export async function formaIssue(projectId, issueId, signal) {
  try {
    return await formaGet(`${issuesUrl(projectId)}/${encodeURIComponent(issueId)}`, signal);
  } catch (e) {
    if (e.status === 404) return null;
    throw e;
  }
}
