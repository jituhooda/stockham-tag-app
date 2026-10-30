import { useEffect, useMemo, useState } from 'react';
import { clearMasterDataCache, useMasterData } from '../hooks/useMasterData';
import { apexApi } from '../lib/apexApi';
import { useApp } from '../state/AppContext';
import { useTagList } from '../state/TagListContext';
import { IconClose, IconRefresh } from './icons';
import { Logo, SearchSelect, useToast } from './ui';

export function MenuDrawer({ open, onClose }) {
  const { config, user, settings, setSettings, divisions, signOut, canSignOut, writesEnabled } = useApp();
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
    () => employees.data.filter((e) => e.employee).map((e) => ({ value: e.employee, label: e.name, sub: [e.employee, e.division].filter(Boolean).join(' · ') })),
    [employees.data],
  );

  if (!open) return null;
  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" role="dialog" aria-label="Menu" onClick={(e) => e.stopPropagation()}>
        <div className="drawer__head">
          <Logo className="drawer__logo" />
          <button className="icon-btn" onClick={onClose} aria-label="Close menu"><IconClose size={22} /></button>
        </div>

        <section className="drawer__section">
          <span className="field-label">Show jobs for</span>
          <SearchSelect
            value={settings.employeeName || settings.employee}
            options={options}
            loading={employees.loading}
            searchIcon
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
                toast(e.message || 'Could not look up the division', 'error');
              } finally {
                setBusy(false);
              }
            }}
          />
          <p className="muted small">Division{divisions.length > 1 ? 's' : ''}: <strong>{divisions.join(', ')}</strong></p>
        </section>

        <section className="drawer__section">
          <button className="btn btn--outline btn--block" onClick={() => { clearMasterDataCache(); refresh(); toast('Refreshing…'); onClose(); }}>
            <IconRefresh size={18} /> Refresh data
          </button>
          {canSignOut && <button className="btn btn--outline btn--block" onClick={signOut}>Sign out</button>}
        </section>

        <footer className="drawer__foot muted small">
          <div>Signed in as {user.name}</div>
          <div>{writesEnabled ? 'Saving to eMachine is on' : 'Read-only mode (saving to eMachine is off)'}</div>
          {config.branding.companyName} · v{config.app.version}
        </footer>
      </aside>
    </div>
  );
}
