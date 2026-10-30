import { useMemo } from 'react';
import { ActionBar, SaveButton } from '../../components/ActionBar';
import { SearchSelect } from '../../components/SearchSelect';
import { useMasterData } from '../../store/MasterDataContext';
import { str } from '../../utils/fields';
import type { TabProps } from '../TagDetailPage';

export function DetailsTab({ tag, edit, save, readOnly }: TabProps) {
  const { data } = useMasterData();

  const jobs = useMemo(
    () =>
      data.jobs.rows.map((r, i) => ({
        value: String(i),
        label: str(r, 'CJobName') || `${str(r, 'JobNo')} : ${str(r, 'JobName')}`,
        sub: [str(r, 'CustomerName'), str(r, 'Address')].filter(Boolean).join(' · '),
      })),
    [data.jobs.rows],
  );
  const jobLabel = tag.jobNo || tag.jobName ? [tag.jobNo, tag.jobName].filter(Boolean).join(' : ') : '';

  return (
    <>
      <div className="tab-body">
        <div className="form-card">
          <div className="form-grid">
            <label className="field field--wide">
              <span className="field-label">Job</span>
              <SearchSelect
                value={jobLabel}
                options={jobs}
                loading={data.jobs.loading}
                searchIcon
                disabled={readOnly}
                ariaLabel="Job"
                placeholder={data.jobs.error ? 'Jobs unavailable' : 'Search jobs'}
                onChange={(o) => {
                  const r = data.jobs.rows[Number(o.value)];
                  if (!r) return;
                  edit({
                    jobNo: str(r, 'JobNo'),
                    jobName: str(r, 'JobName'),
                    customerId: str(r, 'CustomerID', 'CustomerId', 'Customer_ID'),
                    customerName: str(r, 'CustomerName'),
                    address: str(r, 'Address', 'JobAddress'),
                    pmEmail: str(r, 'PMEmail', 'PM_Email', 'PmEmail', 'ProjectManagerEmail') || tag.pmEmail,
                  });
                }}
              />
            </label>

            <label className="field">
              <span className="field-label">Tag #</span>
              <input className="input" value={tag.tagNumber} disabled={readOnly} onChange={(e) => edit({ tagNumber: e.target.value })} />
            </label>

            <label className="field">
              <span className="field-label">Tag Date</span>
              <input className="input" type="date" value={tag.tagDate} disabled={readOnly} onChange={(e) => edit({ tagDate: e.target.value })} />
            </label>

            <label className="field field--wide">
              <span className="field-label">Description</span>
              <textarea
                className="input textarea"
                rows={4}
                value={tag.description}
                disabled={readOnly}
                placeholder="What changed and why"
                onChange={(e) => edit({ description: e.target.value })}
              />
            </label>

            <label className="field">
              <span className="field-label">Customer</span>
              <input className="input" value={tag.customerName || tag.customerId} readOnly tabIndex={-1} placeholder="From job" />
            </label>

            <label className="field">
              <span className="field-label">PM Email</span>
              <input className="input" type="email" value={tag.pmEmail} disabled={readOnly} onChange={(e) => edit({ pmEmail: e.target.value })} />
            </label>

            <label className="field field--wide">
              <span className="field-label">Job Address</span>
              <input className="input" value={tag.address} disabled={readOnly} onChange={(e) => edit({ address: e.target.value })} />
            </label>

            <label className="check field--wide">
              <input type="checkbox" checked={tag.isPremium} disabled={readOnly} onChange={(e) => edit({ isPremium: e.target.checked })} />
              <span>Premium time (after-hours / weekend work)</span>
            </label>
          </div>
        </div>
      </div>
      {!readOnly && (
        <ActionBar>
          <SaveButton onClick={() => save()} />
        </ActionBar>
      )}
    </>
  );
}
