import { beforeEach, expect, it, vi } from 'vitest';
import { apexApi, expenseFromRow, insertFields, newTagRequest, headerFromRow, laborFromRow, materialFromRow, planSave } from '../lib/apexApi';
import { emptyEquipment, emptyExpense, emptyLabor, emptyMaterial, newTag } from '../services/tagModel';

beforeEach(() => {
  globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
});

// Rows shaped like the queries captured from the existing app.
const header = headerFromRow({ Id: 10000113, tag_number: 'D4355-1', status: 'Draft', description: 'add door', tag_date: '2026-05-29', IsPremium: 0, JobNo: '25033', JobName: 'Dragoneer 1 Letterman', CustomerID: 'C1', PMEmail: '', Address: '1 Letterman' });
const labor = laborFromRow({ Id: 10000104, employee_id: 10004953, trade_id: 10000338, TradeName: 'Taping', employee_name: 'Marin Alvarado', regularhours: '7.00', overtime: '4.00', doubletime: '0.00' });
const material = materialFromRow({ Id: 10000126, material_id: 10000059, tag_id: 10000113, qty: '2.0', length: 3, description: 'wood door' });
const expense = expenseFromRow({ Id: 10000135, qty: '35', expenses_id: 4, expense_type_description: 'Parking' });
const saved = { ...header, labor: [labor], materials: [material], equipment: [], expenses: [expense] };

it('maps captured columns', () => {
  expect(labor).toMatchObject({ id: '10000104', employeeId: '10004953', tradeId: '10000338', trade: 'Taping', regular: '7.00', overtime: '4.00' });
  expect(material).toMatchObject({ id: '10000126', materialId: '10000059', qty: '2', length: '3' });
  expect(expense).toMatchObject({ id: '10000135', expenseId: '4', amount: '35.00', description: 'Parking' });
});

it('sends nothing when nothing changed', () => {
  expect(planSave(saved, saved)).toEqual([]);
});

it('updates only changed fields, with Id', () => {
  const form = { ...saved, description: 'add door and frame', expenses: [{ ...expense, amount: '40.00' }] };
  const reqs = planSave(form, saved);
  expect(reqs.map((r) => [r.url, r.body])).toEqual([
    ['/datamodel/api/tags', 'Id=10000113&description=add+door+and+frame'],
    ['/datamodel/api/tag_other_expenses', 'Id=10000135&qty=40.00'],
  ]);
});

it('inserts new lines with tag_id and all fields (matches the captured labor insert)', () => {
  const added = { ...emptyLabor(), employeeId: '10004991', employeeName: 'Gabriel A Atencio', tradeId: '10000338' };
  const [req] = planSave({ ...saved, labor: [labor, added] }, saved);
  expect(req.url).toBe('/datamodel/api/tag_labor');
  expect(Object.fromEntries(new URLSearchParams(req.body))).toEqual({
    tag_id: '10000113', employee_id: '10004991', employee_name: 'Gabriel A Atencio', trade_id: '10000338',
    regularhours: '0.00', overtime: '0.00', doubletime: '0.00',
  });
});

it('lists employees by name and saves the row Id (not the employee number) as employee_id', async () => {
  globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { records: [
    { Id: '10005792', Employee: 'A0K', EmployeeName: 'Adolfo Medina-Lopez', Status: 'Active Status', FEID: '2387', Division: 'DW' },
  ] } })));
  const [emp] = await apexApi.master.employees();
  expect(emp).toMatchObject({ id: '10005792', name: 'Adolfo Medina-Lopez', employee: 'A0K' });

  // What the Resource picker puts on the line: value = Id, label = name.
  const line = { ...emptyLabor(), employeeId: emp.id, employeeName: emp.name, tradeId: '10000337', regular: '8' };
  const [req] = planSave({ ...saved, labor: [labor, line] }, saved);
  const body = Object.fromEntries(new URLSearchParams(req.body));
  expect(body.employee_id).toBe('10005792');
  expect(body.employee_name).toBe('Adolfo Medina-Lopez');
});

