import { NotConnected } from '../../components/NotConnected';
import { SearchSelect } from '../../components/ui';
import { useMasterData } from '../../hooks/useMasterData';

/** Issues: listed from eMachine when an issues query is configured; linking isn't saved yet. */
export function IssuesTab() {
  const issues = useMasterData('issues');
  const options = issues.data.map((i) => ({ value: i.label, label: i.label }));
  return (
    <div className="tab-body">
      <p className="field-label plain">Select an Issue associated with this tag:</p>
      <SearchSelect value="" options={options} searchIcon disabled ariaLabel="Issue" placeholder="Search issues" onChange={() => {}} />
      <NotConnected what="Linking issues to a tag">
        This needs the eMachine issues table and the API the existing app uses when you select an issue.
      </NotConnected>
    </div>
  );
}
