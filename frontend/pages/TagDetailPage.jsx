import { useCallback, useState } from 'react';
import { Link, NavLink, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { IconBack, IconClose, IconMenu } from '../components/icons';
import { MenuDrawer } from '../components/MenuDrawer';
import { AlertDialog, Spinner, useToast } from '../components/ui';
import { useLayout } from '../hooks/useLayout';
import { useTagEditor } from '../hooks/useTagEditor';
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';
import { TAB_KEYS, tagPath } from '../routes/router';
import { WritesDisabledError } from '../lib/apexHttp';
import { NEW_TAG_ID, isEditable } from '../services/tagModel';
import { saveProblems, tabForProblem } from '../services/validation';
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
  const { refresh } = useTagList();
  const { state, pathname } = useLocation();
  const [warning, setWarning] = useState(state?.warning || '');
  const editor = useTagEditor(id, state?.job);
  const { split } = useLayout();
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
    const problems = saveProblems(editor.form);
    if (problems.length) {
      toast(problems[0], 'error');
      const t = tabForProblem(problems[0]);
      if (t) navigate(tagPath(id, t));
      return null;
    }
    try {
      const t = await editor.save();
      if (!quiet) toast('Saved');
      refresh();
      if (move) follow(t);
      return t;
    } catch (e) {
      // Read-only mode: the would-be requests are in the browser console.
      toast(e instanceof WritesDisabledError ? 'Read-only mode: nothing was sent to eMachine (see the browser console for what would be).' : e.problems?.[0] || e.message, 'error');
      return null;
    }
  }, [editor, toast, refresh, follow, navigate, id]);

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
  const isNew = tag.id === NEW_TAG_ID;
  const readOnly = !isEditable(tag);
  const props = { tag, editor, edit: editor.edit, save, follow, goTo, refresh, readOnly, sub, busy: editor.busy };
  const { Component } = TABS.find((t) => t.key === tab);

  return (
    <div className="detail-page">
      <header className="detail-head">
        {/* Phone: back to the list. Tablet/desktop: the list is already visible, so close the tag. */}
        <button className="icon-btn icon-btn--light" onClick={() => navigate('/')} aria-label={split ? 'Close tag' : 'Back to tags'}>
          {split ? <IconClose size={26} /> : <IconBack size={30} />}
        </button>
        {isNew ? (
          <div className="detail-head__title detail-head__title--job">
            <span>{[tag.jobNo, tag.jobName].filter(Boolean).join(' : ') || 'No job selected'}</span>
          </div>
        ) : (
          <div className="detail-head__title">
            <h2>
              {tag.tagNumber}
              {editor.dirty && <span className="unsaved-dot" title="Unsaved changes" />}
            </h2>
            <span>{tag.jobName || 'No job selected'}</span>
          </div>
        )}
        {!split && (
          <button className="icon-btn icon-btn--light icon-btn--dim" aria-label="Open menu" onClick={() => setMenu(true)}>
            <IconMenu size={26} />
          </button>
        )}
      </header>

      <nav className="tabs" aria-label="Tag sections">
        {TABS.map((t) => (
          <NavLink key={t.key} to={tagPath(id, t.key)} className={({ isActive }) => `tab${isActive ? ' is-active' : ''}`}>
            {t.label}
          </NavLink>
        ))}
      </nav>

      {readOnly && <div className="banner banner--info inset">This tag is {tag.status.toLowerCase()} and can no longer be edited.</div>}

      <Component {...props} />
      <MenuDrawer open={menu} onClose={() => setMenu(false)} />
      {warning && (
        <AlertDialog
          text={warning}
          onClose={() => {
            setWarning('');
            // Drop it from history so a reload doesn't show it again.
            navigate(pathname, { replace: true, state: { job: state?.job } });
          }}
        />
      )}
    </div>
  );
}
