import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { runQuery } from '../api/client';
import { Q } from '../api/queries';
import type { Tag } from '../types';
import { emptySignature } from '../types';
import { today, uid } from '../utils/misc';
import { equipmentFromRow, expenseFromRow, laborFromRow, materialFromRow, tagFromRow } from './mappers';
import { load, save } from './storage';

const LOCAL_KEY = 'stockham.tags.v1';

/**
 * The API is read-only (GET queries), so edits are kept on this device, keyed
 * by tag id, and layered over what the server returns. `persistTag` is the one
 * place to call a write endpoint once one exists.
 */
type LocalTags = Record<string, Tag>;

interface TagsState {
  tags: Tag[];
  loading: boolean;
  error: string;
  refresh: () => void;
  getTag: (id: string) => Tag | undefined;
  createTag: () => Tag;
  updateTag: (id: string, patch: Partial<Tag> | ((t: Tag) => Partial<Tag>)) => void;
  persistTag: (id: string, patch?: Partial<Tag>) => boolean;
  discardLocal: (id: string) => void;
  /** Drop in-memory edits made since the last persist. */
  resetWorking: (id: string) => void;
  ensureLines: (id: string) => Promise<void>;
}

const Ctx = createContext<TagsState | null>(null);

export function TagsProvider({ children }: { children: ReactNode }) {
  const [remote, setRemote] = useState<Tag[]>([]);
  const [local, setLocal] = useState<LocalTags>(() => load<LocalTags>(LOCAL_KEY, {}));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const localRef = useRef(local);
  localRef.current = local;

  const refresh = useCallback(() => {
    const ac = new AbortController();
    setLoading(true);
    setError('');
    runQuery(Q.tags, ac.signal)
      .then((rows) => setRemote(rows.map(tagFromRow)))
      .catch((e: Error) => {
        if (e.name !== 'AbortError') setError(e.message || 'Could not load tags');
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  useEffect(() => refresh(), [refresh]);

  const tags = useMemo(() => {
    const seen = new Set<string>();
    const merged = remote.map((t) => {
      seen.add(t.id);
      return local[t.id] ?? t;
    });
    const localOnly = Object.values(local)
      .filter((t) => !seen.has(t.id) && t.serverId == null)
      .sort((a, b) => b.lastModified.localeCompare(a.lastModified));
    return [...localOnly, ...merged];
  }, [remote, local]);

  const tagsRef = useRef(tags);
  tagsRef.current = tags;

  const getTag = useCallback((id: string) => tagsRef.current.find((t) => t.id === id), []);

  // Working copies live in memory; only persistTag writes them to storage.
  const [working, setWorking] = useState<LocalTags>({});
  const workingRef = useRef(working);
  workingRef.current = working;

  const createTag = useCallback(() => {
    const n = Object.values(localRef.current).filter((t) => t.serverId == null).length + 1;
    const tag: Tag = {
      id: `l-${uid()}`,
      tagNumber: `NEW-${n}`,
      status: 'Draft',
      description: '',
      tagDate: today(),
      isPremium: false,
      jobNo: '',
      jobName: '',
      customerId: '',
      customerName: '',
      pmEmail: '',
      address: '',
      lastModified: today(),
      counts: { labor: 0, material: 0, equipment: 0, expense: 0 },
      labor: [],
      materials: [],
      expenses: [],
      equipment: [],
      linesLoaded: true,
      attachments: [],
      issues: [],
      signature: emptySignature(),
      dirty: true,
    };
    setWorking((w) => ({ ...w, [tag.id]: tag }));
    return tag;
  }, []);

  const current = useCallback(
    (id: string) => workingRef.current[id] ?? tagsRef.current.find((t) => t.id === id),
    [],
  );

  const updateTag = useCallback<TagsState['updateTag']>((id, patch) => {
    setWorking((w) => {
      const base = w[id] ?? tagsRef.current.find((t) => t.id === id);
      if (!base) return w;
      const p = typeof patch === 'function' ? patch(base) : patch;
      return { ...w, [id]: { ...base, ...p } };
    });
  }, []);

  const persistTag = useCallback<TagsState['persistTag']>((id, patch) => {
    const base = current(id);
    if (!base) return false;
    const tag: Tag = {
      ...base,
      ...patch,
      dirty: true,
      lastModified: today(),
      counts: {
        labor: base.labor.length,
        material: base.materials.length,
        equipment: base.equipment.length,
        expense: base.expenses.length,
      },
    };
    const next = { ...localRef.current, [id]: tag };
    const ok = save(LOCAL_KEY, next);
    if (ok) {
      setLocal(next);
      setWorking((w) => ({ ...w, [id]: tag }));
    }
    return ok;
  }, [current]);

  const discardLocal = useCallback((id: string) => {
    const next = { ...localRef.current };
    delete next[id];
    save(LOCAL_KEY, next);
    setLocal(next);
    setWorking((w) => {
      const c = { ...w };
      delete c[id];
      return c;
    });
  }, []);

  const resetWorking = useCallback((id: string) => {
    setWorking((w) => {
      const c = { ...w };
      delete c[id];
      return c;
    });
  }, []);

  const ensureLines = useCallback(async (id: string) => {
    const tag = current(id);
    if (!tag || tag.linesLoaded || tag.serverId == null) return;
    const sid = tag.serverId;
    const settle = (p: Promise<unknown[]>) => p.catch(() => [] as unknown[]);
    const [labor, materials, equipment, expenses] = await Promise.all([
      settle(runQuery(Q.tagLines('tag_labor', sid))),
      settle(runQuery(Q.tagLines('tag_materials', sid))),
      settle(runQuery(Q.tagLines('tag_equipment', sid))),
      settle(runQuery(Q.tagLines('tag_other_expenses', sid))),
    ]);
    updateTag(id, (t) =>
      t.linesLoaded
        ? {}
        : {
            linesLoaded: true,
            labor: (labor as never[]).map(laborFromRow),
            materials: (materials as never[]).map(materialFromRow),
            equipment: (equipment as never[]).map(equipmentFromRow),
            expenses: (expenses as never[]).map(expenseFromRow),
          },
    );
  }, [current, updateTag]);

  const merged = useMemo(() => {
    const ids = new Set(tags.map((t) => t.id));
    const unsavedNew = Object.values(working).filter((t) => !ids.has(t.id));
    return [...unsavedNew, ...tags].map((t) => working[t.id] ?? t);
  }, [tags, working]);

  const getMerged = useCallback(
    (id: string) => workingRef.current[id] ?? getTag(id),
    [getTag],
  );

  const value: TagsState = {
    tags: merged.filter((t) => t.serverId != null || local[t.id]),
    loading,
    error,
    refresh,
    getTag: getMerged,
    createTag,
    updateTag,
    persistTag,
    discardLocal,
    resetWorking,
    ensureLines,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTags() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTags must be used inside TagsProvider');
  return ctx;
}
