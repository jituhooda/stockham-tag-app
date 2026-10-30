import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { apexApi } from '../lib/apexApi';

const TagListContext = createContext(null);

/** The tag list, shared so the detail pane can refresh it after a save. */
export function TagListProvider({ children }) {
  const [items, setItems] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const inflight = useRef(null);

  const refresh = useCallback(async () => {
    inflight.current?.abort();
    const ctrl = new AbortController();
    inflight.current = ctrl;
    setLoading(true);
    setError('');
    try {
      const data = await apexApi.tags.list(ctrl.signal);
      setItems(data.items);
      setWarnings(data.warnings || []);
    } catch (e) {
      if (!ctrl.signal.aborted) setError(e.message);
    } finally {
      if (inflight.current === ctrl) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    return () => inflight.current?.abort();
  }, [refresh]);

  const value = useMemo(() => ({ items, warnings, loading, error, refresh }), [items, warnings, loading, error, refresh]);
  return <TagListContext.Provider value={value}>{children}</TagListContext.Provider>;
}

export function useTagList() {
  const ctx = useContext(TagListContext);
  if (!ctx) throw new Error('useTagList must be used inside TagListProvider');
  return ctx;
}
