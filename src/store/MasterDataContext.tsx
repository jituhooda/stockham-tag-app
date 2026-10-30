import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Row } from '../api/client';
import { runQuery } from '../api/client';
import { Q } from '../api/queries';
import { str } from '../utils/fields';
import { load, save } from './storage';

const SETTINGS_KEY = 'stockham.settings.v1';
const ISSUES_QUERY = import.meta.env.VITE_ISSUES_QUERY || '';

export interface Settings {
  /** Employee value used to look up the user's division (e.g. "Sean"). */
  employee: string;
  /** Divisions whose jobs are offered; resolved from `employee`, DFH by default. */
  divisions: string[];
}

interface Dataset {
  rows: Row[];
  loading: boolean;
  error: string;
}

type Key = 'employees' | 'materials' | 'equipment' | 'expenses' | 'laborRates' | 'jobs' | 'issues';

interface MasterState {
  data: Record<Key, Dataset>;
  settings: Settings;
  setEmployee: (employee: string) => Promise<void>;
  reload: () => void;
}

const empty: Dataset = { rows: [], loading: true, error: '' };
const Ctx = createContext<MasterState | null>(null);

export function MasterDataProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() =>
    load<Settings>(SETTINGS_KEY, { employee: '', divisions: ['DFH'] }),
  );
  const [data, setData] = useState<Record<Key, Dataset>>({
    employees: empty,
    materials: empty,
    equipment: empty,
    expenses: empty,
    laborRates: empty,
    jobs: empty,
    issues: { rows: [], loading: !!ISSUES_QUERY, error: '' },
  });
  const [nonce, setNonce] = useState(0);

  const fetchInto = useCallback((key: Key, sql: string) => {
    setData((d) => ({ ...d, [key]: { ...d[key], loading: true, error: '' } }));
    runQuery(sql)
      .then((rows) => setData((d) => ({ ...d, [key]: { rows, loading: false, error: '' } })))
      .catch((e: Error) =>
        setData((d) => ({ ...d, [key]: { rows: d[key].rows, loading: false, error: e.message } })),
      );
  }, []);

  useEffect(() => {
    fetchInto('employees', Q.employees);
    fetchInto('materials', Q.materials);
    fetchInto('equipment', Q.equipment);
    fetchInto('expenses', Q.expenses);
    fetchInto('laborRates', Q.laborRates);
    if (ISSUES_QUERY) fetchInto('issues', ISSUES_QUERY);
  }, [fetchInto, nonce]);

  const divisionsKey = settings.divisions.join('|');
  useEffect(() => {
    fetchInto('jobs', Q.jobs(settings.divisions.length ? settings.divisions : ['DFH']));
  }, [fetchInto, divisionsKey, nonce]);

  const setEmployee = useCallback(async (employee: string) => {
    let divisions = ['DFH'];
    if (employee.trim()) {
      const rows = await runQuery(Q.division(employee.trim()));
      const found = [...new Set(rows.map((r) => str(r, 'Division')).filter(Boolean))];
      if (found.length) divisions = found;
    }
    const next = { employee: employee.trim(), divisions };
    save(SETTINGS_KEY, next);
    setSettings(next);
  }, []);

  const value = useMemo<MasterState>(
    () => ({ data, settings, setEmployee, reload: () => setNonce((n) => n + 1) }),
    [data, settings, setEmployee],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMasterData() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useMasterData must be used inside MasterDataProvider');
  return ctx;
}
