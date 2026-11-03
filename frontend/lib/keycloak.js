import { apexConfig } from './apexConfig';
import { setToken, tokenClaims } from './apexHttp';
import { storage } from './storage';

/**
 * Keycloak sign-in: authorization-code flow with PKCE for a public client (no secret).
 *   startLogin()    sends the browser to the Keycloak login page
 *   completeLogin() runs on return (#code=...&state=...), swaps the code for the user's token
 *   logout()        ends the Keycloak session using the refresh token
 */
const cfg = apexConfig.auth;
const keys = apexConfig.storageKeys;
const endpoint = (name) => `${cfg.issuer}/protocol/openid-connect/${name}`;

export const keycloakEnabled = () => !!(cfg.issuer && cfg.clientId);

const b64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const random = (n = 32) => b64url(crypto.getRandomValues(new Uint8Array(n)));
const challengeOf = async (verifier) => b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));

// Kept per tab: the login round-trip leaves this site and comes back to the same tab.
const session = {
  get: () => { try { return JSON.parse(sessionStorage.getItem(keys.loginState)); } catch { return null; } },
  set: (v) => { try { sessionStorage.setItem(keys.loginState, JSON.stringify(v)); } catch { /* ignore */ } },
  clear: () => { try { sessionStorage.removeItem(keys.loginState); } catch { /* ignore */ } },
};

let loginError = '';
/** The message from the last failed sign-in attempt (shown once on the sign-in screen). */
export const takeLoginError = () => { const e = loginError; loginError = ''; return e; };

export const forgetRefreshToken = () => storage.remove(keys.refreshToken);
export const getRefreshToken = () => storage.get(keys.refreshToken, '');

export async function startLogin({ loginHint = storage.get(keys.lastEmail, ''), loc = window.location } = {}) {
  const verifier = random(48);
  const state = random();
  const nonce = random();
  const redirectUri = `${loc.origin}/`;
  session.set({ state, nonce, verifier, redirectUri });

  const url = new URL(endpoint('auth'));
  Object.entries({
    client_id: cfg.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    response_mode: 'fragment',
    scope: cfg.scope,
    state,
    nonce,
    code_challenge: await challengeOf(verifier),
    code_challenge_method: 'S256',
    ...(loginHint ? { login_hint: loginHint } : {}),
  }).forEach(([k, v]) => url.searchParams.set(k, v));
  loc.assign(url.toString());
}

const RESPONSE_PARAMS = ['code', 'state', 'session_state', 'iss', 'error', 'error_description'];

/** True when the address carries a Keycloak response (#code=... or #error=...). */
export function hasLoginResponse(loc = window.location) {
  const p = new URLSearchParams((loc.hash || '').replace(/^#/, ''));
  return p.has('state') && (p.has('code') || p.has('error'));
}

/** Finishes a login started by startLogin(). Resolves to true when the user is signed in. */
export async function completeLogin({ loc = window.location, hist = window.history, fetchImpl = fetch } = {}) {
  const p = new URLSearchParams((loc.hash || '').replace(/^#/, ''));
  if (!hasLoginResponse(loc)) return false;
  const response = Object.fromEntries(RESPONSE_PARAMS.map((k) => [k, p.get(k)]));
  RESPONSE_PARAMS.forEach((k) => p.delete(k));
  const rest = p.toString();
  try {
    hist.replaceState(hist.state, '', `${loc.pathname}${loc.search}${rest ? `#${rest}` : ''}`);
  } catch { /* ignore */ }

  const saved = session.get();
  session.clear();
  if (response.error) {
    loginError = response.error === 'access_denied' ? 'Sign-in was cancelled.' : (response.error_description || response.error);
    return false;
  }
  if (!saved || saved.state !== response.state) {
    loginError = 'Sign-in could not be verified. Please try again.';
    return false;
  }

  try {
    const res = await fetchImpl(endpoint('token'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: cfg.clientId,
        code: response.code,
        redirect_uri: saved.redirectUri,
        code_verifier: saved.verifier,
      }).toString(),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.access_token) throw new Error(body.error_description || `Sign-in failed (${res.status})`);
    if (body.id_token && tokenClaims(body.id_token).nonce !== saved.nonce) throw new Error('Sign-in could not be verified. Please try again.');

    // A different person must not inherit the previous user's saved employee/divisions.
    const claims = tokenClaims(body.access_token);
    const previous = storage.get(keys.settings, null);
    if (previous?.employee && claims.employeeid && previous.employee !== claims.employeeid) storage.remove(keys.settings);

    setToken(body.access_token);
    if (body.refresh_token) storage.set(keys.refreshToken, body.refresh_token); else forgetRefreshToken();
    if (claims.email) storage.set(keys.lastEmail, claims.email);
    return true;
  } catch (e) {
    loginError = e.message || 'Sign-in failed.';
    return false;
  }
}

/** Ends the Keycloak session. Best effort: resolves false (never throws) if Keycloak can't be reached. */
export async function logout(refreshToken, { fetchImpl = fetch, timeoutMs = 3000 } = {}) {
  if (!keycloakEnabled() || !refreshToken) return false;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(endpoint('logout'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: cfg.clientId, refresh_token: refreshToken }).toString(),
      signal: ctrl.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
