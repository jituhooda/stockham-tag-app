import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { apexApi } from '../lib/apexApi';
import { encodeQuery } from '../lib/apexHttp';
import { apexConfig } from '../lib/apexConfig';

beforeEach(() => {
  globalThis.localStorage = { getItem: () => JSON.stringify('tok'), setItem() {}, removeItem() {} };
});
afterEach(() => vi.restoreAllMocks());

const decode = (url) => {
  const q = decodeURIComponent(new URL(url, 'http://x').searchParams.get('query'));
  return new TextDecoder().decode(Uint8Array.from(atob(q), (c) => c.charCodeAt(0)));
};

it('sends the same delete statement the existing app sends (model_query GET)', async () => {
  apexConfig.emachine.writesEnabled = true;
  const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));
  globalThis.fetch = fetchMock;
  await apexApi.tags.deleteLine('labor', '10000106');
  const [url, init] = fetchMock.mock.calls[0];
  expect(init.method).toBe('GET');
  expect(init.headers['eml-service']).toBe('True');
  expect(decode(url)).toBe("delete from tag_labor where Id='10000106'");
  // the captured request, byte for byte (base64 without padding)
  expect(url.split('query=')[1]).toBe(encodeQuery("delete from tag_labor where Id='10000106'").replace(/=+$/, ''));
});

// The four delete requests captured from the existing app (query param exactly as sent, base64 without padding).
const CAPTURED = {
  labor: ['ZGVsZXRlIGZyb20gdGFnX2xhYm9yIHdoZXJlIElkPScxMDAwMDEwNic', "delete from tag_labor where Id='10000106'"],
  materials: ['ZGVsZXRlIGZyb20gdGFnX21hdGVyaWFscyB3aGVyZSBJZD0nMTAwMDAxMjcn', "delete from tag_materials where Id='10000127'"],
  expenses: ['ZGVsZXRlIGZyb20gdGFnX290aGVyX2V4cGVuc2VzIHdoZXJlIElkPScxMDAwMDEzNic', "delete from tag_other_expenses where Id='10000136'"],
  equipment: ['ZGVsZXRlIGZyb20gdGFnX2VxdWlwbWVudCB3aGVyZSBJZD0nMTAwMDAwNzkn', "delete from tag_equipment where Id='10000079'"],
};

it.each(Object.entries(CAPTURED))('%s delete matches the captured request exactly', async (kind, [query, statement]) => {
  apexConfig.emachine.writesEnabled = true;
  const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));
  globalThis.fetch = fetchMock;
  await apexApi.tags.deleteLine(kind, statement.match(/'(\d+)'/)[1]);
  expect(fetchMock.mock.calls[0][0]).toBe(`/datamodel/api/model_query?query=${query}`);
});

it('maps each line type to its own table', async () => {
  apexConfig.emachine.writesEnabled = true;
  const fetchMock = vi.fn().mockImplementation(async () => new Response('{}'));
  globalThis.fetch = fetchMock;
  for (const kind of ['labor', 'materials', 'equipment', 'expenses']) await apexApi.tags.deleteLine(kind, '5');
  expect(fetchMock.mock.calls.map(([u]) => decode(u))).toEqual([
    "delete from tag_labor where Id='5'",
    "delete from tag_materials where Id='5'",
    "delete from tag_equipment where Id='5'",
    "delete from tag_other_expenses where Id='5'",
  ]);
});

it('refuses anything that is not a plain integer id or a known line type', async () => {
  apexConfig.emachine.writesEnabled = true;
  globalThis.fetch = vi.fn().mockResolvedValue(new Response('{}'));
  await expect(apexApi.tags.deleteLine('labor', "1' or '1'='1")).rejects.toThrow(/Invalid id/);
  await expect(apexApi.tags.deleteLine('tags', '5')).rejects.toThrow(/Unknown line type/);
  expect(globalThis.fetch).not.toHaveBeenCalled();
});

it('sends nothing when saving to eMachine is turned off', async () => {
  apexConfig.emachine.writesEnabled = false;
  globalThis.fetch = vi.fn();
  await expect(apexApi.tags.deleteLine('labor', '5')).rejects.toThrow(/Read-only mode/);
  expect(globalThis.fetch).not.toHaveBeenCalled();
});
