import { expect, it } from 'vitest';
import { fromApi, newTag, toPayload } from '../services/tagModel';

it('round-trips a tag through the form shape', () => {
  const api = {
    ...newTag(), id: '7', tagNumber: 'T-7',
    labor: [{ employeeId: '1', employeeName: 'Jacob', trade: 'Framing', regular: 7, overtime: 4, doubleTime: 0 }],
    materials: [{ description: 'wood door', qty: 2, length: null }],
    equipment: [{ description: 'Scissor Lift', qty: 3 }],
    expenses: [{ description: 'Parking', amount: 35 }],
  };
  const form = fromApi(api);
  expect(form.labor[0].regular).toBe('7.00');
  expect(form.materials[0].length).toBe('');
  expect(form.labor[0].key).toBeTruthy();

  const payload = toPayload(form);
  expect(payload.labor[0]).toEqual({ employeeId: '1', employeeName: 'Jacob', trade: 'Framing', regular: 7, overtime: 4, doubleTime: 0 });
  expect(payload.materials[0]).toEqual({ description: 'wood door', qty: 2, length: null });
  expect(payload).not.toHaveProperty('id');
});

it('turns blank or negative numbers into zero', () => {
  const form = { ...newTag(), expenses: [{ key: 'a', description: 'x', amount: '' }], equipment: [{ key: 'b', description: 'y', qty: '-2' }] };
  const p = toPayload(form);
  expect(p.expenses[0].amount).toBe(0);
  expect(p.equipment[0].qty).toBe(0);
});
