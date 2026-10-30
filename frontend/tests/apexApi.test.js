import { beforeEach, expect, it, vi } from 'vitest';
import { expenseFromRow, headerFromRow, laborFromRow, materialFromRow, planSave } from '../lib/apexApi';
import { emptyLabor } from '../services/tagModel';

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

it('refuses to drop saved lines until delete is connected', () => {
  expect(() => planSave({ ...saved, materials: [] }, saved)).toThrow(/Removing saved lines/);
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
