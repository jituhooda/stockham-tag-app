import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { apexApi } from '../lib/apexApi';
import { apexConfig } from '../lib/apexConfig';

beforeEach(() => {
  globalThis.localStorage = { getItem: () => JSON.stringify('tok'), setItem() {}, removeItem() {} };
  apexConfig.emachine.writesEnabled = true;
});
afterEach(() => vi.restoreAllMocks());

it('adds equipment with the same request the existing app sends (description only)', async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ Id: 10000032 })));
  globalThis.fetch = fetchMock;
  const id = await apexApi.master.createEquipment({ description: 'Test-Eqp1' });
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('/datamodel/api/equipment_master');
  expect(init.method).toBe('POST');
  expect(init.headers['eml-service']).toBe('True');
  expect(init.body).toBe('description=Test-Eqp1');
  expect(id).toBe(10000032);
});

it('returns null when the response has no Id, refuses an empty name, and sends nothing when saving is off', async () => {
  globalThis.fetch = vi.fn().mockResolvedValue(new Response('{}'));
  expect(await apexApi.master.createEquipment({ description: ' Lift ' })).toBeNull();
  await expect(apexApi.master.createEquipment({ description: '  ' })).rejects.toThrow(/equipment name/);
  expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  apexConfig.emachine.writesEnabled = false;
  await expect(apexApi.master.createEquipment({ description: 'x' })).rejects.toThrow(/Read-only mode/);
  expect(globalThis.fetch).toHaveBeenCalledTimes(1);
});
