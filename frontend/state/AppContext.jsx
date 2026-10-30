import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apexApi } from '../lib/apexApi';
import { apexConfig } from '../lib/apexConfig';
import { onUnauthorized, setToken } from '../lib/apexHttp';
import { storage } from '../lib/storage';

const AppContext = createContext(null);

/**
 * App-wide state: public config from the backend, the signed-in user and their
 * permissions, and per-device preferences (who you are -> which divisions).
 */
export function AppProvider({ children }) {
  const [config, setConfig] = useState(null);
  const [me, setMe] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | signed-out | error
  const [error, setError] = useState('');
  const [settings, setSettingsState] = useState(() =>
    storage.get(apexConfig.storageKeys.settings, { employee: '', employeeName: '', divisions: [] }),
  );

  const load = useCallback(async () => {
    setStatus('loading');
    setError('');
    try {
      const cfg = await apexApi.config();
      setConfig(cfg);
      setMe(await apexApi.me());
      setStatus('ready');
    } catch (e) {
      if (e.status === 401) setStatus('signed-out');
      else {
        setError(e.message);
        setStatus('error');
      }
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => onUnauthorized(() => setStatus('signed-out')), []);

  const signIn = useCallback(async (token) => {
    setToken(token.trim());
    await load();
  }, [load]);

  const signOut = useCallback(() => {
    setToken('');
    setMe(null);
    setStatus(config?.auth?.mode === 'token' ? 'signed-out' : 'loading');
    if (config?.auth?.mode !== 'token') load();
  }, [config, load]);

  const setSettings = useCallback((next) => {
    setSettingsState(next);
    storage.set(apexConfig.storageKeys.settings, next);
  }, []);

  const can = useCallback((permission) => !!me?.permissions?.includes(permission), [me]);

  const divisions = settings.divisions?.length ? settings.divisions : config?.app?.defaultDivisions || ['DFH'];

  const value = useMemo(
    () => ({ config, me, status, error, reload: load, signIn, signOut, can, settings, setSettings, divisions }),
    [config, me, status, error, load, signIn, signOut, can, settings, setSettings, divisions],
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
