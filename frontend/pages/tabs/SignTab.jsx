import { useCallback, useEffect, useMemo, useState } from 'react';
import { IconEraser, IconPlus } from '../../components/icons';
import { ActionBar, SearchSelect, SignaturePad, SubmitButton, useToast } from '../../components/ui';
import { apexApi } from '../../lib/apexApi';
import { signatureProblems, submitProblems, tabForProblem } from '../../services/validation';
import { useApp } from '../../state/AppContext';

export function SignTab({ tag, edit, save, act, goTo, readOnly, busy, editor }) {
  const { config, can } = useApp();
  const toast = useToast();
  const sig = tag.signature;
  const customer = tag.customerName || tag.customerId || '';
  const [approvers, setApprovers] = useState([]);
  const sendEnabled = config?.features?.sendForSignature !== false;

  useEffect(() => {
    if (!customer) return undefined;
    let live = true;
    apexApi.approvers.list(customer).then((rows) => live && setApprovers(rows)).catch(() => {});
    return () => {
      live = false;
    };
  }, [customer]);

  const options = useMemo(() => {
    const names = new Set(approvers.map((a) => a.name));
    if (sig.approver) names.add(sig.approver);
    return [...names].sort().map((n) => ({ value: n, label: n }));
  }, [approvers, sig.approver]);

  const setSig = useCallback((patch) => edit((t) => ({ signature: { ...t.signature, ...patch } })), [edit]);

  const chooseApprover = async (name) => {
    const n = name.trim();
    if (!n) return;
    const known = approvers.find((a) => a.name.toLowerCase() === n.toLowerCase());
    setSig({ approver: n, email: sig.email || known?.email || '' });
    if (!known && customer && can('approvers:write')) {
      try {
        const a = await apexApi.approvers.add({ customer, name: n });
        setApprovers((list) => [...list, a]);
      } catch {
        /* remembering the approver is a convenience; ignore failures */
      }
    }
  };

  const submit = async () => {
    const problems = [...submitProblems(tag), ...signatureProblems(sig)];
    if (problems.length) {
      toast(problems[0], 'error');
      const tab = tabForProblem(problems[0]);
      if (tab) goTo(tab);
      return;
    }
    // Unsaved edits go first so the server validates what the user sees.
    let id = tag.id;
    if (editor.dirty || tag.source !== 'local' || id === 'new') {
      const saved = await save({ quiet: true, follow: false });
      if (!saved) return;
      id = saved.id;
    }
    const body = { approver: sig.approver, mode: sig.mode, email: sig.email, image: sig.mode === 'in-person' ? sig.image : '' };
    const done = await act(() => apexApi.tags.submit(id, body), sig.mode === 'in-person' ? 'Signed' : 'Submitted');
    if (done && sig.mode === 'send') {
      window.location.href = mailto(done, sig);
      if (customer && sig.email) apexApi.approvers.add({ customer, name: sig.approver, email: sig.email }).catch(() => {});
    }
  };

  const decided = ['Submitted', 'Signed'].includes(tag.status) && can('tags:decide');

  return (
    <>
      <div className="tab-body sign">
        <span className="field-label">Approver from {customer || 'the customer'}</span>
        <div className="desc-picker">
          <SearchSelect
            value={sig.approver}
            options={options}
            allowCustom
            disabled={readOnly}
            ariaLabel="Approver"
            placeholder="Type the approver’s name"
            onChange={(o) => chooseApprover(o.label)}
          />
          {!readOnly && (
            <button className="icon-btn" aria-label="Add approver" onClick={() => chooseApprover(window.prompt(`New approver from ${customer || 'the customer'}`) ?? '')}>
              <IconPlus size={26} />
            </button>
          )}
        </div>

        <fieldset className="radios" disabled={readOnly}>
          <legend className="sr-only">How will the approver sign?</legend>
          <label className="radio">
            <input type="radio" name="mode" checked={sig.mode === 'in-person'} onChange={() => setSig({ mode: 'in-person' })} />
            <span>Sign in person</span>
          </label>
          {sendEnabled && (
            <label className="radio">
              <input type="radio" name="mode" checked={sig.mode === 'send'} onChange={() => setSig({ mode: 'send' })} />
              <span>Send for signature</span>
            </label>
          )}
        </fieldset>

        {sig.mode === 'in-person' ? (
          <>
            <span className="field-label caps">Signature</span>
            <SignaturePad value={sig.image} disabled={readOnly} onChange={(image) => setSig({ image })} />
            <div className="sig-foot">
              <span className="muted">{sig.signedAt ? `Signed ${new Date(sig.signedAt).toLocaleString()}` : 'Sign above'}</span>
              {!readOnly && (
                <button className="btn btn--outline" onClick={() => setSig({ image: '' })}>
                  <IconEraser size={18} /> Clear
                </button>
              )}
            </div>
            {sig.approver && <p className="sig-name">{sig.approver}</p>}
          </>
        ) : (
          <label className="field">
            <span className="field-label">Approver email</span>
            <input className="input" type="email" inputMode="email" autoComplete="email" placeholder="name@company.com"
              value={sig.email} disabled={readOnly} onChange={(e) => setSig({ email: e.target.value.trim() })} />
          </label>
        )}
      </div>
      {!readOnly && can('tags:submit') && (
        <ActionBar>
          <SubmitButton onClick={submit} busy={busy} />
        </ActionBar>
      )}
      {decided && (
        <ActionBar>
          <button className="btn btn--outline" disabled={busy} onClick={() => act(() => apexApi.tags.reject(tag.id), 'Sent back as rejected')}>Reject</button>
          <SubmitButton label="Approve" busy={busy} onClick={() => act(() => apexApi.tags.approve(tag.id), 'Approved')} />
        </ActionBar>
      )}
    </>
  );
}

function mailto(tag, sig) {
  const subject = `Change order ${tag.tagNumber} – ${tag.jobName} – signature requested`;
  const body = [
    `Hello ${sig.approver},`,
    '',
    `Please review and sign change order tag ${tag.tagNumber} for ${tag.jobNo} ${tag.jobName}.`,
    '',
    tag.description,
    '',
    `Labor lines: ${tag.labor.length}, materials: ${tag.materials.length}, equipment: ${tag.equipment.length}, other charges: ${tag.expenses.length}.`,
    '',
    'Stockham Construction',
  ].join('\n');
  return `mailto:${encodeURIComponent(sig.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
