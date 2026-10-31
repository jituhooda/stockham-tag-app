/**
 * The signed-document request (Sign tab → Submit). eMachine's service builds the document and does everything
 * downstream (Autodesk Cost change order, emails); the app only has to send it the tag's data in this shape.
 */
import { apexConfig } from './apexConfig';
import { ApiError, WritesDisabledError } from './apexHttp';

const str = (v) => (v == null ? '' : String(v));

/** A data URL (or bare base64) of a PNG → bare base64, which is what the service expects. */
export const pngBase64 = (v) => str(v).replace(/^data:image\/[a-z+.-]+;base64,/i, '').replace(/\s+/g, '');

const rows = (list, fields) => (list || []).map((r) => Object.fromEntries(fields.map((f) => [f, str(r[f])])));

/**
 * Build the JSON body. Field names, order and string-valued numbers follow the captured request.
 * `data` is what Submit gathered: { job, labor, materials, equipment, expenses, photos } (database rows)
 * plus `issues` (labels like "5 : Room has been dropped").
 */
export function buildSignedDocBody({ tag, signature, user, data }) {
  const job = data.job || {};
  return {
    description: str(tag.description),
    customer_name: str(tag.customerName || job.CustomerName),
    customer_email: str(signature.email),
    job_name: str(tag.jobName || job.JobName),
    job_address: str(tag.address || job.Address),
    job_city_zip: str(job.City),
    tag_date: str(tag.tagDate),
    job_num: str(tag.jobNo),
    tag_num: str(tag.tagNumber),
    pm_email: str(tag.pmEmail || job.PMEmail),
    originator_email: str(user.email),
    signature_image_b64: pngBase64(signature.image),
    signer_name: str(signature.approver),
    pm_name: str(job.PMName),
    issue_table: (data.issues || []).map(str),
    labor_table: rows(data.labor, ['EmployeeName', 'TradeName', 'ST', 'OT', 'DT', 'POT', 'PDT']),
    material_table: rows(data.materials, ['Description', 'Trade', 'Qty', 'Length']),
    equipment_table: rows(data.equipment, ['Description', 'Qty']),
    expense_table: rows(data.expenses, ['Description', 'Amount']),
    files_table: rows(data.photos, ['photo_url']),
  };
}

const webUrl = (v) => {
  try {
    const u = new URL(String(v));
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : '';
  } catch {
    return '';
  }
};

/** The links in the service's reply: `pdf_link` is the signed document; only web links are accepted. */
export function signedDocLinks(reply) {
  const r = reply && typeof reply === 'object' ? reply : {};
  const pdf = webUrl(r.pdf_link);
  const expires = Number(new URL(pdf || 'http://x').searchParams.get('Expires')) || 0; // the S3 link's expiry, in seconds
  return { docId: str(r.doc_id), pdf, expiresAt: expires ? expires * 1000 : 0, autodesk: webUrl(r.autodesk?.web_view_url) };
}

const KEY = (tagId) => `stockham.signedDoc.${tagId}`;

/** Keep the links for this browser session so the tag still shows its document after it reloads (it becomes read-only). */
export function rememberSignedDoc(tagId, links) {
  try { sessionStorage.setItem(KEY(tagId), JSON.stringify({ ...links, at: Date.now() })); } catch { /* storage unavailable */ }
}

export function recallSignedDoc(tagId) {
  try {
    const links = JSON.parse(sessionStorage.getItem(KEY(tagId)) || 'null');
    return links?.pdf && !(links.expiresAt && links.expiresAt < Date.now()) ? links : null;
  } catch {
    return null;
  }
}

/** What must be there before the service is called (it would produce a document with holes otherwise). */
export function signedDocProblems(body) {
  const p = [];
  if (!body.signature_image_b64) p.push('The approver needs to sign above');
  if (!body.signer_name) p.push('Choose an approver');
  if (!body.tag_num) p.push('Enter a tag number on the Details tab');
  if (!body.job_num) p.push('Select a job on the Details tab');
  return p;
}

/** Send it. Resolves to the service's reply (parsed JSON, or text). Refuses to run while saving is turned off. */
export async function postSignedDoc(body, userEmail, signal) {
  const cfg = apexConfig.submit;
  if (!apexConfig.emachine.writesEnabled) {
    console.info('[read-only] signed-document request that would have been sent:', cfg.url, { ...body, signature_image_b64: `(${body.signature_image_b64.length} chars)` });
    throw new WritesDisabledError([{ method: 'POST', url: cfg.url, table: 'signed-document' }]);
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new DOMException('timeout', 'TimeoutError')), cfg.timeoutMs);
  signal?.addEventListener('abort', () => ctrl.abort(signal.reason), { once: true });
  let res;
  try {
    res = await fetch(cfg.url, {
      method: 'POST',
      headers: { Accept: '*/*', 'Content-Type': 'application/json', instantarusername: str(userEmail) },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch (e) {
    if (signal?.aborted) throw e;
    throw new ApiError(ctrl.signal.reason?.name === 'TimeoutError'
      ? 'The signed document is taking too long. Check the tag before trying again.'
      : 'Can’t reach the signed-document service. Check your connection.');
  } finally {
    clearTimeout(timer);
  }
  const text = await res.text();
  let reply = text;
  try { reply = text ? JSON.parse(text) : null; } catch { /* plain text */ }
  if (!res.ok) {
    const detail = typeof reply === 'string' ? reply : reply?.message || reply?.error || reply?.detail;
    throw new ApiError(`The signed document couldn’t be created (${res.status})${detail ? `: ${String(detail).slice(0, 160)}` : ''}`, { status: res.status });
  }
  return reply;
}
