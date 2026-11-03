import { useCallback, useEffect, useMemo, useState } from 'react';
import { IconTrash } from '../../components/icons';
import { ActionBar, AlertDialog, ConfirmDialog, SaveButton, SearchSelect, Spinner, useToast } from '../../components/ui';
import { apexApi } from '../../lib/apexApi';
import { WritesDisabledError } from '../../lib/apexHttp';
import { NEW_TAG_ID, emptyIssue } from '../../services/tagModel';

/**
 * Issues: pick the Autodesk Forma issues this tag is about. The list is the job's project issues (open and in
 * progress); picks are listed under "Selected Issues" and saved with Save (one tag_issues row each).
 */
export function IssuesTab({ tag, edit, editor, save, readOnly, busy }) {
  const toast = useToast();
  const { setSavedIssues, dropLine } = editor;
  const isNew = tag.id === NEW_TAG_ID;
  const [forma, setForma] = useState(null); // { projectId, options } once loaded
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [asking, setAsking] = useState(null);

  // The job's Forma issues.
  const loadOptions = useCallback(async (signal) => {
    if (!tag.jobNo) { setForma({ projectId: null, options: [] }); return; }
    try {
      setForma(await apexApi.issues.options(tag.jobNo, signal));
      setError('');
    } catch (e) {
      if (!signal?.aborted) setError(e.message);
    }
  }, [tag.jobNo]);

  useEffect(() => {
    const ctrl = new AbortController();
    loadOptions(ctrl.signal);
    return () => ctrl.abort();
  }, [loadOptions]);

  // The tag's saved issues (again after every save, because a save adds rows).
  useEffect(() => {
    if (isNew || tag.issuesLoaded) return undefined;
    const ctrl = new AbortController();
    (async () => {
      try {
        const rows = await apexApi.tags.issueRows(tag.id, ctrl.signal);
        let facts = { projectId: null, options: [] };
        try { if (tag.jobNo) facts = await apexApi.issues.options(tag.jobNo, ctrl.signal); } catch { /* shown by the options loader */ }
        const lines = await apexApi.issues.describe(rows, facts, ctrl.signal);
        if (!ctrl.signal.aborted) setSavedIssues(lines);
      } catch (e) {
        if (!ctrl.signal.aborted) setError(e.message);
      }
    })();
    return () => ctrl.abort();
  }, [isNew, tag.id, tag.jobNo, tag.issuesLoaded, setSavedIssues]);

  const options = useMemo(
    () => (forma?.options || []).map((o) => ({ value: o.issueId, label: o.label, sub: o.title })),
    [forma],
  );

  const pick = (o) => {
    if (tag.issues.some((i) => i.issueId === o.value)) {
      setNotice('This issue is already added');
      return;
    }
    const opt = forma.options.find((x) => x.issueId === o.value);
    edit((t) => ({ issues: [...t.issues, { ...emptyIssue(), issueId: o.value, displayId: opt?.displayId ?? '', label: o.label }] }));
  };

  const confirmDelete = async () => {
    const line = asking;
    try {
      // A saved issue is removed in eMachine right away (like cost lines); one that was never saved just goes away.
      if (line.id) {
        await apexApi.tags.deleteLine('issues', line.id);
        dropLine('issues', line.key);
      } else {
        edit((t) => ({ issues: t.issues.filter((i) => i.key !== line.key) }));
      }
      setAsking(null);
      toast('Deleted');
    } catch (e) {
      setAsking(null);
      toast(e instanceof WritesDisabledError ? 'Saving to eMachine is turned off, so nothing was deleted.' : e.message, 'error');
    }
  };

  const loading = !forma && !error;
  const noProject = forma && !forma.projectId && !!tag.jobNo;

  return (
    <>
      <div className="tab-body">
        <p className="field-label plain">Select an Issue associated with this tag:</p>
        <SearchSelect
          value=""
          options={options}
          loading={loading}
          searchIcon
          disabled={readOnly || !forma?.projectId}
          ariaLabel="Issue"
          placeholder={loading ? 'Loading issues…' : 'Search issues'}
          onChange={pick}
        />
        {!tag.jobNo && <p className="muted small issues-note">Choose a job on the Details tab to see its issues.</p>}
        {noProject && <p className="muted small issues-note">This job has no project in Autodesk Forma, so there are no issues to choose from.</p>}
        {forma?.projectId && !options.length && <p className="muted small issues-note">There are no open issues for this job.</p>}
        {error && (
          <p className="files-error" role="alert">
            Couldn’t load issues: {error}{' '}
            <button className="link-btn" onClick={() => { apexApi.issues.clear(); setError(''); setForma(null); loadOptions(); }}>Retry</button>
          </p>
        )}

        <p className="field-label plain spaced">Selected Issues:</p>
        {!tag.issuesLoaded && !isNew && !error && <Spinner />}
        <ul className="issue-list">
          {tag.issues.map((i) => (
            <li key={i.key} className="issue">
              <span>{i.label}</span>
              {!readOnly && (
                <button className="icon-btn trash" aria-label={`Remove issue ${i.displayId || ''}`.trim()} onClick={() => setAsking(i)}>
                  <IconTrash size={28} />
                </button>
              )}
            </li>
          ))}
        </ul>
        {tag.issuesLoaded && !tag.issues.length && <p className="muted small">No issues selected yet.</p>}
      </div>
      {!readOnly && (
        <ActionBar>
          <SaveButton onClick={() => save()} busy={busy} />
        </ActionBar>
      )}
      {notice && <AlertDialog text={notice} onClose={() => setNotice('')} />}
      {asking && <ConfirmDialog text="Are you sure to delete?" onCancel={() => setAsking(null)} onConfirm={confirmDelete} />}
    </>
  );
}
