import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apexApi } from '../lib/apexApi';
import { apexConfig } from '../lib/apexConfig';
import { getToken, onUnauthorized, setToken, tokenClaims } from '../lib/apexHttp';
import { storage } from '../lib/storage';

const AppContext = createContext(null);

/**
 * App-wide state: who is signed in (from their eMachine token), and per-device
 * preferences (which employee you are -> which divisions' jobs to offer).
 */
export function AppProvider({ children }) {
  const [token, setTokenState] = useState(getToken);
  const [settings, setSettingsState] = useState(() =>
    storage.get(apexConfig.storageKeys.settings, { employee: '', employeeName: '', divisions: [] }),
  );

  const signIn = useCallback((value) => {
    setToken(value.trim());
    setTokenState(getToken());
  }, []);

  const signOut = useCallback(() => {
    setToken('');
    setTokenState(getToken()); // a build-time token can't be signed out of
  }, []);

  useEffect(() => onUnauthorized(() => {
    setToken('');
    setTokenState(apexConfig.emachine.token ? '' : getToken());
  }), []);

  const setSettings = useCallback((next) => {
    setSettingsState(next);
    storage.set(apexConfig.storageKeys.settings, next);
  }, []);

  const user = useMemo(() => {
    const c = tokenClaims(token);
    return { name: c.name || c.preferred_username || c.email || c.sub || 'Signed in', email: c.email || '', employee: c.employeeid || '' };
  }, [token]);

  // First run: take the employee id from the token and look up their division.
  useEffect(() => {
    if (!token || settings.employee || !user.employee) return;
    apexApi.master.division(user.employee)
      .then((r) => setSettings({ employee: user.employee, employeeName: user.name, divisions: r.divisions }))
      .catch(() => {});
  }, [token, user, settings.employee, setSettings]);

  const divisions = settings.divisions?.length ? settings.divisions : apexConfig.app.defaultDivisions;

  const value = useMemo(
    () => ({
      config: apexConfig,
      signedIn: !!token,
      canSignOut: !apexConfig.emachine.token,
      user,
      signIn,
      signOut,
      settings,
      setSettings,
      divisions,
      writesEnabled: apexConfig.emachine.writesEnabled,
    }),
    [token, user, signIn, signOut, settings, setSettings, divisions],
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
