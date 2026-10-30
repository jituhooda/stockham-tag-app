import { useCallback, useEffect, useState } from 'react';
import { apexApi } from '../lib/apexApi';

// Shared across components and kept for the session (cleared by Refresh in the menu).
const cache = new Map();

function load(key, fetcher) {
  if (!cache.has(key)) {
    const p = fetcher().catch((e) => {
      cache.delete(key); // allow a retry next time
      throw e;
    });
    cache.set(key, p);
  }
  return cache.get(key);
}

export const clearMasterDataCache = () => cache.clear();

/** Start loading a list early so it is ready when a screen asks for it. */
export const preloadMasterData = (kind) => load(kind, apexApi.master[kind]).catch(() => {});

/**
 * Reference list from eMachine: employees, materials, equipment, expenses,
 * trades, issues, or jobs (pass divisions).
 */
export function useMasterData(kind, divisions) {
  const key = kind === 'jobs' ? `jobs:${(divisions || []).join('|')}` : kind;
  const [state, setState] = useState(() => ({ data: [], loading: true, error: '' }));
  const fetcher = kind === 'jobs' ? () => apexApi.master.jobs(divisions) : apexApi.master[kind];

  /** Drop the cached list and read it again from eMachine (after adding an item). Resolves to the new list. */
  const reload = useCallback(async () => {
    cache.delete(key);
    const data = await load(key, fetcher);
    setState({ data, loading: false, error: '' });
    return data;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures divisions
  }, [key, kind]);

  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true, error: '' }));
    load(key, fetcher)
      .then((data) => live && setState({ data, loading: false, error: '' }))
      .catch((e) => live && setState({ data: [], loading: false, error: e.message }));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures divisions
  }, [key, kind]);

  return { ...state, reload };
}
