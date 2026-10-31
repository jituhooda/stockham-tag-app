import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { apexApi, approverFromRow, signatureFromRow, signatureSrc } from '../lib/apexApi';
import { apexConfig } from '../lib/apexConfig';

const json = (b, status = 200) => new Response(JSON.stringify(b), { status });
const sqlOf = (url) => {
  const q = decodeURIComponent(new URL(url, 'http://x').searchParams.get('query')).replace(/=+$/, '');
  return atob(q + '='.repeat((4 - (q.length % 4)) % 4));
};
const decodeCaptured = (b64) => atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));

beforeEach(() => {
  globalThis.localStorage = { getItem: () => JSON.stringify('tok'), setItem() {}, removeItem() {} };
  apexConfig.emachine.writesEnabled = true;
});
afterEach(() => vi.restoreAllMocks());

const APPROVERS_CAPTURED = 'c2VsZWN0IENPTkNBVChjYy5maXJzdG5hbWUsICcgJywgY2MubGFzdG5hbWUpIEFTIGZ1bGxuYW1lLCBjYy5JZCwgY2MuZmlyc3RuYW1lLCBjYy5sYXN0bmFtZSwgY2MuRW1haWwsIGNjLmN1c3RvbWVySUQsIGMuQ3VzdG9tZXJOYW1lIEZST00gY3VzdG9tZXJjb250YWN0IGNjIEpPSU4gY3VzdG9tZXIgYyBPTiBjYy5jdXN0b21lcklEID0gYy5DdXN0b21lcklEIFdIRVJFIGNjLmN1c3RvbWVySUQgPSAnMTEzMyc';

it('asks for a customer\'s contacts with exactly the captured SQL', async () => {
  globalThis.fetch = vi.fn().mockResolvedValue(json({ data: { records: [
    { fullname: 'Sean Hubert', Id: '10011006', firstname: 'Sean', lastname: 'Hubert', Email: 'smhubert@gmail.com', customerID: '1133', CustomerName: 'Skyline Construction Inc.' },
    { fullname: 'Michael Hubert', Id: '10011007', firstname: 'Michael', lastname: 'Hubert', Email: 'smhubert@hotmail.com', customerID: '1133', CustomerName: 'Skyline Construction Inc.' },
  ] } }));
  const list = await apexApi.master.approvers('1133');
  expect(sqlOf(globalThis.fetch.mock.calls[0][0])).toBe(decodeCaptured(APPROVERS_CAPTURED));
  expect(list.map((a) => [a.id, a.name, a.email, a.customerName])).toEqual([
    ['10011007', 'Michael Hubert', 'smhubert@hotmail.com', 'Skyline Construction Inc.'],
    ['10011006', 'Sean Hubert', 'smhubert@gmail.com', 'Skyline Construction Inc.'],
  ]);
});

it('builds a name even when eMachine returns none (CONCAT with a missing last name gives null)', () => {
  expect(approverFromRow({ Id: '1', firstname: 'Cher', lastname: '', Email: 'c@x.com' }).name).toBe('Cher');
  expect(approverFromRow({ Id: '2', fullname: null, Email: 'only@x.com' }).name).toBe('only@x.com');
});

it('only asks when there is a customer, and quotes the customer id safely', async () => {
  globalThis.fetch = vi.fn().mockResolvedValue(json({ data: { records: [] } }));
  expect(await apexApi.master.approvers('')).toEqual([]);
  expect(globalThis.fetch).not.toHaveBeenCalled();
  await apexApi.master.approvers("11'; drop table x; --");
  expect(sqlOf(globalThis.fetch.mock.calls[0][0])).toContain("cc.customerID = '11''; drop table x; --'");
});

