import { useCallback, useEffect, useMemo, useState } from 'react';
import { apexApi } from '../lib/apexApi';
import { preloadMasterData, useMasterData } from '../hooks/useMasterData';
import { jobFields } from '../services/tagModel';
import { useApp } from '../state/AppContext';
import { IconCheck, IconClose } from './icons';
import { SearchSelect } from './ui';

/**
 * "Add Tag": pick the job, then ✓. The job must exist as a project in Autodesk Forma;
 * if it doesn't, an alert explains and we return to the tag list. Otherwise a new tag opens.
 */
export function NewTagDialog({ onCancel, onConfirm }) {
  const { divisions } = useApp();
  const jobs = useMasterData('jobs', divisions);
  const [job, setJob] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null); // { text, closeAll }

  const options = useMemo(
    () => jobs.data.map((j, i) => ({ value: String(i), label: j.label, sub: [j.customerName, j.address].filter(Boolean).join(' · ') })),
    [jobs.data],
  );

  const dismissNotice = useCallback(() => {
    const closeAll = notice?.closeAll;
    setNotice(null);
    if (closeAll) onCancel();
  }, [notice, onCancel]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (notice) dismissNotice();
      else if (!busy) onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [notice, busy, dismissNotice, onCancel]);

  const confirm = async () => {
    const row = job.row;
    setBusy(true);
    try {
      // Forma check + fresh job details; the trade list is warmed for the Cost tab.
      const [result] = await Promise.all([apexApi.tags.prepareNew(row), preloadMasterData('trades')]);
      if (!result.found) {
        setNotice({ text: `Could not find project ${row.jobNo} in Autodesk Forma.  Contact the Office.`, closeAll: true });
        return;
      }
      const fields = jobFields(row);
      for (const k of ['customerId', 'pmEmail', 'address']) if (result.details?.[k]) fields[k] = result.details[k];
      onConfirm(fields);
    } catch (e) {
      setNotice({ text: e.message, closeAll: false });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dialog-backdrop" onPointerDown={(e) => e.target === e.currentTarget && !busy && !notice && onCancel()}>
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

      {notice && (
        <div className="alert-backdrop">
          <div className="alert" role="alertdialog" aria-modal="true" aria-label="Notice">
            <p>{notice.text}</p>
            <button className="alert__ok" autoFocus onClick={dismissNotice}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}
