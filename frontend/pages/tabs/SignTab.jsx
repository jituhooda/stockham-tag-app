import { useCallback, useMemo, useState } from 'react';
import { IconEraser, IconPlus } from '../../components/icons';
import { NotConnected } from '../../components/NotConnected';
import { ActionBar, SearchSelect, SignaturePad, SubmitButton, useToast } from '../../components/ui';
import { apexApi } from '../../lib/apexApi';
import { apexConfig } from '../../lib/apexConfig';
import { storage } from '../../lib/storage';
import { signatureProblems, submitProblems, tabForProblem } from '../../services/validation';
import { useApp } from '../../state/AppContext';

const KEY = apexConfig.storageKeys.approvers;

export function SignTab({ tag, edit, save, goTo, readOnly, busy, editor, follow }) {
  const { config } = useApp();
  const toast = useToast();
  const sig = tag.signature;
  const customer = tag.customerName || tag.customerId || '';
  // Approver names are remembered on this device, per customer.
  const [approvers, setApprovers] = useState(() => storage.get(KEY, {}));
  const submitConnected = config.features.submit;

  const options = useMemo(() => {
    const names = new Set(approvers[customer] || []);
    if (sig.approver) names.add(sig.approver);
    return [...names].sort().map((n) => ({ value: n, label: n }));
  }, [approvers, customer, sig.approver]);

  const setSig = useCallback((patch) => edit((t) => ({ signature: { ...t.signature, ...patch } })), [edit]);

  const chooseApprover = (name) => {
    const n = name.trim();
    if (!n) return;
    setSig({ approver: n });
    const next = { ...approvers, [customer]: [...new Set([...(approvers[customer] || []), n])] };
    setApprovers(next);
    storage.set(KEY, next);
  };

  const submit = async () => {
    const problems = [...submitProblems(tag), ...signatureProblems(sig)];
    if (problems.length) {
      toast(problems[0], 'error');
      const tab = tabForProblem(problems[0]);
      if (tab) goTo(tab);
      return;
    }
    if (editor.dirty && !(await save({ quiet: true, follow: false }))) return;
    try {
      const done = await apexApi.tags.setStatus(editor.form.id, sig.mode === 'in-person' ? 'Signed' : 'Submitted');
      toast('Submitted');
      follow(done);
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <>
      <div className="tab-body sign">
        <span className="field-label">Approver from {customer || 'the customer'}</span>
        <div className="desc-picker">
          <SearchSelect value={sig.approver} options={options} allowCustom disabled={readOnly} ariaLabel="Approver"
            placeholder="Type the approver’s name" onChange={(o) => chooseApprover(o.label)} />
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
          {config.features.sendForSignature !== false && (
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
              <span className="muted">Sign above</span>
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

        {!submitConnected && !readOnly && (
          <NotConnected what="Submitting a signed tag">
            Saving the signature and approver needs the eMachine API the existing app calls on Submit. Your cost and
            detail changes still save with Save.
          </NotConnected>
        )}
      </div>
      {!readOnly && (
        <ActionBar>
          <SubmitButton onClick={submit} busy={busy} disabled={!submitConnected} />
        </ActionBar>
      )}
    </>
  );
}
