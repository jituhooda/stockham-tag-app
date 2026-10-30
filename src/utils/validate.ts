import type { Tag } from '../types';

/** Problems that block submitting a tag, as short user-facing messages. */
export function submitProblems(tag: Tag): string[] {
  const p: string[] = [];
  if (!tag.jobNo && !tag.jobName) p.push('Select a job on the Details tab');
  if (!tag.description.trim()) p.push('Add a description on the Details tab');
  if (!tag.labor.length && !tag.materials.length && !tag.expenses.length && !tag.equipment.length)
    p.push('Add at least one cost line');
  if (tag.labor.some((l) => !l.employeeName)) p.push('Every labor line needs a resource');
  if (tag.materials.some((l) => !l.description) || tag.equipment.some((l) => !l.description))
    p.push('Every material and equipment line needs a description');
  if (tag.expenses.some((l) => !l.description || !(Number(l.amount) > 0)))
    p.push('Every expense needs a type and an amount');
  return p;
}
