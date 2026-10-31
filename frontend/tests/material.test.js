import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { apexApi } from '../lib/apexApi';
import { apexConfig } from '../lib/apexConfig';

beforeEach(() => {
  globalThis.localStorage = { getItem: () => JSON.stringify('tok'), setItem() {}, removeItem() {} };
  apexConfig.emachine.writesEnabled = true;
});
afterEach(() => vi.restoreAllMocks());

it('adds a material with the same request the existing app sends (description + CostCodeID)', async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ Id: 10000060 })));
  globalThis.fetch = fetchMock;
  const id = await apexApi.master.createMaterial({ description: 'Test-Mat', costCodeId: '10000337' });
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('/datamodel/api/materials_master');
  expect(init.method).toBe('POST');
  expect(init.headers['eml-service']).toBe('True');
  expect(init.body).toBe('description=Test-Mat&CostCodeID=10000337');
  expect(id).toBe(10000060);
});

it('returns null when the response has no Id, so the caller can find it by reloading the list', async () => {
  globalThis.fetch = vi.fn().mockResolvedValue(new Response('{}'));
  expect(await apexApi.master.createMaterial({ description: 'x', costCodeId: '1' })).toBeNull();
});

it('trims the name and refuses an empty name or missing type without sending anything', async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));
  globalThis.fetch = fetchMock;
  await apexApi.master.createMaterial({ description: '  Wood  door ', costCodeId: '10000337' });
  expect(fetchMock.mock.calls[0][1].body).toBe('description=Wood++door&CostCodeID=10000337');
  await expect(apexApi.master.createMaterial({ description: '   ', costCodeId: '1' })).rejects.toThrow(/material name/);
  await expect(apexApi.master.createMaterial({ description: 'a', costCodeId: '' })).rejects.toThrow(/type/);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it('sends nothing when saving to eMachine is turned off', async () => {
  apexConfig.emachine.writesEnabled = false;
  globalThis.fetch = vi.fn();
  await expect(apexApi.master.createMaterial({ description: 'a', costCodeId: '1' })).rejects.toThrow(/Read-only mode/);
  expect(globalThis.fetch).not.toHaveBeenCalled();
});
