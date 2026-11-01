/** Checks a tag must pass before it can be submitted for signature. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Why the approver isn't signing on the spot ("Send for signature"). */
export const SEND_REASONS = ['Not Onsite', 'Refused to Sign', 'Other'];
export const DEFAULT_SEND_REASON = SEND_REASONS[0];

export function submitProblems(tag) {
  const p = [];
  if (!tag.jobNo && !tag.jobName) p.push('Select a job on the Details tab');
  if (!String(tag.description || '').trim()) p.push('Add a description on the Details tab');
  const { labor = [], materials = [], equipment = [], expenses = [] } = tag;
  if (!labor.length && !materials.length && !equipment.length && !expenses.length) p.push('Add at least one cost line');
  if (labor.some((l) => !l.employeeId)) p.push('Every labor line needs a resource');
  if (labor.some((l) => !l.tradeId)) p.push('Every labor line needs a trade');
  if (materials.some((l) => !l.materialId) || equipment.some((l) => !l.equipmentId)) p.push('Every material and equipment line needs a description');
  if (expenses.some((l) => !l.expenseId || !(Number(l.amount) > 0))) p.push('Every expense needs a type and an amount');
  return p;
}

/** Problems that stop a save: eMachine needs the chosen master record on every line. */
export const saveProblems = (tag) => submitProblems(tag).filter((m) => !/job|description on|at least one/i.test(m));

export function signatureProblems({ approver, mode, email, image, reason }) {
  const p = [];
  if (!approver?.trim()) p.push('Choose an approver');
  if (mode === 'in-person' && !image) p.push('The approver needs to sign above');
  if (mode === 'send' && !SEND_REASONS.includes(reason)) p.push('Choose a reason for sending the tag for signature');
  if (mode === 'send' && !EMAIL_RE.test(email || '')) p.push('Enter a valid email to send the tag to');
  return p;
}

/** Which tab fixes a given problem message. */
export const tabForProblem = (msg) =>
  /Details/.test(msg) ? 'details' : /cost|line|expense|resource|trade/i.test(msg) ? 'cost' : null;
