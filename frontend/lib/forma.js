/**
 * Autodesk Forma project lookup, called straight from the browser (Autodesk allows it):
 *   GET {apiBase}{projectsPath}?filter[jobNumber]=<job no>   Authorization: Bearer <Forma token>
 * A job can only get a tag if Forma has a project for it (non-empty `results`).
 * This uses its own fetch (not the eMachine client) so a rejected Forma token
 * never signs the user out of the app.
 */
import { apexConfig } from './apexConfig';
import { ApiError } from './apexHttp';

const cfg = apexConfig.forma;

export async function formaProjectExists(jobNo, signal) {
  if (!cfg.token) {
    throw new ApiError('The Autodesk Forma token isn’t set (VITE_FORMA_TOKEN), so the project can’t be checked.');
  }
  const path = cfg.projectsPath.replace('{accountId}', encodeURIComponent(cfg.accountId));
  const url = `${cfg.apiBase}${path}?${cfg.jobFilter}=${encodeURIComponent(jobNo)}`;

  let res;
  try {
    res = await fetch(url, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${cfg.token}` },
      signal: signal ?? AbortSignal.timeout(apexConfig.emachine.timeoutMs),
    });
  } catch {
    throw new ApiError('Can’t reach Autodesk Forma. Check your connection.');
  }
  if (res.status === 401 || res.status === 403) {
    throw new ApiError('Autodesk Forma rejected the token. It may have expired; ask the Office to refresh it.', { status: res.status });
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
