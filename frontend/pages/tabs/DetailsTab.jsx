import { IconPin } from '../../components/icons';
import { ActionBar, SaveButton, StatusPill } from '../../components/ui';
import { NEW_TAG_ID } from '../../services/tagModel';
import { useApp } from '../../state/AppContext';

/**
 * The tag's Details tab. The job is fixed (chosen when the tag was created), so it is shown,
 * not edited. A saved tag shows its number; a new one asks for it.
 */
export function DetailsTab({ tag, edit, save, readOnly, busy }) {
  const { config, user, settings } = useApp();
  const isNew = tag.id === NEW_TAG_ID;
  const jobLabel = [tag.jobNo, tag.jobName].filter(Boolean).join(' : ');
  const createdBy = tag.createdBy || (isNew ? settings.employeeName || user.name : '—');

  return (
    <>
      <div className="tab-body">
        <div className="nt">
          <div className="nt__job">
            <span className="nt__label">Job</span>
            <strong className="nt__job-name">{jobLabel}</strong>
            {tag.address && <span className="nt__address"><IconPin size={22} />{tag.address}</span>}
          </div>

          <div className="nt__cols nt__row">
            <div className="nt__tagno">
              <label className="nt__label" htmlFor="nt-tag-number">Tag #</label>
              {isNew ? (
                <input id="nt-tag-number" className="nt__inline" value={tag.tagNumber} disabled={readOnly} placeholder="Enter Text"
                  onChange={(e) => edit({ tagNumber: e.target.value })} />
              ) : (
                <span id="nt-tag-number" className="nt__value">{tag.tagNumber}</span>
              )}
            </div>
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
