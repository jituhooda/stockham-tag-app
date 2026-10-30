import { IconTrash } from '../../components/icons';
import { ActionBar, SaveButton, SearchSelect, SubmitButton, useToast } from '../../components/ui';
import { useMasterData } from '../../hooks/useMasterData';
import { submitProblems, tabForProblem } from '../../services/validation';
import { useApp } from '../../state/AppContext';

export function IssuesTab({ tag, edit, save, goTo, readOnly, busy }) {
  const { config, can } = useApp();
  const issues = useMasterData('issues');
  const toast = useToast();
  const options = issues.data.map((i) => ({ value: i.label, label: i.label }));

  const next = async () => {
    const problems = submitProblems(tag);
    if (problems.length) {
      toast(problems[0], 'error');
      const tab = tabForProblem(problems[0]);
      if (tab) goTo(tab);
      return;
    }
    if (await save({ quiet: true })) goTo('sign');
  };

  return (
    <>
      <div className="tab-body">
        {!readOnly && (
          <>
            <p className="field-label plain">Select an Issue associated with this tag:</p>
            <SearchSelect
              value=""
              options={options}
              loading={issues.loading && config?.features?.issuesConfigured}
              searchIcon
              allowCustom
              ariaLabel="Issue"
              placeholder={options.length ? 'Search issues' : 'Describe the issue'}
              onChange={(o) => {
                if (tag.issues.includes(o.label)) toast('That issue is already selected');
                else edit((t) => ({ issues: [...t.issues, o.label] }));
              }}
            />
          </>
        )}

        <h4 className="field-label plain spaced">Selected Issues:</h4>
        {!tag.issues.length && <p className="muted small">None selected.</p>}
        <ul className="issue-list">
          {tag.issues.map((issue) => (
            <li key={issue} className="issue">
              <span>{issue}</span>
              {!readOnly && (
                <button className="icon-btn trash" aria-label="Remove issue" onClick={() => edit((t) => ({ issues: t.issues.filter((i) => i !== issue) }))}>
                  <IconTrash size={28} />
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
      {!readOnly && (
        <ActionBar>
          <SaveButton onClick={() => save()} busy={busy} />
          {can('tags:submit') && <SubmitButton onClick={next} busy={busy} />}
        </ActionBar>
      )}
    </>
  );
}
