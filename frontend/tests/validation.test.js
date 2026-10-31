import { describe, expect, it } from 'vitest';
import { saveProblems, signatureProblems, submitProblems, tabForProblem } from '../services/validation';

const complete = {
  jobNo: '25033', jobName: 'Dragoneer', description: 'Add door',
  labor: [{ employeeId: '10004953', employeeName: 'Marin Alvarado', tradeId: '10000338' }],
  materials: [], equipment: [], expenses: [{ expenseId: '1', description: 'Parking', amount: '35' }],
};

describe('submitProblems', () => {
  it('accepts a complete tag', () => expect(submitProblems(complete)).toEqual([]));
  it('requires a job, description and a cost line', () => {
    expect(submitProblems({ ...complete, jobNo: '', jobName: '', description: ' ', labor: [], expenses: [] })).toEqual([
      'Select a job on the Details tab', 'Add a description on the Details tab', 'Add at least one cost line',
    ]);
  });
  it('requires picked master records', () => {
    const p = submitProblems({ ...complete, labor: [{ employeeId: '', tradeId: '' }] });
    expect(p).toContain('Every labor line needs a resource');
    expect(p).toContain('Every labor line needs a trade');
  });
});

it('saveProblems only blocks lines eMachine could not store', () => {
  expect(saveProblems({ ...complete, description: '', labor: [], expenses: [] })).toEqual([]);
  expect(saveProblems({ ...complete, materials: [{ materialId: '' }] })).toEqual(['Every material and equipment line needs a description']);
});

it('signatureProblems', () => {
  expect(signatureProblems({ approver: 'Sean', mode: 'in-person', image: '' })).toEqual(['The approver needs to sign above']);
  expect(signatureProblems({ approver: 'Sean', mode: 'send', email: 'sean@pb.com' })).toEqual([]);
});

it('maps problems to tabs', () => {
  expect(tabForProblem('Select a job on the Details tab')).toBe('details');
  expect(tabForProblem('Every labor line needs a trade')).toBe('cost');
});
