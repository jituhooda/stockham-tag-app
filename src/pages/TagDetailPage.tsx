import { useCallback, useEffect, useState } from 'react';
import { NavLink, Navigate, useBlocker, useNavigate, useParams } from 'react-router-dom';
import { IconBack, IconMenu } from '../components/Icons';
import { MenuDrawer } from '../components/MenuDrawer';
import { StatusPill } from '../components/StatusPill';
import { useToast } from '../components/Toast';
import { useTags } from '../store/TagsContext';
import type { Tag } from '../types';
import { CostTab } from './tabs/CostTab';
import { DetailsTab } from './tabs/DetailsTab';
import { FilesTab } from './tabs/FilesTab';
import { IssuesTab } from './tabs/IssuesTab';
import { SignTab } from './tabs/SignTab';

const TABS = [
  { key: 'details', label: 'Details' },
  { key: 'cost', label: 'Cost' },
  { key: 'files', label: 'Files' },
  { key: 'issues', label: 'Issues' },
  { key: 'sign', label: 'Sign' },
] as const;

export type Edit = (patch: Partial<Tag> | ((t: Tag) => Partial<Tag>)) => void;

export interface TabProps {
  tag: Tag;
  edit: Edit;
  save: (patch?: Partial<Tag>) => boolean;
  goTo: (tab: string) => void;
  readOnly: boolean;
}

/** Remount per tag so per-tag UI state (unsaved flag, menus) never leaks between tags. */
export function TagDetailPage() {
  const { id = '' } = useParams();
  return <TagDetail key={id} />;
}

function TagDetail() {
  const { id = '', tab = 'details', sub } = useParams();
  const { getTag, loading, updateTag, persistTag, resetWorking, ensureLines } = useTags();
  const [unsaved, setUnsaved] = useState(false);
  const [menu, setMenu] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const tag = getTag(id);

  // Re-run once the tag itself arrives (deep links land before the list loads).
  const haveTag = !!tag;
  useEffect(() => {
    if (haveTag) ensureLines(id).catch(() => {});
  }, [id, haveTag, ensureLines]);

  // Moving between this tag's tabs is fine; leaving the tag with unsaved edits asks first.
  const blocker = useBlocker(
    ({ nextLocation }) => unsaved && !nextLocation.pathname.startsWith(`/tags/${id}/`),
  );
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (window.confirm('You have unsaved changes. Leave without saving?')) {
      resetWorking(id);
      blocker.proceed();
    } else {
      blocker.reset();
    }
  }, [blocker, id, resetWorking]);

  useEffect(() => {
    if (!unsaved) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unsaved]);

  const edit = useCallback<Edit>((patch) => {
    updateTag(id, patch);
    setUnsaved(true);
  }, [id, updateTag]);

  const save = useCallback((patch?: Partial<Tag>) => {
    const ok = persistTag(id, patch);
    if (ok) {
      setUnsaved(false);
      toast('Saved');
    } else {
      toast('Could not save — device storage is full. Remove some attachments and try again.', 'error');
    }
    return ok;
  }, [id, persistTag, toast]);

  const goTo = useCallback((t: string) => navigate(`/tags/${id}/${t}`), [id, navigate]);

  const back = () => navigate('/');

  if (!tag) {
    if (loading) return <div className="detail-page"><div className="center muted">Loading…</div></div>;
    return <Navigate to="/" replace />;
  }
  if (!TABS.some((t) => t.key === tab)) return <Navigate to={`/tags/${id}/details`} replace />;

  const readOnly = !['draft', 'rejected', ''].includes(tag.status.toLowerCase());
  const props: TabProps = { tag, edit, save, goTo, readOnly };

  return (
    <div className="detail-page">
      <header className="detail-head">
        <button className="icon-btn icon-btn--light" onClick={back} aria-label="Back to tags">
          <IconBack size={30} />
        </button>
        <div className="detail-head__title">
          <h2>
            {tag.tagNumber || 'New Tag'}
            {unsaved && <span className="unsaved-dot" title="Unsaved changes" />}
          </h2>
          <span>{[tag.jobName, tag.jobNo].filter(Boolean).join(' ') || 'No job selected'}</span>
        </div>
        <StatusPill status={tag.status} />
        <button className="icon-btn icon-btn--light icon-btn--dim" aria-label="Open menu" onClick={() => setMenu(true)}>
          <IconMenu size={26} />
        </button>
      </header>

      <nav className="tabs" aria-label="Tag sections">
        {TABS.map((t) => (
          <NavLink key={t.key} to={`/tags/${id}/${t.key}`} className={({ isActive }) => `tab${isActive ? ' is-active' : ''}`}>
            {t.label}
          </NavLink>
        ))}
      </nav>

      {readOnly && (
        <div className="banner banner--info">This tag is {tag.status.toLowerCase()} and can no longer be edited.</div>
      )}

      {tab === 'details' && <DetailsTab {...props} />}
      {tab === 'cost' && <CostTab {...props} sub={sub} />}
      {tab === 'files' && <FilesTab {...props} />}
      {tab === 'issues' && <IssuesTab {...props} />}
      {tab === 'sign' && <SignTab {...props} />}

      <MenuDrawer open={menu} onClose={() => setMenu(false)} />
    </div>
  );
}
