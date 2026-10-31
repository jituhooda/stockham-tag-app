import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import sample from './fixtures-signed-doc.json';
import { apexApi } from '../lib/apexApi';
import { apexConfig } from '../lib/apexConfig';
import { buildSignedDocBody, pngBase64, postSignedDoc, recallSignedDoc, rememberSignedDoc, signedDocLinks, signedDocProblems } from '../lib/signedDoc';

const json = (b, status = 200) => new Response(JSON.stringify(b), { status });
const sqlOf = (url) => { const q = decodeURIComponent(new URL(url, 'http://x').searchParams.get('query')).replace(/=+$/, ''); return atob(q + '='.repeat((4 - (q.length % 4)) % 4)); };

beforeEach(() => {
  globalThis.localStorage = { getItem: () => JSON.stringify('tok'), setItem() {}, removeItem() {} };
  apexConfig.emachine.writesEnabled = true;
});
afterEach(() => vi.restoreAllMocks());

// The database rows behind the captured request (A2155-1), and the tag/approver as the app holds them.
const data = {
  job: { City: 'San Francisco', PMName: 'Cameron A Barsuglia', PMEmail: 'cameron@stockhamconstruction.com', CustomerName: 'Skyline Construction Inc.', Address: '1 Sansome Floors 28/29/40', JobName: 'Databricks           1025-0083' },
  labor: sample.labor_table, materials: sample.material_table, equipment: sample.equipment_table, expenses: sample.expense_table, photos: sample.files_table,
  issues: sample.issue_table,
};
const tag = { description: sample.description, customerName: '', jobName: sample.job_name, address: sample.job_address, tagDate: sample.tag_date, jobNo: sample.job_num, tagNumber: sample.tag_num, pmEmail: sample.pm_email };
const signature = { email: sample.customer_email, approver: sample.signer_name, image: 'data:image/png;base64,' + sample.signature_image_b64, mode: 'in-person' };
const user = { email: sample.originator_email };

it('builds exactly the captured document: same fields, same order, same values', () => {
  const body = buildSignedDocBody({ tag, signature, user, data });
  expect(Object.keys(body)).toEqual(Object.keys(sample));
  expect(body).toEqual(sample);
});

it('sends the signature as bare base64 (no data: prefix)', () => {
  expect(pngBase64('data:image/png;base64,AAAA BBBB')).toBe('AAAABBBB');
  expect(pngBase64('AAAA')).toBe('AAAA');
  expect(buildSignedDocBody({ tag, signature, user, data }).signature_image_b64).toBe(sample.signature_image_b64);
});

it('writes every number as text and blanks as empty strings, like the capture', () => {
  const body = buildSignedDocBody({ tag, signature, user, data: { ...data, labor: [{ EmployeeName: 'A', TradeName: 'Framing', ST: 18, OT: null, DT: '0.00' }], materials: [], photos: [] } });
  expect(body.labor_table[0]).toEqual({ EmployeeName: 'A', TradeName: 'Framing', ST: '18', OT: '', DT: '0.00', POT: '', PDT: '' });
  expect(body.material_table).toEqual([]);
  expect(body.files_table).toEqual([]);
});

it('takes the city, PM and customer from the job when the tag does not carry them', () => {
  const body = buildSignedDocBody({ tag: { ...tag, pmEmail: '', jobName: '', address: '' }, signature, user, data });
  expect(body).toMatchObject({ job_city_zip: 'San Francisco', pm_name: 'Cameron A Barsuglia', pm_email: 'cameron@stockhamconstruction.com', customer_name: 'Skyline Construction Inc.', job_address: '1 Sansome Floors 28/29/40' });
});

it('refuses to send a document that would have holes', () => {
  const ok = buildSignedDocBody({ tag, signature, user, data });
  expect(signedDocProblems(ok)).toEqual([]);
  expect(signedDocProblems({ ...ok, signature_image_b64: '' })).toEqual(['The approver needs to sign above']);
  expect(signedDocProblems({ ...ok, signer_name: '', tag_num: '' })).toEqual(['Choose an approver', 'Enter a tag number on the Details tab']);
});

it('posts like the captured request: JSON, the user in instantarusername, no eMachine token', async () => {
  const fetchMock = vi.fn().mockResolvedValue(json({ ok: true }));
  globalThis.fetch = fetchMock;
  const body = buildSignedDocBody({ tag, signature, user, data });
  expect(await postSignedDoc(body, 'sean@stockhamconstruction.com')).toEqual({ ok: true });
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('https://emachine.instantar.io/proxyapi/api/https://stockham.emachine.ai/stockham/create-stockham-signed-doc');
  expect(init.method).toBe('POST');
  expect(init.headers['Content-Type']).toBe('application/json');
  expect(init.headers.instantarusername).toBe('sean@stockhamconstruction.com');
  expect(init.headers.Authorization).toBeUndefined();
  expect(JSON.parse(init.body)).toEqual(sample);
});

it('turns a failed reply into a readable error, and never sends while saving is off', async () => {
  const body = buildSignedDocBody({ tag, signature, user, data });
  globalThis.fetch = vi.fn().mockResolvedValue(json({ message: 'Template missing' }, 500));
  await expect(postSignedDoc(body, 'u@x.com')).rejects.toThrow(/couldn’t be created \(500\): Template missing/);
  globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('network'));
  await expect(postSignedDoc(body, 'u@x.com')).rejects.toThrow(/Can’t reach the signed-document service/);
  apexConfig.emachine.writesEnabled = false;
  globalThis.fetch = vi.fn();
  await expect(postSignedDoc(body, 'u@x.com')).rejects.toThrow(/Read-only mode/);
  expect(globalThis.fetch).not.toHaveBeenCalled();
});

