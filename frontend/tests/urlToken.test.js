import { beforeEach, expect, it } from 'vitest';
import { apexConfig } from '../lib/apexConfig';
import { consumeUrlToken } from '../lib/urlToken';

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (claims) => `${b64({ alg: 'RS256' })}.${b64(claims)}.sig`;
const NOW = 1_700_000_000_000;

let store;
let replaced;
const hist = { state: null, replaceState: (_s, _t, url) => { replaced = url; } };
const loc = (hash) => ({ hash, pathname: '/tags', search: '?a=1' });

beforeEach(() => {
  store = {};
  replaced = null;
  globalThis.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = v; },
    removeItem: (k) => { delete store[k]; },
  };
});

it('saves a valid token and removes it from the address bar', () => {
  const t = jwt({ exp: NOW / 1000 + 3600, employeeid: 'Sean' });
  expect(consumeUrlToken(loc(`#token=${t}`), hist, NOW)).toBe(true);
  expect(Object.values(store).map((v) => JSON.parse(v))).toContain(t);
  expect(replaced).toBe('/tags?a=1');
});

it('accepts a Bearer prefix and keeps other fragment params', () => {
  const t = jwt({ exp: NOW / 1000 + 60 });
  expect(consumeUrlToken(loc(`#x=1&token=Bearer%20${t}`), hist, NOW)).toBe(true);
  expect(replaced).toBe('/tags?a=1#x=1');
});

it('rejects an expired or malformed token but still clears the URL', () => {
  expect(consumeUrlToken(loc(`#token=${jwt({ exp: NOW / 1000 - 1 })}`), hist, NOW)).toBe(false);
  expect(consumeUrlToken(loc('#token=garbage'), hist, NOW)).toBe(false);
  expect(Object.keys(store)).toHaveLength(0);
  expect(replaced).toBe('/tags?a=1');
});

it('does nothing without a token in the fragment', () => {
  expect(consumeUrlToken(loc(''), hist, NOW)).toBe(false);
  expect(replaced).toBeNull();
});

it('drops saved settings when a different employee signs in', () => {
  const settingsKey = apexConfig.storageKeys.settings;
  store[settingsKey] = JSON.stringify({ employee: 'A', divisions: ['X'] });
  consumeUrlToken(loc(`#token=${jwt({ employeeid: 'A' })}`), hist, NOW);
  expect(store[settingsKey]).toBeDefined();
  consumeUrlToken(loc(`#token=${jwt({ employeeid: 'B' })}`), hist, NOW);
  expect(store[settingsKey]).toBeUndefined();
});
