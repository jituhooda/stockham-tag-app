import { apexConfig } from './apexConfig';
import { setToken, tokenClaims } from './apexHttp';
import { forgetRefreshToken } from './keycloak';
import { storage } from './storage';

/**
 * Sign-in by link: https://<site>/#token=<JWT>. The fragment is never sent to a server.
 * A usable (unexpired) token is saved as if the user had pasted it, and the token is
 * always removed from the address bar so it doesn't linger in history or shared links.
 * Returns true when a token was accepted.
 */
export function consumeUrlToken(loc = window.location, hist = window.history, now = Date.now()) {
  const params = new URLSearchParams((loc.hash || '').replace(/^#/, ''));
  if (!params.has('token')) return false;

  const token = (params.get('token') || '').trim().replace(/^Bearer\s+/i, '');
  params.delete('token');
  const rest = params.toString();
  try {
    hist.replaceState(hist.state, '', `${loc.pathname}${loc.search}${rest ? `#${rest}` : ''}`);
  } catch {
    /* ignore */
  }

  const claims = tokenClaims(token);
  if (token.split('.').length !== 3 || (claims.exp && claims.exp * 1000 <= now)) return false;

  // A different person's token must not inherit the previous user's saved employee/divisions.
  const saved = storage.get(apexConfig.storageKeys.settings, null);
  if (saved?.employee && claims.employeeid && saved.employee !== claims.employeeid) {
    storage.remove(apexConfig.storageKeys.settings);
  }
  setToken(token);
  forgetRefreshToken();
  return true;
}
