/**
 * Everything the app reads from and writes to eMachine.
 * Read queries live in config/integrations.config.json; this module maps rows
 * to the app's shapes and turns edits into the smallest set of writes.
 */
import { apexConfig } from './apexConfig';
import { ApiError, insertedId, query, runWrites, sqlInt, sqlString, writeRequest } from './apexHttp';
import { isoDate, labelOf, num, pick, text, truthy } from '../services/fields';
import { NEW_TAG_ID, fixed, lineKey, newTag, plain } from '../services/tagModel';

const unique = (items) => {
  const seen = new Set();
  return items
    .filter((i) => i.label && !seen.has(i.label.toLowerCase()) && seen.add(i.label.toLowerCase()))
    .sort((a, b) => a.label.localeCompare(b.label));
};

const masterItem = (r) => {
  const amount = pick(r, 'Amount', 'Rate', 'Cost', 'Price', 'DefaultAmount');
  return { id: text(r, 'Id'), label: labelOf(r), defaultAmount: amount != null && Number.isFinite(Number(amount)) ? Number(amount) : null };
};

/* ------------------------------------------------------------------ mapping */

export function summaryFromRow(r) {
  return {
    id: text(r, 'Id'),
    tagNumber: text(r, 'tag_number'),
    status: text(r, 'status') || 'Draft',
    description: text(r, 'description'),
    tagDate: isoDate(pick(r, 'tag_date')),
    jobNo: text(r, 'JobNo'),
    jobName: text(r, 'JobName'),
    updatedAt: isoDate(pick(r, 'LastModifiedDate')),
    counts: {
      labor: num(r, 'labor_count'),
      material: num(r, 'material_count'),
      equipment: num(r, 'equipment_count'),
      expense: num(r, 'expense_count'),
    },
  };
}

export function headerFromRow(r) {
  return {
    ...newTag(),
    id: text(r, 'Id'),
    tagNumber: text(r, 'tag_number'),
    status: text(r, 'status') || 'Draft',
    description: text(r, 'description'),
    tagDate: isoDate(pick(r, 'tag_date')),
    isPremium: truthy(pick(r, 'IsPremium')),
    jobNo: text(r, 'JobNo'),
    jobName: text(r, 'JobName'),
    customerId: text(r, 'CustomerID'),
    pmEmail: text(r, 'PMEmail'),
    address: text(r, 'Address', 'JobAddress'),
    lastModified: isoDate(pick(r, 'LastModifiedDate')),
  };
}

export const laborFromRow = (r) => ({
  key: lineKey(),
  id: text(r, 'Id'),
  employeeId: text(r, 'employee_id'),
  employeeName: text(r, 'employee_name'),
  tradeId: text(r, 'trade_id'),
  trade: text(r, 'TradeName'),
  regular: fixed(pick(r, 'regularhours')),
  overtime: fixed(pick(r, 'overtime')),
  doubleTime: fixed(pick(r, 'doubletime')),
});

export const materialFromRow = (r) => ({
  key: lineKey(),
  id: text(r, 'Id'),
  materialId: text(r, 'material_id'),
  description: text(r, 'description'),
  qty: plain(pick(r, 'qty')),
  length: plain(pick(r, 'length')),
});

export const equipmentFromRow = (r) => ({
  key: lineKey(),
  id: text(r, 'Id'),
  equipmentId: text(r, 'equipment_id'),
  description: text(r, 'description'),
  qty: plain(pick(r, 'qty')),
});

// eMachine keeps the expense amount in `qty`.
export const expenseFromRow = (r) => ({
  key: lineKey(),
  id: text(r, 'Id'),
  expenseId: text(r, 'expenses_id'),
  description: text(r, 'expense_type_description', 'expenses_description'),
  amount: fixed(pick(r, 'qty')),
});

/* ------------------------------------------------------------------ writes */

const n2 = (v) => (v === '' || v == null ? '0.00' : Number(v).toFixed(2));
const nPlain = (v) => (v === '' || v == null ? '0' : String(Number(v)));

/** eMachine field values for each table, from an editor line. */
export const LINE_TABLES = {
  labor: {
    table: 'tag_labor',
    fields: (l) => ({
      employee_id: l.employeeId, employee_name: l.employeeName, trade_id: l.tradeId,
      regularhours: n2(l.regular), overtime: n2(l.overtime), doubletime: n2(l.doubleTime),
    }),
  },
  materials: { table: 'tag_materials', fields: (l) => ({ material_id: l.materialId, qty: nPlain(l.qty), length: l.length === '' ? undefined : nPlain(l.length) }) },
  equipment: { table: 'tag_equipment', fields: (l) => ({ equipment_id: l.equipmentId, qty: nPlain(l.qty) }) },
  expenses: { table: 'tag_other_expenses', fields: (l) => ({ expenses_id: l.expenseId, qty: n2(l.amount) }) },
};

export const headerFields = (t) => ({
  tag_number: t.tagNumber.trim(),
  status: t.status,
  description: t.description,
  tag_date: t.tagDate,
  IsPremium: t.isPremium ? 1 : 0,
  JobNo: t.jobNo,
  JobName: t.jobName,
  CustomerID: t.customerId,
  PMEmail: t.pmEmail.trim(),
  JobAddress: t.address,
});

function changed(next, prev) {
  const out = {};
  for (const [k, v] of Object.entries(next)) if (String(v ?? '') !== String(prev[k] ?? '')) out[k] = v;
  return out;
}

/**
 * Work out the eMachine writes for saving `form` over `saved` (an existing tag).
 * Updates send only changed fields plus `Id`; new lines send everything plus `tag_id`.
 */
