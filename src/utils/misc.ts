export const uid = () =>
  (crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

export const today = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** Normalise "2026-05-29T00:00:00.000Z" / "2026-05-29 00:00:00" to "2026-05-29". */
export const isoDate = (v: string) => (v ? v.slice(0, 10) : '');

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export const formatBytes = (n: number) =>
  n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`;
