import { expect, it } from 'vitest';
import { fixed, isEditable, newTag, plain } from '../services/tagModel';

it('formats numbers like the paper tag', () => {
  expect(fixed(7)).toBe('7.00');
  expect(fixed('35')).toBe('35.00');
  expect(fixed(null)).toBe('');
  expect(plain('2.0')).toBe('2');
});

it('only Draft and Rejected tags are editable', () => {
  expect(isEditable({ status: 'Draft' })).toBe(true);
  expect(isEditable({ status: 'draft' })).toBe(true);
  expect(isEditable({ status: 'Signed' })).toBe(false);
  expect(newTag().status).toBe('Draft');
});
