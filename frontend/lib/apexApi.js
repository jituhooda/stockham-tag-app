/**
 * Everything the app reads from and writes to eMachine.
 * Read queries live in config/integrations.config.json; this module maps rows
 * to the app's shapes and turns edits into the smallest set of writes.
 */
import { apexConfig } from './apexConfig';
import { formaProjectExists } from './forma';
import { ApiError, insertedId, query, runDelete, runWrites, sqlInt, sqlString, writeRequest } from './apexHttp';
import { isoDate, labelOf, num, pick, text, truthy } from '../services/fields';
import { NEW_TAG_ID, fixed, lineKey, newTag, plain } from '../services/tagModel';

const dedupe = (items) => {
  const seen = new Set();
  return items.filter((i) => i.label && !seen.has(i.label.toLowerCase()) && seen.add(i.label.toLowerCase()));
};
const unique = (items) => dedupe(items).sort((a, b) => a.label.localeCompare(b.label));

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
    createdBy: text(r, 'CreatedById'),
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
  expenses: { table: 'tag_other_expenses', fields: (l) => ({ expenses_id: l.expenseId, expenses_description: l.description, qty: n2(l.amount) }) },
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

/** A new tag, as the existing app inserts it: no Id, IsPremium only when set, tag number may be blank. */
export const insertFields = (t) => {
  const { IsPremium, ...rest } = headerFields(t);
  return { CreatedById: t.createdBy, ...rest, ...(IsPremium ? { IsPremium } : {}) };
};
export const newTagRequest = (t) => writeRequest('tags', insertFields(t));

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
    for (const line of form[key]) {
      if (line.id) {
        const prev = before.get(line.id);
        const diff = prev ? changed(fields(line), fields(prev)) : fields(line);
        if (Object.keys(diff).length) requests.push(writeRequest(table, { Id: sqlInt(line.id), ...diff }));
      } else {
        requests.push(writeRequest(table, { tag_id: tagId, ...fields(line) }));
      }
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
    // Keeps eMachine's order (Framing, Drywall, Taping, ACT, DFH).
    trades: async () => dedupe((await query('trades')).map((r) => ({ id: text(r, 'Id'), label: text(r, 'TradeName') || labelOf(r) }))),
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
    /**
     * Add a new item to the material list (the "+" next to Description). `costCodeId` is the chosen Type,
     * a trade's Id. Resolves to eMachine's new Id when the response has one, else null (reload the list to find it).
     */
    createMaterial: async ({ description, costCodeId }) => {
      const name = String(description || '').trim();
      if (!name) throw new ApiError('Enter a material name');
      if (!costCodeId) throw new ApiError('Choose a type');
      const [res] = await runWrites([writeRequest('materials_master', { description: name, CostCodeID: costCodeId })]);
      return insertedId(res);
    },
    /** Add a new item to the equipment list (the "+" next to Description). Resolves to the new Id, or null if the response has none. */
    createEquipment: async ({ description }) => {
      const name = String(description || '').trim();
      if (!name) throw new ApiError('Enter an equipment name');
      const [res] = await runWrites([writeRequest('equipment_master', { description: name })]);
      return insertedId(res);
    },
    /** Fresh customer / PM email / address for one job (used when a tag is started). */
    jobDetails: async (jobNo) => {
      const [r] = await query('jobDetails', { jobNo: sqlString(String(jobNo).slice(0, 100)) });
      return r ? { customerId: text(r, 'CustomerID', 'CustomerId'), pmEmail: text(r, 'PMEmail'), address: text(r, 'Address') } : null;
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

    /**
     * Add Tag ✓: the job's fresh details, plus whether it exists as a project in Autodesk Forma.
     * A missing project is only a warning (the tag can still be created); a failed check throws
     * after the details are loaded, as `error`, so the caller can warn and carry on.
     */
    prepareNew: async (job) => {
      const [details, forma] = await Promise.all([
        apexApi.master.jobDetails(job.jobNo).catch(() => null),
        formaProjectExists(job.jobNo).then((found) => ({ found }), (error) => ({ error })),
      ]);
      return { details, found: forma.found, error: forma.error };
    },

    /** Create a tag and its lines. */
    create: async (form) => {
      const [res] = await runWrites([newTagRequest(form)]);
      let id = insertedId(res);
      if (id == null) {
        // The insert didn't say which Id it made: take this user's newest tag for the job.
        const rows = await query('newTagId', { jobNo: sqlString(form.jobNo), createdBy: sqlString(form.createdBy) });
        id = rows.length && text(rows[0], 'Id') ? Number(text(rows[0], 'Id')) : null;
      }
      if (id == null) throw new ApiError('eMachine created the tag but didn’t return its Id; refresh the list to find it.');
      const lines = planSave({ ...form, id: String(id) }, { ...form, id: String(id), labor: [], materials: [], equipment: [], expenses: [] })
        .filter((r) => r.table !== 'tags');
      await runWrites(lines);
      return apexApi.tags.get(String(id));
    },

    /** Delete one saved cost line right away (`kind` is labor, materials, equipment or expenses). */
    deleteLine: async (kind, id) => {
      const entry = LINE_TABLES[kind];
      if (!entry) throw new ApiError(`Unknown line type “${kind}”`);
      await runDelete(entry.table, id);
    },

    /** Change only the status (submit/approve flows, once enabled). */
    setStatus: async (id, status) => {
      await runWrites([writeRequest('tags', { Id: sqlInt(id), status })]);
      return apexApi.tags.get(id);
    },
  },
};
