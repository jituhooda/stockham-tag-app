import { useCallback, useState } from 'react';
import { Link, NavLink, Navigate, useNavigate, useParams } from 'react-router-dom';
import { IconBack, IconMenu } from '../components/icons';
import { MenuDrawer } from '../components/MenuDrawer';
import { Spinner, StatusPill, useToast } from '../components/ui';
import { useTagEditor } from '../hooks/useTagEditor';
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';
import { TAB_KEYS, tagPath } from '../routes/router';
import { isEditable } from '../services/tagModel';
import { useApp } from '../state/AppContext';
import { useTagList } from '../state/TagListContext';
import { CostTab } from './tabs/CostTab';
import { DetailsTab } from './tabs/DetailsTab';
import { FilesTab } from './tabs/FilesTab';
import { IssuesTab } from './tabs/IssuesTab';
import { SignTab } from './tabs/SignTab';

const TABS = [
  { key: 'details', label: 'Details', Component: DetailsTab },
  { key: 'cost', label: 'Cost', Component: CostTab },
  { key: 'files', label: 'Files', Component: FilesTab },
  { key: 'issues', label: 'Issues', Component: IssuesTab },
  { key: 'sign', label: 'Sign', Component: SignTab },
];

/** Remount per tag so editor state never leaks between tags. */
export function TagDetailPage() {
  const { id = '' } = useParams();
  return <TagDetail key={id} id={id} />;
}

function TagDetail({ id }) {
  const { tab = 'details', sub } = useParams();
  const { can } = useApp();
  const { refresh } = useTagList();
  const editor = useTagEditor(id);
  const [menu, setMenu] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  useUnsavedChangesGuard(editor.dirtyRef, `/tags/${encodeURIComponent(id)}/`, editor.discard);

  const goTo = useCallback((t, s) => navigate(tagPath(id, t, s)), [id, navigate]);

  /** Follow the tag if the server gave it a new id (first save of a new or eMachine tag). */
  const follow = useCallback((t) => {
    if (t && t.id !== id) navigate(tagPath(t.id, tab, sub), { replace: true });
  }, [id, navigate, tab, sub]);

  /** `follow: false` lets a caller finish a multi-step action before the page moves to a new id. */
  const save = useCallback(async ({ quiet = false, follow: move = true } = {}) => {
    try {
      const t = await editor.save();
      if (!quiet) toast('Saved');
      refresh();
      if (move) follow(t);
      return t;
    } catch (e) {
      toast(e.problems?.[0] || e.message, 'error');
      return null;
    }
  }, [editor, toast, refresh, follow]);

  const act = useCallback(async (fn, message) => {
    try {
      const t = await editor.act(fn);
      if (message) toast(message);
      refresh();
      follow(t);
      return t;
    } catch (e) {
      toast(e.problems?.[0] || e.message, 'error');
      return null;
    }
  }, [editor, toast, refresh, follow]);

  if (!TAB_KEYS.includes(tab)) return <Navigate to={tagPath(id)} replace />;
  if (editor.loading || (!editor.form && !editor.error)) {
    return <div className="detail-page"><Spinner /></div>;
  }
  if (editor.error) {
    return (
      <div className="detail-page">
        <div className="placeholder">
          <p>{editor.error.status === 404 ? 'This tag doesn’t exist any more.' : editor.error.message}</p>
          <Link className="btn btn--dark" to="/">Back to tags</Link>
        </div>
      </div>
    );
  }

  const tag = editor.form;
  const readOnly = !isEditable(tag, can);
  const props = { tag, editor, edit: editor.edit, save, act, follow, goTo, readOnly, sub, busy: editor.busy };
  const { Component } = TABS.find((t) => t.key === tab);

  return (
    <div className="detail-page">
      <header className="detail-head">
        <button className="icon-btn icon-btn--light" onClick={() => navigate('/')} aria-label="Back to tags">
          <IconBack size={30} />
        </button>
        <div className="detail-head__title">
          <h2>
            {tag.tagNumber || 'New Tag'}
            {editor.dirty && <span className="unsaved-dot" title="Unsaved changes" />}
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
          <NavLink key={t.key} to={tagPath(id, t.key)} className={({ isActive }) => `tab${isActive ? ' is-active' : ''}`}>
            {t.label}
          </NavLink>
        ))}
      </nav>

      {!tag.editable && <div className="banner banner--info inset">This tag is {tag.status.toLowerCase()} and can no longer be edited.</div>}
      {tag.editable && !can('tags:write') && <div className="banner banner--info inset">You have view-only access.</div>}

      <Component {...props} />
      <MenuDrawer open={menu} onClose={() => setMenu(false)} />
    </div>
  );
}
