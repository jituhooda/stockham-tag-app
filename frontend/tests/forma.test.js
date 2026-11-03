import { beforeEach, expect, it, vi } from 'vitest';
import { ApiError } from '../lib/apexHttp';
import { clearFormaToken, formaProjectExists, getFormaToken } from '../lib/forma';

const TOKEN_URL = 'https://token.test/token';
const now = () => Date.now() / 1000;
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
const tokenReply = (token, ttl = 3600) => json({ access_token: token, expires_at: now() + ttl });

/** fetch mock: routes by URL so call order doesn't matter. */
function mockFetch({ tokens = [], projects = [] }) {
  const calls = { token: 0, projects: [] };
  globalThis.fetch = vi.fn(async (url, init) => {
    if (url === TOKEN_URL) return tokens[Math.min(calls.token++, tokens.length - 1)]();
    calls.projects.push({ url, auth: init.headers.Authorization });
    return projects[Math.min(calls.projects.length - 1, projects.length - 1)]();
  });
  return calls;
}

beforeEach(() => clearFormaToken());

it('gets a token from the token service and asks Forma for the job with it', async () => {
  const calls = mockFetch({ tokens: [() => tokenReply('tok-1')], projects: [() => json({ results: [{ id: 'p1' }] })] });
  expect(await formaProjectExists('D4169')).toBe(true);
  expect(calls.projects[0].url).toBe('https://developer.api.autodesk.com/construction/admin/v1/accounts/2a778b1d-efbb-4537-8c06-cab88ba77e32/projects?filter[jobNumber]=D4169');
  expect(calls.projects[0].auth).toBe('Bearer tok-1');
});

it('reuses the token until shortly before it expires, then fetches a new one', async () => {
  const calls = mockFetch({ tokens: [() => tokenReply('tok-1', 3600), () => tokenReply('tok-2')], projects: [() => json({ results: [] })] });
  await formaProjectExists('A'); await formaProjectExists('B');
  expect(calls.token).toBe(1);
  vi.useFakeTimers({ now: Date.now() + 3600 * 1000 }); // past expiry
  await formaProjectExists('C');
  vi.useRealTimers();
  expect(calls.token).toBe(2);
  expect(calls.projects[2].auth).toBe('Bearer tok-2');
});

it('does not reuse a token that is about to expire', async () => {
  const calls = mockFetch({ tokens: [() => tokenReply('short', 30), () => tokenReply('long')], projects: [() => json({ results: [] })] });
  await getFormaToken();
  expect(await getFormaToken()).toBe('long');
  expect(calls.token).toBe(2);
});

it('shares one token request between simultaneous lookups', async () => {
  const calls = mockFetch({ tokens: [() => tokenReply('tok-1')], projects: [() => json({ results: [] })] });
  await Promise.all([formaProjectExists('A'), formaProjectExists('B'), formaProjectExists('C')]);
  expect(calls.token).toBe(1);
});

it('gets a new token and retries once when Autodesk rejects the cached one', async () => {
  const calls = mockFetch({
    tokens: [() => tokenReply('stale'), () => tokenReply('fresh')],
    projects: [() => json({ errorCode: 'AUTH-006' }, 401), () => json({ results: [{ id: 'p' }] })],
  });
  expect(await formaProjectExists('D4169')).toBe(true);
  expect(calls.projects.map((p) => p.auth)).toEqual(['Bearer stale', 'Bearer fresh']);
});

it('gives up with a clear error if the new token is rejected too', async () => {
  mockFetch({ tokens: [() => tokenReply('a'), () => tokenReply('b')], projects: [() => json({}, 401)] });
  await expect(formaProjectExists('D4169')).rejects.toThrow(/rejected the token/);
});

it('reports no project when results is empty', async () => {
  mockFetch({ tokens: [() => tokenReply('t')], projects: [() => json({ pagination: { totalResults: 0 }, results: [] })] });
  expect(await formaProjectExists('D4618')).toBe(false);
});

it('turns a failing token service into an error, not "no project"', async () => {
  mockFetch({ tokens: [() => json({}, 500)], projects: [() => json({ results: [] })] });
  await expect(formaProjectExists('D4169')).rejects.toThrow(ApiError);
  await expect(formaProjectExists('D4169')).rejects.toThrow(/token service returned an error/);
});

it('rejects a token response without access_token', async () => {
  mockFetch({ tokens: [() => json({ expires_at: now() + 100 })], projects: [() => json({ results: [] })] });
  await expect(getFormaToken()).rejects.toThrow(/unexpected response/);
});

it('treats an unexpected Forma body as an error and encodes the job number', async () => {
  const calls = mockFetch({ tokens: [() => tokenReply('t')], projects: [() => json({ foo: 1 }), () => json({ results: [] })] });
  await expect(formaProjectExists('A')).rejects.toThrow(/unexpected response/);
  await formaProjectExists('A&B=1');
  expect(calls.projects[1].url).toMatch(/filter\[jobNumber\]=A%26B%3D1$/);
});
