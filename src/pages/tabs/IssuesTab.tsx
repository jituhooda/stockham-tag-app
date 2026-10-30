import { useMemo } from 'react';
import { ActionBar, SaveButton, SubmitButton } from '../../components/ActionBar';
import { IconTrash } from '../../components/Icons';
import { SearchSelect } from '../../components/SearchSelect';
import { useToast } from '../../components/Toast';
import { useMasterData } from '../../store/MasterDataContext';
import { labelOf, str } from '../../utils/fields';
import { submitProblems } from '../../utils/validate';
import type { TabProps } from '../TagDetailPage';

export function IssuesTab({ tag, edit, save, goTo, readOnly }: TabProps) {
  const { data } = useMasterData();
  const toast = useToast();

  const options = useMemo(
    () =>
      data.issues.rows.map((r) => {
        const num = str(r, 'IssueNo', 'issue_number', 'IssueNumber', 'Number', 'Id', 'id');
        const text = str(r, 'Description', 'description', 'Issue', 'issue', 'Title', 'title') || labelOf(r);
        const label = num && num !== text ? `${num} : ${text}` : text;
        return { value: label, label };
      }),
    [data.issues.rows],
  );

  const submit = () => {
    const problems = submitProblems(tag);
    if (problems.length) {
      toast(problems[0], 'error');
      return;
    }
    if (save()) goTo('sign');
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
              loading={data.issues.loading}
              searchIcon
              allowCustom
              ariaLabel="Issue"
              placeholder={options.length ? 'Search issues' : 'Describe the issue'}
              onChange={(o) => {
                if (tag.issues.includes(o.label)) {
                  toast('That issue is already selected');
                  return;
                }
                edit((t) => ({ issues: [...t.issues, o.label] }));
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
          <SaveButton onClick={() => save()} />
          <SubmitButton onClick={submit} />
        </ActionBar>
      )}
    </>
  );
}
