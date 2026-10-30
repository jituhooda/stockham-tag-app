import { afterEach, expect, it, vi } from 'vitest';
import { ApiError } from '../lib/apexHttp';
import { formaProjectExists } from '../lib/forma';

afterEach(() => vi.restoreAllMocks());

const reply = (status, body) => vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));

it('asks Autodesk Forma for the job number with the bearer token', async () => {
  const fetchMock = reply(200, { pagination: { totalResults: 1 }, results: [{ id: 'p1' }] });
  globalThis.fetch = fetchMock;
  expect(await formaProjectExists('D4169')).toBe(true);
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('https://developer.api.autodesk.com/construction/admin/v1/accounts/2a778b1d-efbb-4537-8c06-cab88ba77e32/projects?filter[jobNumber]=D4169');
  expect(init.headers.Authorization).toBe('Bearer test-forma-token');
});

it('reports no project when results is empty', async () => {
  globalThis.fetch = reply(200, { pagination: { totalResults: 0 }, results: [] });
  expect(await formaProjectExists('D4618')).toBe(false);
});

it('treats a rejected token as an error, not as "no project"', async () => {
  globalThis.fetch = reply(401, { errorCode: 'AUTH-006' });
  await expect(formaProjectExists('D4169')).rejects.toThrow(ApiError);
  await expect(formaProjectExists('D4169')).rejects.toThrow(/rejected the token/);
});

it('treats an unexpected body as an error', async () => {
  globalThis.fetch = reply(200, { foo: 1 });
  await expect(formaProjectExists('D4169')).rejects.toThrow(/unexpected response/);
});

it('encodes the job number', async () => {
  const fetchMock = reply(200, { results: [] });
  globalThis.fetch = fetchMock;
  await formaProjectExists('A&B=1');
  expect(fetchMock.mock.calls[0][0]).toMatch(/filter\[jobNumber\]=A%26B%3D1$/);
});
