import { useCallback, useEffect, useRef, useState } from 'react';
import { apexApi } from '../lib/apexApi';
import { NEW_TAG_ID, fromApi, newTag, toPayload } from '../services/tagModel';

/**
 * Loads one tag and holds the user's unsaved edits.
 *
 * `form` is the editable copy; `saved` is what the server last returned.
 * `save()` creates or replaces the tag and resolves to the server's version,
 * whose id may differ from the one we loaded (new tags, and eMachine tags,
 * which the backend copies into its database on first save).
 */
export function useTagEditor(id) {
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
    if (id === NEW_TAG_ID) {
      const t = newTag();
      setSaved(t);
      setForm(t);
      setLoading(false);
      return undefined;
    }
    apexApi.tags
      .get(id, ctrl.signal)
      .then((t) => {
        const f = fromApi(t);
        setSaved(f);
        setForm(f);
      })
      .catch((e) => !ctrl.signal.aborted && setError(e))
      .finally(() => !ctrl.signal.aborted && setLoading(false));
    return () => ctrl.abort();
  }, [id]);

  /** Patch the form: an object, or a function of the current form. */
  const edit = useCallback((patch) => {
    setForm((f) => ({ ...f, ...(typeof patch === 'function' ? patch(f) : patch) }));
    setDirty(true);
  }, []);

  const accept = useCallback((t) => {
    const f = fromApi(t);
    setSaved(f);
    setForm(f);
    setDirty(false);
    dirtyRef.current = false; // callers often navigate before the next render
    return f;
  }, []);

  const save = useCallback(async () => {
    setBusy(true);
    try {
      const body = toPayload(form);
      const t = form.id === NEW_TAG_ID ? await apexApi.tags.create(body) : await apexApi.tags.update(form.id, body);
      return accept(t);
    } finally {
      setBusy(false);
    }
  }, [form, accept]);

  /** Run a server action that returns the tag (submit, approve, reject). */
  const act = useCallback(async (fn) => {
    setBusy(true);
    try {
      return accept(await fn());
    } finally {
      setBusy(false);
    }
  }, [accept]);

  /** Attachments are saved immediately and don't make the form dirty. */
  const setAttachments = useCallback((update) => {
    const apply = (t) => (t ? { ...t, attachments: update(t.attachments) } : t);
    setSaved(apply);
    setForm(apply);
  }, []);

  const discard = useCallback(() => {
    setForm(saved);
    setDirty(false);
    dirtyRef.current = false;
  }, [saved]);

  return { saved, form, dirty, dirtyRef, loading, error, busy, edit, save, act, discard, setAttachments };
}
