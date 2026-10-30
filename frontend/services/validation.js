/**
 * Submit rules, mirrored from backend/apexapp/services/validation.py so the
 * user hears about problems before the round trip. The backend re-checks.
 */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function submitProblems(tag) {
  const p = [];
  if (!tag.jobNo && !tag.jobName) p.push('Select a job on the Details tab');
  if (!String(tag.description || '').trim()) p.push('Add a description on the Details tab');
  const { labor = [], materials = [], equipment = [], expenses = [] } = tag;
  if (!labor.length && !materials.length && !equipment.length && !expenses.length) p.push('Add at least one cost line');
  if (labor.some((l) => !l.employeeName)) p.push('Every labor line needs a resource');
  if ([...materials, ...equipment].some((l) => !l.description)) p.push('Every material and equipment line needs a description');
  if (expenses.some((l) => !l.description || !(Number(l.amount) > 0))) p.push('Every expense needs a type and an amount');
  return p;
}

export function signatureProblems({ approver, mode, email, image }) {
  const p = [];
  if (!approver?.trim()) p.push('Choose an approver');
  if (mode === 'in-person' && !image) p.push('The approver needs to sign above');
  if (mode === 'send' && !EMAIL_RE.test(email || '')) p.push('Enter a valid email to send the tag to');
  return p;
}

/** Which tab fixes a given problem message. */
export const tabForProblem = (msg) =>
  /Details/.test(msg) ? 'details' : /cost|line|expense|resource/i.test(msg) ? 'cost' : null;