export function planSave(form, saved) {
  const tagId = sqlInt(form.id);
  const requests = [];
  const header = changed(headerFields(form), headerFields(saved));
  if (Object.keys(header).length) requests.push(writeRequest('tags', { Id: tagId, ...header }));

  for (const [key, { table, fields }] of Object.entries(LINE_TABLES)) {
    const before = new Map(saved[key].filter((l) => l.id).map((l) => [l.id, l]));
    const kept = new Set();
    for (const line of form[key]) {
      if (line.id) {
        kept.add(line.id);
        const prev = before.get(line.id);
        const diff = prev ? changed(fields(line), fields(prev)) : fields(line);
        if (Object.keys(diff).length) requests.push(writeRequest(table, { Id: sqlInt(line.id), ...diff }));
      } else {
        requests.push(writeRequest(table, { tag_id: tagId, ...fields(line) }));
      }
    }
    const removed = [...before.keys()].filter((id) => !kept.has(id));
    if (removed.length && !apexConfig.features.deleteLines) {
      throw new ApiError('Removing saved lines isn’t connected to eMachine yet. Reload the tag to undo the removal.');
    }
  }
  return requests;
}

/* ------------------------------------------------------------------ API */

export const apexApi = {
  master: {
    employees: async () =>
      (await query('employees'))
        .map((r) => ({ id: text(r, 'Id'), employee: text(r, 'Employee'), name: text(r, 'EmployeeName') || text(r, 'Employee'), division: text(r, 'Division') }))
        .filter((e) => e.id)
        .sort((a, b) => a.name.localeCompare(b.name)),
    trades: async () => unique((await query('trades')).map((r) => ({ id: text(r, 'Id'), label: text(r, 'TradeName') || labelOf(r) }))),
    materials: async () => unique((await query('materials')).map(masterItem)),
    equipment: async () => unique((await query('equipment')).map(masterItem)),
    expenses: async () => unique((await query('expenses')).map(masterItem)),
    issues: async () => (apexConfig.emachine.queries.issues ? (await query('issues')).map((r) => ({ label: labelOf(r) })) : []),
    jobs: async (divisions) => {
      const list = (divisions?.length ? divisions : apexConfig.app.defaultDivisions).slice(0, 20);
      return (await query('jobs', { divisions: list.map(sqlString).join(',') })).map((r) => ({
        jobNo: text(r, 'JobNo'),
        jobName: text(r, 'JobName'),
        label: text(r, 'CJobName') || `${text(r, 'JobNo')} : ${text(r, 'JobName')}`,
        customerId: text(r, 'CustomerID', 'CustomerId'),
        customerName: text(r, 'CustomerName'),
        address: text(r, 'Address', 'JobAddress'),
        pmEmail: text(r, 'PMEmail', 'PM_Email', 'ProjectManagerEmail'),
      }));
    },
    division: async (employee) => {
      const rows = await query('division', { employee: sqlString(String(employee).slice(0, 100)) });
      const found = [...new Set(rows.map((r) => text(r, 'Division')).filter(Boolean))];
      return { employee, divisions: found.length ? found : apexConfig.app.defaultDivisions };
    },
  },

  tags: {
    list: async (signal) => (await query('tags', {}, signal)).map(summaryFromRow).filter((t) => t.id),

    get: async (id, signal) => {
      if (id === NEW_TAG_ID) return newTag();
      const tagId = sqlInt(id);
      const [head, labor, materials, equipment, expenses] = await Promise.all([
        query('tag', { tagId }, signal),
        query('tagLabor', { tagId }, signal),
        query('tagMaterials', { tagId }, signal),
        query('tagEquipment', { tagId }, signal),
        query('tagExpenses', { tagId }, signal),
      ]);
      if (!head.length) throw new ApiError('Tag not found', { status: 404 });
      return {
        ...headerFromRow(head[0]),
        labor: labor.map(laborFromRow),
        materials: materials.map(materialFromRow),
        equipment: equipment.map(equipmentFromRow),
        expenses: expenses.map(expenseFromRow),
      };
    },

    /** Save edits; resolves to the tag as eMachine now has it. */
    save: async (form, saved) => {
      if (form.id === NEW_TAG_ID) return apexApi.tags.create(form);
      const requests = planSave(form, saved);
      await runWrites(requests);
      return apexApi.tags.get(form.id);
    },

    /** Create a tag and its lines. Disabled until the insert API is confirmed (features.createTags). */
    create: async (form) => {
      if (!apexConfig.features.createTags) {
        throw new ApiError('Creating new tags in eMachine isn’t connected yet. Edit an existing tag instead.');
      }
      if (!form.tagNumber.trim()) throw new ApiError('Enter a tag number on the Details tab');
      const [res] = await runWrites([writeRequest('tags', headerFields(form))]);
      let id = insertedId(res);
      if (id == null) {
        const rows = await query('tagByNumber', { tagNumber: sqlString(form.tagNumber.trim()) });
        id = rows.length ? Number(text(rows[0], 'Id')) : null;
      }
      if (id == null) throw new ApiError('eMachine created the tag but didn’t return its Id; refresh the list to find it.');
      const lines = planSave({ ...form, id: String(id) }, { ...form, id: String(id), labor: [], materials: [], equipment: [], expenses: [] })
        .filter((r) => r.table !== 'tags');
      await runWrites(lines);
      return apexApi.tags.get(String(id));
    },

    /** Change only the status (submit/approve flows, once enabled). */
    setStatus: async (id, status) => {
      await runWrites([writeRequest('tags', { Id: sqlInt(id), status })]);
      return apexApi.tags.get(id);
    },
  },
};
