import { beforeEach, expect, it, vi } from 'vitest';
import { apexConfig } from '../lib/apexConfig';
import { completeLogin, hasLoginResponse, logout, startLogin, takeLoginError } from '../lib/keycloak';

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (claims) => `${b64({ alg: 'RS256' })}.${b64(claims)}.sig`;
const keys = apexConfig.storageKeys;

let local;
let sess;
beforeEach(() => {
  local = {};
  sess = {};
  globalThis.localStorage = { getItem: (k) => (k in local ? local[k] : null), setItem: (k, v) => { local[k] = v; }, removeItem: (k) => { delete local[k]; } };
  globalThis.sessionStorage = { getItem: (k) => (k in sess ? sess[k] : null), setItem: (k, v) => { sess[k] = v; }, removeItem: (k) => { delete sess[k]; } };
});

const loc = (hash = '') => ({ origin: 'https://app.test', pathname: '/', search: '', hash, assign: vi.fn() });
const hist = () => ({ state: null, replaceState: vi.fn() });

it('sends the browser to Keycloak with PKCE, a state and a nonce', async () => {
  const l = loc();
  await startLogin({ loginHint: 'sean@x.com', loc: l });
  const url = new URL(l.assign.mock.calls[0][0]);
  expect(url.origin + url.pathname).toBe(`${apexConfig.auth.issuer}/protocol/openid-connect/auth`);
  const q = url.searchParams;
  expect(q.get('client_id')).toBe(apexConfig.auth.clientId);
  expect(q.get('redirect_uri')).toBe('https://app.test/');
  expect(q.get('response_type')).toBe('code');
  expect(q.get('response_mode')).toBe('fragment');
  expect(q.get('code_challenge_method')).toBe('S256');
  expect(q.get('code_challenge')).toMatch(/^[\w-]{43}$/);
  expect(q.get('login_hint')).toBe('sean@x.com');
  const saved = JSON.parse(sess[keys.loginState]);
  expect(saved.state).toBe(q.get('state'));
  expect(saved.nonce).toBe(q.get('nonce'));
});

it('recognises a Keycloak response in the fragment', () => {
  expect(hasLoginResponse(loc('#state=a&code=b'))).toBe(true);
  expect(hasLoginResponse(loc('#state=a&error=access_denied'))).toBe(true);
  expect(hasLoginResponse(loc('#token=abc'))).toBe(false);
  expect(hasLoginResponse(loc(''))).toBe(false);
});

it('swaps the code for a token, stores it and cleans the address bar', async () => {
  const l = loc('#state=S1&code=CODE&session_state=x&iss=y&keep=1');
  sess[keys.loginState] = JSON.stringify({ state: 'S1', nonce: 'N1', verifier: 'V1', redirectUri: 'https://app.test/' });
  const access = jwt({ email: 'sean@x.com', employeeid: 'Sean' });
  const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ access_token: access, refresh_token: 'RT', id_token: jwt({ nonce: 'N1' }) }) });
  const h = hist();

  expect(await completeLogin({ loc: l, hist: h, fetchImpl })).toBe(true);

  const [url, init] = fetchImpl.mock.calls[0];
  expect(url).toBe(`${apexConfig.auth.issuer}/protocol/openid-connect/token`);
  const body = Object.fromEntries(new URLSearchParams(init.body));
  expect(body).toEqual({ grant_type: 'authorization_code', client_id: apexConfig.auth.clientId, code: 'CODE', redirect_uri: 'https://app.test/', code_verifier: 'V1' });
  expect(JSON.parse(local[keys.token])).toBe(access);
  expect(JSON.parse(local[keys.refreshToken])).toBe('RT');
  expect(JSON.parse(local[keys.lastEmail])).toBe('sean@x.com');
  expect(h.replaceState.mock.calls[0][2]).toBe('/#keep=1');
  expect(sess[keys.loginState]).toBeUndefined();
});

it('rejects a response whose state does not match', async () => {
  sess[keys.loginState] = JSON.stringify({ state: 'S1', nonce: 'N', verifier: 'V', redirectUri: 'x' });
  const fetchImpl = vi.fn();
  expect(await completeLogin({ loc: loc('#state=OTHER&code=C'), hist: hist(), fetchImpl })).toBe(false);
  expect(fetchImpl).not.toHaveBeenCalled();
  expect(takeLoginError()).toMatch(/could not be verified/);
  expect(takeLoginError()).toBe('');
});

it('rejects a token whose nonce does not match', async () => {
  sess[keys.loginState] = JSON.stringify({ state: 'S', nonce: 'N1', verifier: 'V', redirectUri: 'x' });
  const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ access_token: jwt({}), id_token: jwt({ nonce: 'EVIL' }) }) });
  expect(await completeLogin({ loc: loc('#state=S&code=C'), hist: hist(), fetchImpl })).toBe(false);
  expect(local[keys.token]).toBeUndefined();
});

it('reports a cancelled or failed login', async () => {
  expect(await completeLogin({ loc: loc('#state=S&error=access_denied'), hist: hist() })).toBe(false);
  expect(takeLoginError()).toBe('Sign-in was cancelled.');

  sess[keys.loginState] = JSON.stringify({ state: 'S', nonce: 'N', verifier: 'V', redirectUri: 'x' });
  const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ error_description: 'Code not valid' }) });
  expect(await completeLogin({ loc: loc('#state=S&code=C'), hist: hist(), fetchImpl })).toBe(false);
  expect(takeLoginError()).toBe('Code not valid');
});

it('ends the Keycloak session with the refresh token, and never throws', async () => {
  const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 204 });
  expect(await logout('RT', { fetchImpl })).toBe(true);
  const [url, init] = fetchImpl.mock.calls[0];
  expect(url).toBe(`${apexConfig.auth.issuer}/protocol/openid-connect/logout`);
  expect(Object.fromEntries(new URLSearchParams(init.body))).toEqual({ client_id: apexConfig.auth.clientId, refresh_token: 'RT' });
  expect(await logout('', { fetchImpl })).toBe(false);
  expect(await logout('RT', { fetchImpl: vi.fn().mockRejectedValue(new Error('offline')) })).toBe(false);
});
