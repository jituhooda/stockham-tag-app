import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { apexApi, fileKind, photoFromRow } from '../lib/apexApi';
import { fileUrlFrom } from '../lib/apexHttp';
import { apexConfig } from '../lib/apexConfig';

const DROPBOX = 'https://dl.dropboxusercontent.com/scl/fi/2zn9a8i43qiqhwfrwow1u/20261030_161230.jpg?rlkey=ovngax975hnxckxycdljkyhgp&dl=1';

beforeEach(() => {
  globalThis.localStorage = { getItem: () => JSON.stringify('tok'), setItem() {}, removeItem() {} };
  apexConfig.emachine.writesEnabled = true;
});
afterEach(() => vi.restoreAllMocks());

const photo = () => new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])], 'camera.jpg', { type: 'image/jpeg' });

it('uploads like the existing app, then saves the returned link on the tag', async () => {
  const calls = [];
  globalThis.fetch = vi.fn(async (url, init) => {
    calls.push({ url, init });
    return new Response(url.includes('cloud_storage') ? JSON.stringify({ result: { link: DROPBOX } }) : '{}');
  });
  const link = await apexApi.tags.attachFile({ tagId: '10000099', file: photo(), filename: '20261030_161230.jpg', user: 'sean@stockhamconstruction.com' });
  expect(link).toBe(DROPBOX);

  // 1) the multipart upload: same fields, same order, the file last
  const [up, save] = calls;
  expect(up.url).toBe('/cloudproviders/app/cloud_storage/upload');
  expect(up.init.method).toBe('POST');
  expect(up.init.headers['Content-Type']).toBeUndefined(); // the browser sets the multipart boundary
  const entries = [...up.init.body.entries()];
  expect(entries.map(([k]) => k)).toEqual(['path', 'provider_name', 'customer_name', 'file']);
  expect(Object.fromEntries(entries.slice(0, 3))).toEqual({
    path: '/Stockham/prod/01f14f0d-aada-1940-82e4-0a4c70400082/sean@stockhamconstruction.com/Misc',
    provider_name: 'SupportEmachine-Dropbox',
    customer_name: 'Basic',
  });
  expect(entries[3][1].name).toBe('20261030_161230.jpg');

  // 2) the tag_photos insert, byte for byte like the capture
  expect(save.url).toBe('/datamodel/api/tag_photos');
  expect(save.init.body).toBe('tag_id=10000099&photo_url=https%3A%2F%2Fdl.dropboxusercontent.com%2Fscl%2Ffi%2F2zn9a8i43qiqhwfrwow1u%2F20261030_161230.jpg%3Frlkey%3Dovngax975hnxckxycdljkyhgp%26dl%3D1&description=20261030_161230.jpg');
});

it('finds the file link in any response shape', () => {
  expect(fileUrlFrom(DROPBOX)).toBe(DROPBOX);
  expect(fileUrlFrom(`"${DROPBOX}"`)).toBe(DROPBOX);
  expect(fileUrlFrom({ url: DROPBOX })).toBe(DROPBOX);
  expect(fileUrlFrom({ data: { files: [{ name: 'a.jpg', link: DROPBOX }] } })).toBe(DROPBOX);
  expect(fileUrlFrom({ a: 'https://example.com/x', b: DROPBOX })).toBe(DROPBOX); // prefers the Dropbox link
  expect(fileUrlFrom({ ok: true, message: 'done' })).toBeNull();
  expect(fileUrlFrom(null)).toBeNull();
});

it('does not attach anything if the upload returns no link', async () => {
  globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ ok: true })));
  await expect(apexApi.tags.attachFile({ tagId: '5', file: photo(), filename: 'a.jpg', user: 'u@x.com' })).rejects.toThrow(/didn’t return its link/);
  expect(globalThis.fetch).toHaveBeenCalledTimes(1); // no tag_photos insert
});

it('refuses oversized files, a missing user and a bad tag id before sending anything', async () => {
  globalThis.fetch = vi.fn();
  const big = { size: apexConfig.uploads.maxBytes + 1, name: 'big.mov' };
  await expect(apexApi.tags.attachFile({ tagId: '5', file: big, user: 'u@x.com' })).rejects.toThrow(/too large/);
  await expect(apexApi.tags.attachFile({ tagId: '5', file: photo(), user: '' })).rejects.toThrow(/Sign in again/);
  await expect(apexApi.tags.attachFile({ tagId: 'new', file: photo(), user: 'u@x.com' })).rejects.toThrow(/Invalid id/);
  expect(globalThis.fetch).not.toHaveBeenCalled();
});

it('keeps the folder path safe: only the user name can vary, and odd characters are replaced', async () => {
  const calls = [];
  globalThis.fetch = vi.fn(async (url, init) => { calls.push({ url, init }); return new Response(url.includes('cloud_storage') ? JSON.stringify({ url: DROPBOX }) : '{}'); });
  await apexApi.tags.attachFile({ tagId: '5', file: photo(), filename: '../../etc/pass wd.jpg', user: '../../evil/x@y.com' });
  const fields = Object.fromEntries([...calls[0].init.body.entries()]);
  expect(fields.path).toBe('/Stockham/prod/01f14f0d-aada-1940-82e4-0a4c70400082/.._.._evil_x@y.com/Misc');
  expect(fields.file.name).toBe('.._.._etc_pass wd.jpg');
});

