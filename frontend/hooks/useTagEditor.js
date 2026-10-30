import { useCallback, useEffect, useRef, useState } from 'react';
import { apexApi } from '../lib/apexApi';
import { NEW_TAG_ID } from '../services/tagModel';

/**
 * Loads one tag from eMachine and holds the user's unsaved edits.
 * `form` is the editable copy; `saved` is what eMachine last returned.
 */
export function useTagEditor(id, initial) {
  const [saved, setSaved] = useState(null);
  const [form, setForm] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    setDirty(false);
    apexApi.tags
      .get(id, ctrl.signal)
      .then((t) => {
        const start = id === NEW_TAG_ID && initial ? { ...t, ...initial } : t;
        setSaved(start);
        setForm(start);
      })
      .catch((e) => !ctrl.signal.aborted && setError(e))
      .finally(() => !ctrl.signal.aborted && setLoading(false));
    return () => ctrl.abort();
    // `initial` only seeds a new tag on first load; later changes must not reload it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /** Patch the form: an object, or a function of the current form. */
  const edit = useCallback((patch) => {
    setForm((f) => ({ ...f, ...(typeof patch === 'function' ? patch(f) : patch) }));
    setDirty(true);
  }, []);

  const accept = useCallback((t) => {
    // Keep things eMachine doesn't store yet (issues, approver, signature) across reloads.
    setForm((f) => ({ ...t, issues: f?.issues ?? [], signature: f?.signature ?? t.signature }));
    setSaved(t);
    setDirty(false);
    dirtyRef.current = false; // callers often navigate before the next render
    return t;
  }, []);

  const save = useCallback(async () => {
    setBusy(true);
    try {
      return accept(await apexApi.tags.save(form, saved));
    } finally {
      setBusy(false);
    }
  }, [form, saved, accept]);

  const discard = useCallback(() => {
    setForm(saved);
    setDirty(false);
    dirtyRef.current = false;
  }, [saved]);

  return { saved, form, dirty, dirtyRef, loading, error, busy, edit, save, discard };
}
