import { describe, expect, it } from 'vitest';
import { signatureProblems, submitProblems, tabForProblem } from '../services/validation';

const complete = {
  jobNo: '25033', jobName: 'Dragoneer', description: 'Add door',
  labor: [{ employeeName: 'Jacob' }], materials: [], equipment: [], expenses: [{ description: 'Parking', amount: '35' }],
};

describe('submitProblems', () => {
  it('accepts a complete tag', () => expect(submitProblems(complete)).toEqual([]));
  it('requires a job, description and a cost line', () => {
    expect(submitProblems({ ...complete, jobNo: '', jobName: '', description: ' ', labor: [], expenses: [] })).toEqual([
      'Select a job on the Details tab', 'Add a description on the Details tab', 'Add at least one cost line',
    ]);
  });
  it('rejects zero-amount expenses', () => {
    expect(submitProblems({ ...complete, expenses: [{ description: 'Parking', amount: '0' }] })).toContain('Every expense needs a type and an amount');
  });
});

describe('signatureProblems', () => {
  it('needs a drawing in person and an email when sending', () => {
    expect(signatureProblems({ approver: 'Sean', mode: 'in-person', image: '' })).toEqual(['The approver needs to sign above']);
    expect(signatureProblems({ approver: 'Sean', mode: 'send', email: 'bad' })).toEqual(['Enter a valid email to send the tag to']);
    expect(signatureProblems({ approver: 'Sean', mode: 'send', email: 'sean@pb.com' })).toEqual([]);
  });
});

it('maps problems to the tab that fixes them', () => {
  expect(tabForProblem('Select a job on the Details tab')).toBe('details');
  expect(tabForProblem('Every labor line needs a resource')).toBe('cost');
  expect(tabForProblem('Choose an approver')).toBeNull();
});
