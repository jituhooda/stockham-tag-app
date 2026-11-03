import { useEffect } from 'react';
import { useApp } from '../state/AppContext';
import { isMobile } from '../lib/platform';
import { IconClose, IconUser } from './icons';
import { Logo } from './ui';

// On a phone, logging out hands over to the Stockham app.
const LOGOUT_URL = 'stockham://emachine.ai/';

export function MenuDrawer({ open, onClose }) {
  const { config, user, signOut, canSignOut, writesEnabled } = useApp();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const logout = async () => {
    onClose();
    await signOut();
    if (isMobile()) window.location.href = LOGOUT_URL;
  };

  if (!open) return null;
  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" role="dialog" aria-label="Menu" onClick={(e) => e.stopPropagation()}>
        <div className="drawer__head">
          <Logo className="drawer__logo" />
          <button className="icon-btn" onClick={onClose} aria-label="Close menu"><IconClose size={22} /></button>
        </div>

        <section className="drawer__account" aria-label="Signed-in user">
          <span className="drawer__avatar"><IconUser size={34} /></span>
          <strong className="drawer__user">{user.name}</strong>
          {user.email && <span className="drawer__email">{user.email}</span>}
          {canSignOut && <button className="drawer__logout" onClick={logout}>Logout</button>}
        </section>

        <footer className="drawer__foot muted small">
          {!writesEnabled && <div>Saving to eMachine is off</div>}
          {config.branding.companyName} · v{config.app.version}
        </footer>
      </aside>
    </div>
  );
}