it('sends nothing when saving to eMachine is turned off', async () => {
  apexConfig.emachine.writesEnabled = false;
  globalThis.fetch = vi.fn();
  await expect(apexApi.tags.attachFile({ tagId: '5', file: photo(), filename: 'a.jpg', user: 'u@x.com' })).rejects.toThrow(/Read-only mode/);
  expect(globalThis.fetch).not.toHaveBeenCalled();
});

it('lists a tag\'s files and classifies them by name', async () => {
  globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { records: [{ Id: '10000076', tag_id: '10000099', photo_url: DROPBOX, uploaded_at: '2026-10-30 16:12:34', description: '20261030_161230.jpg' }] } })));
  const [p] = await apexApi.tags.photos('10000099');
  expect(p).toEqual({ id: '10000076', url: DROPBOX, name: '20261030_161230.jpg', uploadedAt: '2026-10-30 16:12:34' });
  const sql = atob(decodeURIComponent(new URL(globalThis.fetch.mock.calls[0][0], 'http://x').searchParams.get('query')).replace(/=+$/, '') + '=='.slice(0, (4 - (decodeURIComponent(new URL(globalThis.fetch.mock.calls[0][0], 'http://x').searchParams.get('query')).replace(/=+$/, '').length % 4)) % 4));
  expect(sql).toContain('FROM tag_photos tp WHERE tp.tag_id = 10000099');
  expect(photoFromRow({ Id: '1', photo_url: 'https://x/y/My%20Doc.pdf?dl=1', description: '' }).name).toBe('My Doc.pdf');
  expect(['a.JPG', 'b.mov', 'c.m4a', 'd.pdf', 'noext'].map(fileKind)).toEqual(['image', 'video', 'audio', 'document', 'document']);
});

it('deletes a file with exactly the captured request (query param byte for byte)', async () => {
  globalThis.fetch = vi.fn().mockResolvedValue(new Response('{}'));
  await apexApi.tags.deletePhoto('10000076');
  expect(globalThis.fetch.mock.calls[0][0]).toBe('/datamodel/api/model_query?query=ZGVsZXRlIGZyb20gdGFnX3Bob3RvcyB3aGVyZSBJZD0nMTAwMDAwNzYn');
});

it('deletes a file with the same delete statement style as cost lines (tag_photos by Id)', async () => {
  globalThis.fetch = vi.fn().mockResolvedValue(new Response('{}'));
  await apexApi.tags.deletePhoto('10000076');
  const q = new URL(globalThis.fetch.mock.calls[0][0], 'http://x').searchParams.get('query');
  expect(atob(q + '='.repeat((4 - (q.length % 4)) % 4))).toBe("delete from tag_photos where Id='10000076'");
});

it('deletes the tag_photos row (captured request), then the Dropbox copy at the upload path', async () => {
  globalThis.fetch = vi.fn(async () => new Response('{"msg":"ok"}'));
  const removed = await apexApi.tags.deletePhoto('10000076', { name: '20261030_161230.jpg', user: 'sean@stockhamconstruction.com' });
  expect(removed).toBe(true);
  const [rowUrl] = globalThis.fetch.mock.calls[0];
  expect(rowUrl.split('query=')[1]).toBe('ZGVsZXRlIGZyb20gdGFnX3Bob3RvcyB3aGVyZSBJZD0nMTAwMDAwNzYn');
  const [url, init] = globalThis.fetch.mock.calls[1];
  expect(url).toBe('/cloudproviders/app/cloud_storage/delete');
  expect(init.method).toBe('POST');
  const body = new URLSearchParams(init.body);
  expect(body.get('provider_name')).toBe('SupportEmachine-Dropbox');
  expect(body.get('customer_name')).toBe('Basic');
  expect(body.get('file_name')).toBe(`/Stockham/prod/${apexConfig.uploads.appId}/sean@stockhamconstruction.com/Misc/20261030_161230.jpg`);
});

it('still reports the row as deleted when the Dropbox copy cannot be removed', async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  globalThis.fetch = vi.fn()
    .mockResolvedValueOnce(new Response('{}'))
    .mockResolvedValueOnce(new Response('{"msg":"Error deleting file"}', { status: 400 }));
  await expect(apexApi.tags.deletePhoto('10000076', { name: 'a.jpg', user: 'u@x.com' })).resolves.toBe(false);
  expect(globalThis.fetch).toHaveBeenCalledTimes(2);
});

it('does not touch Dropbox when the row delete fails', async () => {
  globalThis.fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 500 }));
  await expect(apexApi.tags.deletePhoto('10000076', { name: 'a.jpg', user: 'u@x.com' })).rejects.toThrow();
  expect(globalThis.fetch).toHaveBeenCalledTimes(1);
});
