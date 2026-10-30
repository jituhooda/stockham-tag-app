/**
 * Conversions between the API's tag shape and the editor's form shape.
 * The form keeps numbers as strings (what inputs hold) and gives every line a
 * stable `key` for React.
 */
let seq = 0;
export const lineKey = () => `l${Date.now().toString(36)}${(seq++).toString(36)}`;

const str = (n) => (n == null || n === '' ? '' : String(n));
/** Hours and money show two decimals, as on the paper tag ("7.00", "35.00"). */
const fixed = (n) => (n == null || n === '' ? '' : Number(n).toFixed(2));
const num = (s) => {
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

export const today = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const NEW_TAG_ID = 'new';

export const emptyLabor = () => ({ key: lineKey(), employeeId: '', employeeName: '', trade: '', regular: '', overtime: '', doubleTime: '' });
export const emptyMaterial = () => ({ key: lineKey(), description: '', qty: '', length: '' });
export const emptyEquipment = () => ({ key: lineKey(), description: '', qty: '' });
export const emptyExpense = () => ({ key: lineKey(), description: '', amount: '' });

export function newTag() {
  return {
    id: NEW_TAG_ID,
    source: 'local',
    status: 'Draft',
    editable: true,
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
    labor: [],
    materials: [],
    equipment: [],
    expenses: [],
    issues: [],
    signature: { approver: '', mode: 'in-person', email: '', image: '', signedAt: null },
    attachments: [],
  };
}

export function fromApi(t) {
  return {
    ...newTag(),
    ...t,
    tagDate: t.tagDate || '',
    labor: (t.labor || []).map((l) => ({ ...l, key: lineKey(), regular: fixed(l.regular), overtime: fixed(l.overtime), doubleTime: fixed(l.doubleTime) })),
    materials: (t.materials || []).map((l) => ({ ...l, key: lineKey(), qty: str(l.qty), length: str(l.length) })),
    equipment: (t.equipment || []).map((l) => ({ ...l, key: lineKey(), qty: str(l.qty) })),
    expenses: (t.expenses || []).map((l) => ({ ...l, key: lineKey(), amount: fixed(l.amount) })),
    signature: { ...newTag().signature, ...(t.signature || {}) },
  };
}

export function toPayload(f) {
  return {
    tagNumber: f.tagNumber.trim(),
    description: f.description,
    tagDate: f.tagDate || null,
    isPremium: !!f.isPremium,
    jobNo: f.jobNo,
    jobName: f.jobName,
    customerId: f.customerId,
    customerName: f.customerName,
    pmEmail: f.pmEmail.trim(),
    address: f.address,
    labor: f.labor.map((l) => ({
      employeeId: l.employeeId, employeeName: l.employeeName, trade: l.trade,
      regular: num(l.regular), overtime: num(l.overtime), doubleTime: num(l.doubleTime),
    })),
    materials: f.materials.map((l) => ({ description: l.description, qty: num(l.qty), length: l.length === '' ? null : num(l.length) })),
    equipment: f.equipment.map((l) => ({ description: l.description, qty: num(l.qty) })),
    expenses: f.expenses.map((l) => ({ description: l.description, amount: num(l.amount) })),
    issues: f.issues,
  };
}

export const isEditable = (tag, can) => !!tag.editable && can('tags:write');
