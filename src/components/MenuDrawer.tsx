import { useEffect, useMemo, useState } from 'react';
import { useMasterData } from '../store/MasterDataContext';
import { useTags } from '../store/TagsContext';
import { str } from '../utils/fields';
import { IconClose, IconRefresh } from './Icons';
import { Logo } from './Logo';
import { SearchSelect } from './SearchSelect';
import { useToast } from './Toast';

export function MenuDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, settings, setEmployee, reload } = useMasterData();
  const { refresh, tags } = useTags();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const employees = useMemo(
    () =>
      data.employees.rows
        .map((r) => ({
          value: str(r, 'Employee'),
          label: str(r, 'EmployeeName') || str(r, 'Employee'),
          sub: [str(r, 'Employee'), str(r, 'Division')].filter(Boolean).join(' · '),
        }))
        .filter((o) => o.value),
    [data.employees.rows],
  );
  const current = employees.find((e) => e.value === settings.employee)?.label || settings.employee;
  const localCount = tags.filter((t) => t.dirty).length;

  if (!open) return null;
  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" role="dialog" aria-label="Menu" onClick={(e) => e.stopPropagation()}>
        <div className="drawer__head">
          <Logo className="drawer__logo" />
          <button className="icon-btn" onClick={onClose} aria-label="Close menu">
            <IconClose size={22} />
          </button>
        </div>

        <section className="drawer__section">
          <label className="field-label">You are</label>
          <SearchSelect
            value={current}
            options={employees}
            loading={data.employees.loading}
            searchIcon
            allowCustom
            ariaLabel="Current employee"
            placeholder="Choose your name"
            disabled={busy}
            onChange={async (o) => {
              setBusy(true);
              try {
                await setEmployee(o.value);
                toast('Division updated');
              } catch {
                toast('Could not look up your division', 'error');
              } finally {
                setBusy(false);
              }
            }}
          />
          <p className="muted small">
            Jobs shown for division{settings.divisions.length > 1 ? 's' : ''}: <strong>{settings.divisions.join(', ')}</strong>
          </p>
        </section>

        <section className="drawer__section">
          <button
            className="btn btn--outline btn--block"
            onClick={() => {
              refresh();
              reload();
              toast('Refreshing data…');
              onClose();
            }}
          >
            <IconRefresh size={18} /> Refresh data
          </button>
          {localCount > 0 && (
            <p className="muted small">
              {localCount} tag{localCount > 1 ? 's have' : ' has'} changes saved on this device.
            </p>
          )}
        </section>

        <footer className="drawer__foot muted small">Stockham Construction · Tags V5</footer>
      </aside>
    </div>
  );
}