it('lists materials and equipment by description, and saves the row Id as material_id / equipment_id', async () => {
  globalThis.fetch = vi.fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ data: { records: [{ Id: '10000059', description: 'wood door' }] } })))
    .mockResolvedValueOnce(new Response(JSON.stringify({ data: { records: [{ Id: '10000001', description: 'Boom Lift' }] } })));
  const [mat] = await apexApi.master.materials();
  const [eqp] = await apexApi.master.equipment();
  expect(mat).toMatchObject({ id: '10000059', label: 'wood door' });
  expect(eqp).toMatchObject({ id: '10000001', label: 'Boom Lift' });

  const material = { ...emptyMaterial(), materialId: mat.id, description: mat.label, qty: '2', length: '3' };
  const equipment = { ...emptyEquipment(), equipmentId: eqp.id, description: eqp.label, qty: '1' };
  const reqs = planSave({ ...saved, materials: [...saved.materials, material], equipment: [equipment] }, saved);
  const bodies = Object.fromEntries(reqs.map((r) => [r.table, Object.fromEntries(new URLSearchParams(r.body))]));
  expect(bodies.tag_materials).toEqual({ tag_id: '10000113', material_id: '10000059', qty: '2', length: '3' });
  expect(bodies.tag_equipment).toEqual({ tag_id: '10000113', equipment_id: '10000001', qty: '1' });
});

// The five POSTs the existing app sent when saving a brand-new tag (id 10000114), lines first, then the tag.
it('saves a new tag with exactly the fields the existing app sends', () => {
  const tag = {
    ...newTag(), id: '10000114', createdBy: 'Sean Hubert', tagNumber: '', description: '9999', status: 'Draft', tagDate: '2026-05-29',
    jobNo: 'D4209', jobName: '1 Embarcadero Ste 3820 25-1076', customerId: '1148', pmEmail: 'cameron@stockhamconstruction.com',
    address: '1 Sansome Floors 28/29/40',
    labor: [{ ...emptyLabor(), employeeId: '10004933', employeeName: 'Jacob S Adams', tradeId: '10000336', regular: '9', overtime: '9', doubleTime: '9' }],
    materials: [{ ...emptyMaterial(), materialId: '10000057', description: 'box of mud', qty: '9', length: '9' }],
    equipment: [{ ...emptyEquipment(), equipmentId: '10000000', description: 'Scissor Lift', qty: '9' }],
    expenses: [{ ...emptyExpense(), expenseId: '10000032', description: 'Parking', amount: '9' }],
  };
  const body = (r) => Object.fromEntries(new URLSearchParams(r.body));

  const tagReq = newTagRequest(tag);
  expect(tagReq.url).toBe('/datamodel/api/tags');
  expect(body(tagReq)).toEqual({
    CreatedById: 'Sean Hubert', tag_number: '', description: '9999', status: 'Draft', tag_date: '2026-05-29',
    JobName: '1 Embarcadero Ste 3820 25-1076', CustomerID: '1148', PMEmail: 'cameron@stockhamconstruction.com',
    JobNo: 'D4209', JobAddress: '1 Sansome Floors 28/29/40',
  });

  const empty = { ...tag, labor: [], materials: [], equipment: [], expenses: [] };
  const lines = Object.fromEntries(planSave(tag, empty).filter((r) => r.table !== 'tags').map((r) => [r.table, body(r)]));
  expect(lines.tag_labor).toEqual({ tag_id: '10000114', employee_id: '10004933', employee_name: 'Jacob S Adams', trade_id: '10000336', regularhours: '9.00', overtime: '9.00', doubletime: '9.00' });
  expect(lines.tag_materials).toEqual({ tag_id: '10000114', material_id: '10000057', qty: '9', length: '9' });
  expect(lines.tag_equipment).toEqual({ tag_id: '10000114', equipment_id: '10000000', qty: '9' });
  expect(lines.tag_other_expenses).toEqual({ tag_id: '10000114', expenses_id: '10000032', expenses_description: 'Parking', qty: '9.00' });
});

it('sends IsPremium on a new tag only when it is premium', () => {
  expect(insertFields({ ...newTag(), createdBy: 'x' })).not.toHaveProperty('IsPremium');
  expect(insertFields({ ...newTag(), createdBy: 'x', isPremium: true }).IsPremium).toBe(1);
});

it('saving does not send anything for a line that is simply gone from the form (it was deleted when confirmed)', () => {
  expect(planSave({ ...saved, materials: [] }, saved)).toEqual([]);
});

it('rejects non-numeric tag ids', () => {
  expect(() => planSave({ ...saved, id: '1 OR 1=1' }, saved)).toThrow(/Invalid id/);
});

it('does not send writes when the app is read-only', async () => {
  vi.resetModules();
  const fetchMock = vi.fn();
  globalThis.fetch = fetchMock;
  vi.spyOn(console, 'info').mockImplementation(() => {});
  const { apexApi } = await import('../lib/apexApi');
  await expect(apexApi.tags.save({ ...saved, description: 'x' }, saved)).rejects.toThrow(/Read-only mode/);
  expect(fetchMock).not.toHaveBeenCalled();
});
