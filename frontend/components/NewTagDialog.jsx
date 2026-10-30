import { useEffect, useMemo, useState } from 'react';
import { apexApi } from '../lib/apexApi';
import { preloadMasterData, useMasterData } from '../hooks/useMasterData';
import { jobFields } from '../services/tagModel';
import { useApp } from '../state/AppContext';
import { IconCheck, IconClose } from './icons';
import { SearchSelect } from './ui';

/**
 * "Add Tag": pick the job, then ✓. The job must exist as a project in Autodesk Forma;
 * a missing project only produces a warning on the new tag page; the tag can still be created.
 */
export function NewTagDialog({ onCancel, onConfirm }) {
  const { divisions } = useApp();
  const jobs = useMasterData('jobs', divisions);
  const [job, setJob] = useState(null);
  const [busy, setBusy] = useState(false);

  const options = useMemo(
    () => jobs.data.map((j, i) => ({ value: String(i), label: j.label, sub: [j.customerName, j.address].filter(Boolean).join(' · ') })),
    [jobs.data],
  );

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !busy && onCancel();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);

  const confirm = async () => {
    const row = job.row;
    setBusy(true);
    try {
      // Fresh job details + Forma check; the trade list is warmed for the Cost tab.
      const [result] = await Promise.all([apexApi.tags.prepareNew(row), preloadMasterData('trades')]);
      const fields = jobFields(row);
      for (const k of ['customerId', 'pmEmail', 'address']) if (result.details?.[k]) fields[k] = result.details[k];
      // The tag can be created either way; a warning is shown on the new tag page.
      const warning = result.error
        ? result.error.message
        : result.found ? '' : `Could not find project ${row.jobNo} in Autodesk Forma.  Contact the Office.`;
      onConfirm(fields, warning);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dialog-backdrop" onPointerDown={(e) => e.target === e.currentTarget && !busy && onCancel()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label="New tag" aria-busy={busy}>
        <div className="field">
          <span className="field-label">Job</span>
          <SearchSelect
            value={job ? job.label : ''}
            options={options}
            loading={jobs.loading}
            searchIcon
            disabled={busy}
            ariaLabel="Job"
            placeholder={jobs.error ? 'Jobs unavailable' : 'Search jobs'}
            onChange={(o) => setJob({ label: o.label, row: jobs.data[Number(o.value)] })}
          />
        </div>
        <div className="dialog__actions">
          <button className="dialog__btn dialog__btn--no" aria-label="Cancel" disabled={busy} onClick={onCancel}><IconClose size={36} /></button>
          <button className="dialog__btn dialog__btn--yes" aria-label="Create tag for this job" disabled={!job?.row || busy} onClick={confirm}>
            {busy ? <span className="dialog__spinner" role="status" aria-label="Checking project" /> : <IconCheck size={36} />}
          </button>
        </div>
      </div>
    </div>
  );
}
