import { useEffect, useMemo, useState } from 'react';
import { useMasterData } from '../hooks/useMasterData';
import { apexApi } from '../lib/apexApi';
import { useApp } from '../state/AppContext';
import { useTagList } from '../state/TagListContext';
import { clearMasterDataCache } from '../hooks/useMasterData';
import { IconClose, IconRefresh } from './icons';
import { Logo, SearchSelect, useToast } from './ui';

export function MenuDrawer({ open, onClose }) {
  const { config, me, settings, setSettings, divisions, signOut } = useApp();
  const { refresh } = useTagList();
  const employees = useMasterData('employees');
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const options = useMemo(
    () =>
      employees.data
        .filter((e) => e.employee)
        .map((e) => ({ value: e.employee, label: e.name, sub: [e.employee, e.division].filter(Boolean).join(' · ') })),
    [employees.data],
  );

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
          <span className="field-label">You are</span>
          <SearchSelect
            value={settings.employeeName || settings.employee}
            options={options}
            loading={employees.loading}
            searchIcon
            allowCustom
            ariaLabel="Current employee"
            placeholder={employees.error ? 'Employees unavailable' : 'Choose your name'}
            disabled={busy}
            onChange={async (o) => {
              setBusy(true);
              try {
                const res = await apexApi.master.division(o.value);
                setSettings({ employee: o.value, employeeName: o.label, divisions: res.divisions });
                toast(`Showing jobs for ${res.divisions.join(', ')}`);
              } catch (e) {
                toast(e.message || 'Could not look up your division', 'error');
              } finally {
                setBusy(false);
              }
            }}
          />
          <p className="muted small">
            Jobs shown for division{divisions.length > 1 ? 's' : ''}: <strong>{divisions.join(', ')}</strong>
          </p>
        </section>

        <section className="drawer__section">
          <button
            className="btn btn--outline btn--block"
            onClick={() => {
              clearMasterDataCache();
              refresh();
              toast('Refreshing…');
              onClose();
            }}
          >
            <IconRefresh size={18} /> Refresh data
          </button>
          {config?.auth?.mode === 'token' && (
            <button className="btn btn--outline btn--block" onClick={signOut}>Sign out</button>
          )}
        </section>

        <footer className="drawer__foot muted small">
          {me && <div>Signed in as {me.name} ({me.role})</div>}
          {config?.branding?.companyName || 'Stockham Construction'} · v{config?.app?.version}
        </footer>
      </aside>
    </div>
  );
}
