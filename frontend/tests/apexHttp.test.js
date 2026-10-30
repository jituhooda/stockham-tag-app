import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  ApiError, WritesDisabledError, encodeQuery, extractRows, insertedId, onUnauthorized, query, runWrites, sql, sqlInt,
  sqlString, tokenClaims, writeRequest,
} from '../lib/apexHttp';

beforeEach(() => {
  globalThis.localStorage = { getItem: () => JSON.stringify('tok'), setItem() {}, removeItem() {} };
});
afterEach(() => vi.restoreAllMocks());

it('encodes queries exactly like the documented example', () => {
  expect(encodeQuery('select * from materials_master')).toBe('c2VsZWN0ICogZnJvbSBtYXRlcmlhbHNfbWFzdGVy');
});

it('fills query templates and keeps values SQL-safe', () => {
  expect(sql('division', { employee: sqlString("O'Brien") })).toBe("select Division from employees where EMPLOYEE = 'O''Brien'");
  expect(sql('tag', { tagId: sqlInt('10000113') })).toMatch(/WHERE t\.Id = 10000113$/);
  expect(() => sqlInt('1 OR 1=1')).toThrow(ApiError);
  expect(() => sql('tag', {})).toThrow(/needs \{tagId\}/);
});

it('runs a query as a base64 GET with the bearer token', async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([{ Id: 1 }])));
  globalThis.fetch = fetchMock;
  expect(await query('materials')).toEqual([{ Id: 1 }]);
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('/datamodel/api/model_query?query=' + encodeURIComponent(encodeQuery('select * from materials_master')));
  expect(init.method).toBe('GET');
  expect(init.headers.Authorization).toBe('Bearer tok');
});

it('handles wrapped results', () => {
  expect(extractRows({ data: [{ a: 1 }] })).toEqual([{ a: 1 }]);
  expect(extractRows({ result: { rows: [{ a: 1 }] } })).toEqual([{ a: 1 }]);
});

it('builds form writes from allow-listed fields only', () => {
  const r = writeRequest('tag_other_expenses', { Id: 10000135, qty: '35.00', hacker: 'x', tag_id: undefined });
  expect(r).toMatchObject({ method: 'POST', url: '/datamodel/api/tag_other_expenses', body: 'Id=10000135&qty=35.00' });
  expect(() => writeRequest('employees', { Id: 1 })).toThrow(/isn’t configured/);
});

it('refuses to write in read-only mode (the default) and sends nothing', async () => {
  const fetchMock = vi.fn();
  globalThis.fetch = fetchMock;
  vi.spyOn(console, 'info').mockImplementation(() => {});
  const req = writeRequest('tags', { Id: 1, status: 'Draft' });
  await expect(runWrites([req])).rejects.toBeInstanceOf(WritesDisabledError);
  expect(fetchMock).not.toHaveBeenCalled();
});

it('finds the new Id in insert responses', () => {
  expect(insertedId({ Id: 10000140 })).toBe(10000140);
  expect(insertedId({ data: { id: '7' } })).toBe(7);
  expect(insertedId('42')).toBe(42);
  expect(insertedId({ ok: true })).toBeNull();
});

it('reports a rejected token to listeners', async () => {
  globalThis.fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 401 }));
  const seen = vi.fn();
  const off = onUnauthorized(seen);
  await expect(query('materials')).rejects.toThrow(/rejected the access token/);
  off();
  expect(seen).toHaveBeenCalledOnce();
});

it('reads the user name from the token', () => {
  const b64 = (o) => btoa(JSON.stringify(o)).replace(/=+$/, '');
  const token = `x.${b64({ payload: { name: 'Sean Hubert', employeeid: 'Sean' } })}.y`;
  expect(tokenClaims(token)).toMatchObject({ name: 'Sean Hubert', employeeid: 'Sean' });
  expect(tokenClaims('garbage')).toEqual({});
});
