/**
 * The editor's tag shape. Numbers are kept as strings (what inputs hold);
 * `id` fields are eMachine Ids (empty for rows not saved yet); every line has
 * a stable React `key`.
 */
import { apexConfig } from '../lib/apexConfig';

let seq = 0;
export const lineKey = () => `l${Date.now().toString(36)}${(seq++).toString(36)}`;

export const NEW_TAG_ID = 'new';

export const today = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** "7" -> "7.00": hours and money show two decimals, as on the paper tag. */
export const fixed = (n) => (n == null || n === '' ? '' : Number(n).toFixed(2));
export const plain = (n) => (n == null || n === '' ? '' : String(Number(n)));

export const emptyLabor = () => ({ key: lineKey(), id: '', employeeId: '', employeeName: '', tradeId: '', trade: '', regular: '', overtime: '', doubleTime: '' });
export const emptyMaterial = () => ({ key: lineKey(), id: '', materialId: '', description: '', qty: '', length: '' });
export const emptyEquipment = () => ({ key: lineKey(), id: '', equipmentId: '', description: '', qty: '' });
export const emptyExpense = () => ({ key: lineKey(), id: '', expenseId: '', description: '', amount: '' });

/** The tag fields that come from a job row (master data). */
export const jobFields = (j, fallbackEmail = '') => ({
  jobNo: j.jobNo,
  jobName: j.jobName,
  customerId: j.customerId,
  customerName: j.customerName,
  address: j.address,
  pmEmail: j.pmEmail || fallbackEmail,
});

export const emptyIssue = () => ({ key: lineKey(), id: '', issueId: '', displayId: '', label: '' });

export function newTag() {
  return {
    id: NEW_TAG_ID,
    status: 'Draft',
    tagNumber: '',
    description: '',
    tagDate: today(),
    isPremium: false,
    jobNo: '',
    jobName: '',
    customerId: '',
    customerName: '',
    pmEmail: '',
    address: '',
    createdBy: '',
    lastModified: '',
    labor: [],
    materials: [],
    equipment: [],
    expenses: [],
    issues: [],
    issuesLoaded: true, // a saved tag's issues are read when the Issues tab opens
    signature: { approverId: '', approver: '', email: '', mode: 'in-person', image: '' },
    attachments: [],
  };
}

export const isEditable = (tag) => apexConfig.editableStatuses.some((s) => s.toLowerCase() === String(tag.status || '').toLowerCase());

/** Lines that exist in eMachine (have an Id). */
export const isSaved = (line) => !!line.id;
