import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ApiError, onUnauthorized, request, url } from '../lib/apexHttp';

beforeEach(() => {
  globalThis.localStorage = { getItem: () => JSON.stringify('tok'), setItem() {}, removeItem() {} };
});
afterEach(() => vi.restoreAllMocks());

it('builds API URLs with repeated params and skips blanks', () => {
  expect(url('/master/jobs', { division: ['DFH', 'INT'], x: '' })).toBe('/api/v1/master/jobs?division=DFH&division=INT');
  expect(url('/health/ready')).toBe('/health/ready');
});

it('sends the bearer token and JSON body', async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: 1 }), { status: 200 }));
  globalThis.fetch = fetchMock;
  await expect(request('/tags', { method: 'POST', body: { a: 1 } })).resolves.toEqual({ ok: 1 });
  const [, init] = fetchMock.mock.calls[0];
  expect(init.headers.Authorization).toBe('Bearer tok');
  expect(init.headers['Content-Type']).toBe('application/json');
  expect(init.body).toBe('{"a":1}');
});

it('turns error responses into ApiError with problems', async () => {
  globalThis.fetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ detail: 'Nope', problems: ['Add a job'] }), { status: 422, headers: { 'X-Request-ID': 'r1' } }),
  );
  const err = await request('/tags/1/submit', { method: 'POST', body: {} }).catch((e) => e);
  expect(err).toBeInstanceOf(ApiError);
  expect([err.status, err.message, err.problems, err.requestId]).toEqual([422, 'Nope', ['Add a job'], 'r1']);
});

it('notifies listeners on 401', async () => {
  globalThis.fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 401 }));
  const seen = vi.fn();
  const off = onUnauthorized(seen);
  await request('/me').catch(() => {});
  off();
  expect(seen).toHaveBeenCalledOnce();
});

it('reports network failures plainly', async () => {
  globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
  await expect(request('/tags')).rejects.toThrow('Can’t reach the server');
});
