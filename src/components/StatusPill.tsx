export function StatusPill({ status }: { status: string }) {
  const key = status.toLowerCase().replace(/[^a-z]/g, '');
  return <span className={`status-pill status-pill--${key}`}>{status || 'Draft'}</span>;
}
