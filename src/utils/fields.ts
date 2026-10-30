import type { Row } from '../api/client';

/**
 * The API's column names aren't fixed by contract, so look values up by a list
 * of likely names, case-insensitively.
 */
export function pick(row: Row | undefined, ...names: string[]): unknown {
  if (!row) return undefined;
  for (const name of names) {
    if (name in row && row[name] != null && row[name] !== '') return row[name];
  }
  const lower = new Map(Object.keys(row).map((k) => [k.toLowerCase(), k]));
  for (const name of names) {
    const key = lower.get(name.toLowerCase());
    if (key && row[key] != null && row[key] !== '') return row[key];
  }
  return undefined;
}

export function str(row: Row | undefined, ...names: string[]): string {
  const v = pick(row, ...names);
  return v == null ? '' : String(v).trim();
}

export function num(row: Row | undefined, ...names: string[]): number {
  const v = Number(pick(row, ...names));
  return Number.isFinite(v) ? v : 0;
}

const LABEL_FIELDS = [
  'Description', 'description', 'Name', 'name', 'ItemName', 'Item', 'item',
  'Material', 'MaterialName', 'Equipment', 'EquipmentName', 'Expense', 'ExpenseName',
  'ExpenseType', 'Type', 'Title', 'title',
];

/** Best human-readable label for a master-data row. */
export function labelOf(row: Row): string {
  const direct = str(row, ...LABEL_FIELDS);
  if (direct) return direct;
  for (const [k, v] of Object.entries(row)) {
    if (typeof v === 'string' && v.trim() && !/^id$|_id$|^id_/i.test(k)) return v.trim();
  }
  return String(pick(row, 'Id', 'id') ?? '');
}

export function idOf(row: Row): string {
  return String(pick(row, 'Id', 'id', 'ID') ?? labelOf(row));
}