it('reads back what the document lists with the captured queries (premium switches ST/OT/DT vs POT/PDT)', async () => {
  const seen = [];
  globalThis.fetch = vi.fn(async (url) => { seen.push(sqlOf(String(url))); return json({ data: { records: [] } }); });
  await apexApi.tags.submitData({ id: '10000099', jobNo: 'A2155', isPremium: false });
  expect(seen).toContain("select *, c.CustomerName from job j JOIN customer c ON j.CustomerID = c.CustomerID where j.JobNo = 'A2155'");
  expect(seen).toContain("SELECT photo_url FROM tag_photos WHERE tag_id = 10000099 ORDER BY uploaded_at;");
  expect(seen).toContain("SELECT expenses_description AS Description, qty AS Amount FROM tag_other_expenses WHERE tag_id = 10000099 ORDER BY expenses_description;");
  expect(seen).toContain("SELECT em.description AS Description, te.qty AS Qty FROM tag_equipment te INNER JOIN equipment_master em ON em.Id = te.equipment_id WHERE te.tag_id = 10000099 ORDER BY em.description;");
  expect(seen).toContain("SELECT mm.description AS Description, TRIM(SUBSTRING_INDEX(t.TradeName, ':', 1)) AS Trade, tm.qty AS Qty, tm.length AS Length FROM tag_materials tm INNER JOIN materials_master mm ON mm.Id = tm.material_id LEFT JOIN trade t ON t.Id = mm.CostCodeID WHERE tm.tag_id = 10000099 ORDER BY mm.description;");
  const labor = seen.find((s) => s.includes('FROM tag_labor tl'));
  expect(labor).toContain('CASE WHEN 0 = 0 THEN SUM(COALESCE(tl.regularhours, 0))');
  expect(labor).toContain('CASE WHEN 0 = 1 THEN SUM(COALESCE(tl.overtime, 0)) ELSE NULL END AS POT');
  expect(labor).toContain('WHERE tl.tag_id = 10000099 GROUP BY tl.employee_id, tl.employee_name, tl.trade_id, t.TradeName ORDER BY tl.employee_name, t.TradeName;');
  seen.length = 0;
  await apexApi.tags.submitData({ id: '10000099', jobNo: 'A2155', isPremium: true });
  expect(seen.find((s) => s.includes('FROM tag_labor tl'))).toContain('CASE WHEN 1 = 0 THEN SUM(COALESCE(tl.regularhours, 0))');
});

it('after the document: leaves the status alone if eMachine already changed it, sets it only if still a draft', async () => {
  const row = (status) => json({ data: { records: [{ Id: '10000099', tag_number: 'A2155-1', status, JobNo: 'A2155' }] } });
  // already Signed by the service: no write
  const f1 = vi.fn().mockImplementation(async () => row('Submitted'));
  globalThis.fetch = f1;
  expect((await apexApi.tags.finishSubmit('10000099')).status).toBe('Submitted');
  expect(f1.mock.calls.some(([, i]) => i?.method === 'POST')).toBe(false);
  // still a draft: one status write
  let n = 0;
  const f2 = vi.fn().mockImplementation(async (u, i) => (i?.method === 'POST' ? json({}) : row(n++ < 5 ? 'Draft' : 'Submitted')));
  globalThis.fetch = f2;
  await apexApi.tags.finishSubmit('10000099');
  const posts = f2.mock.calls.filter(([, i]) => i?.method === 'POST');
  expect(posts).toHaveLength(1);
  expect(posts[0][0]).toBe('/datamodel/api/tags');
  expect(Object.fromEntries(new URLSearchParams(posts[0][1].body))).toEqual({ Id: '10000099', status: 'Submitted' });
});

const reply = {
  doc_id: 'DOC-1793413455', signer_email: 'smhubert@gmail.com',
  pdf_link: 'https://emachine-cms-bucket.s3.amazonaws.com/signature_requests/DOC-1793413455/e02942a2bf1e37a3.pdf?AWSAccessKeyId=X&Signature=A%2B&Expires=1794018256',
  sign_link: 'https://stockham.emachine.ai/stockham/sign?token=abc',
  autodesk: { status: 'ok', web_view_url: 'https://acc.autodesk.com/docs/files/projects/6c9?x=1' },
};

it('takes the signed document link (pdf_link), its expiry and the Autodesk view link from the reply', () => {
  expect(signedDocLinks(reply)).toEqual({ docId: 'DOC-1793413455', pdf: reply.pdf_link, expiresAt: 1794018256000, autodesk: reply.autodesk.web_view_url });
});

it('ignores links that are not web links, and replies without a link', () => {
  expect(signedDocLinks({ pdf_link: 'javascript:alert(1)', autodesk: { web_view_url: 'data:text/html,x' } })).toMatchObject({ pdf: '', autodesk: '' });
  expect(signedDocLinks(null)).toMatchObject({ pdf: '', docId: '', autodesk: '' });
  expect(signedDocLinks('plain text')).toMatchObject({ pdf: '' });
});

it('remembers the document for the tag in this session, until its link expires', () => {
  const store = {};
  globalThis.sessionStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; } };
  expect(recallSignedDoc('1')).toBeNull();
  rememberSignedDoc('1', signedDocLinks({ ...reply, pdf_link: 'https://x.test/a.pdf?Expires=' + (Math.floor(Date.now() / 1000) + 600) }));
  expect(recallSignedDoc('1').pdf).toMatch(/a\.pdf/);
  rememberSignedDoc('2', signedDocLinks({ ...reply, pdf_link: 'https://x.test/a.pdf?Expires=' + (Math.floor(Date.now() / 1000) - 5) }));
  expect(recallSignedDoc('2')).toBeNull();
  expect(recallSignedDoc('3')).toBeNull();
});
