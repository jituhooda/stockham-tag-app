import { useState } from 'react';
import { apexConfig } from '../lib/apexConfig';
import { isStandalone, platform } from '../lib/platform';
import { storage } from '../lib/storage';
import { IconClose } from './icons';

/**
 * iPhone browsers always draw their own bars around a web page. Only the Home Screen
 * icon opens the app full screen, so point people to the install guide once.
 */
export function InstallHint() {
  const key = apexConfig.storageKeys.installHintDismissed;
  const [dismissed, setDismissed] = useState(() => storage.get(key, false));
  if (dismissed || platform() !== 'ios' || isStandalone()) return null;

  const dismiss = () => {
    storage.set(key, true);
    setDismissed(true);
  };
  return (
    <div className="install-hint" role="status">
      <span className="install-hint__text">For full screen, add this app to your Home Screen. <a href="/install">Show me how</a></span>
      <button className="icon-btn" onClick={dismiss} aria-label="Dismiss"><IconClose size={18} /></button>
    </div>
  );
}
