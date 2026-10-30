import { useMemo } from 'react';
import { IconPin } from '../../components/icons';
import { ActionBar, SaveButton, SearchSelect, StatusPill } from '../../components/ui';
import { useMasterData } from '../../hooks/useMasterData';
import { NEW_TAG_ID, jobFields } from '../../services/tagModel';
import { useApp } from '../../state/AppContext';

export function DetailsTab({ tag, edit, save, readOnly, busy }) {
  const { config, divisions } = useApp();
  const jobs = useMasterData('jobs', divisions);

  const options = useMemo(
    () => jobs.data.map((j, i) => ({ value: String(i), label: j.label, sub: [j.customerName, j.address].filter(Boolean).join(' · ') })),
    [jobs.data],
  );
  const jobLabel = tag.jobNo || tag.jobName ? [tag.jobNo, tag.jobName].filter(Boolean).join(' : ') : '';
  const isNew = tag.id === NEW_TAG_ID;

  if (isNew) return <NewTagDetails tag={tag} edit={edit} save={save} readOnly={readOnly} busy={busy} />;

  return (
    <>
      <div className="tab-body">
        <div className="form-card">
          <div className="form-grid">
            <div className="field field--wide">
              <span className="field-label">Job</span>
              <SearchSelect
                value={jobLabel}
                options={options}
                loading={jobs.loading}
                searchIcon
                disabled={readOnly}
                ariaLabel="Job"
                placeholder={jobs.error ? 'Jobs unavailable' : 'Search jobs'}
                onChange={(o) => {
                  const j = jobs.data[Number(o.value)];
                  if (!j) return;
                  edit(jobFields(j, tag.pmEmail));
                }}
              />
            </div>

            <label className="field">
              <span className="field-label">Tag #</span>
              <input className="input" value={tag.tagNumber} disabled={readOnly || !isNew} placeholder={isNew ? 'e.g. D4355-2' : ''}
                onChange={(e) => edit({ tagNumber: e.target.value })} />
            </label>

            <label className="field">
              <span className="field-label">Tag Date</span>
              <input className="input" type="date" value={tag.tagDate || ''} disabled={readOnly} onChange={(e) => edit({ tagDate: e.target.value })} />
            </label>

            <label className="field field--wide">
              <span className="field-label">Description</span>
              <textarea className="input textarea" rows={4} value={tag.description} disabled={readOnly}
                placeholder="What changed and why" onChange={(e) => edit({ description: e.target.value })} />
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

            {config.features.premiumTime !== false && (
              <label className="check field--wide">
                <input type="checkbox" checked={!!tag.isPremium} disabled={readOnly} onChange={(e) => edit({ isPremium: e.target.checked })} />
                <span>Premium time (after-hours / weekend work)</span>
              </label>
            )}
          </div>
        </div>
      </div>
      {!readOnly && (
        <ActionBar>
          <SaveButton onClick={() => save()} busy={busy} />
        </ActionBar>
      )}
    </>
  );
}

/** A brand-new tag: the job was chosen in the Add Tag dialog, so it is shown, not edited. */
function NewTagDetails({ tag, edit, save, readOnly, busy }) {
  const { config, user, settings } = useApp();
  const jobLabel = [tag.jobNo, tag.jobName].filter(Boolean).join(' : ');
  const createdBy = settings.employeeName || user.name;

  return (
    <>
      <div className="tab-body">
        <div className="nt">
          <div className="nt__job">
            <span className="nt__label">Job</span>
            <strong className="nt__job-name">{jobLabel}</strong>
            {tag.address && <span className="nt__address"><IconPin size={22} />{tag.address}</span>}
          </div>

          <div className="nt__row">
            <label className="nt__label" htmlFor="nt-tag-number">Tag #</label>
            <input id="nt-tag-number" className="nt__inline" value={tag.tagNumber} disabled={readOnly} placeholder="Enter Text"
              onChange={(e) => edit({ tagNumber: e.target.value })} />
            <StatusPill status={tag.status} />
          </div>

          <div className="nt__cols">
            <label className="nt__stack">
              <span className="nt__label">Date</span>
              <input className="input" type="date" value={tag.tagDate || ''} disabled={readOnly} onChange={(e) => edit({ tagDate: e.target.value })} />
            </label>
            <div className="nt__stack">
              <span className="nt__label">Created By</span>
              <span className="nt__user">{createdBy.replace(/@/g, '@\u200b')}</span>
            </div>
          </div>

          {config.features.premiumTime !== false && (
            <fieldset className="nt__radios">
              <legend className="sr-only">Type of work</legend>
              <label><input type="radio" name="nt-work" checked={!tag.isPremium} disabled={readOnly} onChange={() => edit({ isPremium: false })} />Extra Work (Non-contract)</label>
              <label><input type="radio" name="nt-work" checked={!!tag.isPremium} disabled={readOnly} onChange={() => edit({ isPremium: true })} />OT - Premium Time Only</label>
            </fieldset>
          )}

          <label className="nt__stack nt__desc">
            <span className="nt__label">Description of Work</span>
            <textarea className="input textarea" value={tag.description} disabled={readOnly} placeholder="Enter Text"
              onChange={(e) => edit({ description: e.target.value })} />
          </label>
        </div>
      </div>
      {!readOnly && (
        <ActionBar>
          <SaveButton onClick={() => save()} busy={busy} />
        </ActionBar>
      )}
    </>
  );
}
