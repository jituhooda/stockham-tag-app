/** Read values from eMachine rows, tolerating column-name case differences. */
export function pick(row, ...names) {
  if (!row) return undefined;
  for (const n of names) {
    const v = row[n];
    if (v != null && v !== '') return v;
  }
  const lower = new Map(Object.keys(row).map((k) => [k.toLowerCase(), k]));
  for (const n of names) {
    const k = lower.get(n.toLowerCase());
    if (k && row[k] != null && row[k] !== '') return row[k];
  }
  return undefined;
}

export const text = (row, ...names) => {
  const v = pick(row, ...names);
  return v == null ? '' : String(v).trim();
};

export const num = (row, ...names) => {
  const n = Number(pick(row, ...names));
  return Number.isFinite(n) ? n : 0;
};

export const truthy = (v) => v === true || v === 1 || ['1', 'true', 'yes', 'y'].includes(String(v ?? '').trim().toLowerCase());

export const isoDate = (v) => {
  const s = v == null ? '' : String(v).trim();
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : '';
};

/** Best human label for a master-data row. */
export function labelOf(row) {
  const direct = text(row, 'description', 'Description', 'Name', 'name', 'TradeName', 'Title');
  if (direct) return direct;
  for (const [k, v] of Object.entries(row)) {
    if (typeof v === 'string' && v.trim() && !/^id$|_id$|^id_/i.test(k)) return v.trim();
  }
  return text(row, 'Id');
}