it('looks up the customer name for the "Approver from …" title', async () => {
  globalThis.fetch = vi.fn().mockResolvedValue(json({ data: { records: [{ CustomerName: 'Skyline Construction Inc.' }] } }));
  expect(await apexApi.master.customerName('1133')).toBe('Skyline Construction Inc.');
  expect(sqlOf(globalThis.fetch.mock.calls[0][0])).toBe("select CustomerName from customer where CustomerID = '1133'");
});

it('adds a contact with the table\'s own columns, and checks the input first', async () => {
  const fetchMock = vi.fn().mockResolvedValue(json({ Id: 10011013 }));
  globalThis.fetch = fetchMock;
  const id = await apexApi.master.createApprover({ customerId: '1133', firstName: ' Ann ', lastName: 'Lee', email: ' ann@lee.com ' });
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('/datamodel/api/customercontact');
  expect(init.headers['eml-service']).toBe('True');
  expect(Object.fromEntries(new URLSearchParams(init.body))).toEqual({ FirstName: 'Ann', LastName: 'Lee', Email: 'ann@lee.com', CustomerID: '1133' });
  expect(id).toBe(10011013);
  await expect(apexApi.master.createApprover({ customerId: '1133', firstName: '', lastName: '', email: 'a@b.com' })).rejects.toThrow(/first name/);
  await expect(apexApi.master.createApprover({ customerId: '1133', firstName: 'A', lastName: '', email: 'nope' })).rejects.toThrow(/valid email/);
  await expect(apexApi.master.createApprover({ customerId: '', firstName: 'A', lastName: '', email: 'a@b.com' })).rejects.toThrow(/no customer/);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it('sends nothing when saving to eMachine is turned off', async () => {
  apexConfig.emachine.writesEnabled = false;
  globalThis.fetch = vi.fn();
  await expect(apexApi.master.createApprover({ customerId: '1', firstName: 'A', lastName: '', email: 'a@b.com' })).rejects.toThrow(/Read-only mode/);
  expect(globalThis.fetch).not.toHaveBeenCalled();
});

it('reads the signatures saved on a tag (the second captured query)', async () => {
  globalThis.fetch = vi.fn().mockResolvedValue(json({ data: { records: [{ Id: '5', tag_id: '10000099', name: 'Sean Hubert', role: 'Approver', signature: 'data:image/png;base64,AAAA', CreatedDate: '2026-10-30 12:00:00', description: 'in person' }] } }));
  const [s] = await apexApi.tags.signatures('10000099');
  expect(sqlOf(globalThis.fetch.mock.calls[0][0])).toBe("select * from tag_signature where tag_id='10000099'");
  expect(s).toEqual({ id: '5', name: 'Sean Hubert', role: 'Approver', description: 'in person', signedAt: '2026-10-30 12:00:00', image: 'data:image/png;base64,AAAA' });
  expect(decodeCaptured('c2VsZWN0ICogZnJvbSB0YWdfc2lnbmF0dXJlIHdoZXJlIHRhZ19pZD0nIDEwMDAwMDk5Jw')).toBe("select * from tag_signature where tag_id=' 10000099'");
});

it('turns a stored signature into something an image can show, or nothing', () => {
  const png = 'iVBORw0KGgo' + 'A'.repeat(80);
  expect(signatureSrc('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA');
  expect(signatureSrc(png)).toBe(`data:image/png;base64,${png}`);
  expect(signatureSrc('/9j/4AAQ' + 'A'.repeat(80))).toMatch(/^data:image\/jpeg;base64,/);
  expect(signatureSrc('https://dl.dropboxusercontent.com/x/sig.png?dl=1')).toBe('https://dl.dropboxusercontent.com/x/sig.png?dl=1');
  for (const bad of ['', null, undefined, 'not an image', 'javascript:alert(1)', 'data:text/html;base64,PHNjcmlwdD4=', '<svg onload=alert(1)>']) expect(signatureSrc(bad)).toBeNull();
  expect(signatureFromRow({ Id: '1', name: 'x', signature: 'junk' }).image).toBeNull();
});
