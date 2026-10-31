import { useCallback, useEffect, useMemo, useState } from 'react';
import { IconEraser, IconPlus } from '../../components/icons';
import { NewApproverDialog } from '../../components/NewApproverDialog';
import { SignedDocDialog, SignedDocLinks } from '../../components/SignedDocDialog';
import { NotConnected } from '../../components/NotConnected';
import { ActionBar, SearchSelect, SignaturePad, SubmitButton, useToast } from '../../components/ui';
import { useMasterData } from '../../hooks/useMasterData';
import { apexApi } from '../../lib/apexApi';
import { WritesDisabledError } from '../../lib/apexHttp';
import { buildSignedDocBody, postSignedDoc, recallSignedDoc, rememberSignedDoc, signedDocLinks, signedDocProblems } from '../../lib/signedDoc';
import { NEW_TAG_ID } from '../../services/tagModel';
import { signatureProblems, submitProblems, tabForProblem } from '../../services/validation';
import { useApp } from '../../state/AppContext';

/**
 * Sign: choose who approves (a contact of the tag's customer), then take their signature on the screen or send it
 * to them. The approver and signature are kept on screen until Submit; Save doesn't write them.
 */
export function SignTab({ tag, save, goTo, refresh, readOnly, busy, editor, follow }) {
  const { config, user } = useApp();
  const toast = useToast();
  const sig = tag.signature;
  const isNew = tag.id === NEW_TAG_ID;
  const submitConnected = config.features.submit;
  const { editLocal } = editor;

  const contacts = useMasterData('approvers', tag.customerId);
  const [customerName, setCustomerName] = useState(tag.customerName || '');
  const [adding, setAdding] = useState(false);
  const [onFile, setOnFile] = useState([]); // signatures already saved on this tag
  const [submitting, setSubmitting] = useState(false);
  const [doneLinks, setDoneLinks] = useState(null); // the signed document, once Submit succeeded
  // A new tag changes id on its first save, which remounts this tab: a just-made document still opens the dialog.
  const [showDone, setShowDone] = useState(() => Date.now() - (recallSignedDoc(tag.id)?.at || 0) < 15000);
  const signedDoc = useMemo(() => doneLinks || recallSignedDoc(tag.id), [doneLinks, tag.id]);

  // "Approver from {customer}": the customer's name from the tag, else from its contacts, else looked up.
  const fromContacts = contacts.data[0]?.customerName || '';
  useEffect(() => {
    if (tag.customerName || fromContacts || !tag.customerId) return undefined;
    let live = true;
    apexApi.master.customerName(tag.customerId).then((n) => live && n && setCustomerName(n), () => {});
    return () => { live = false; };
  }, [tag.customerName, tag.customerId, fromContacts]);
  const customer = tag.customerName || fromContacts || customerName;

  // Signatures already saved on the tag.
  useEffect(() => {
    if (isNew) return undefined;
    const ctrl = new AbortController();
    apexApi.tags.signatures(tag.id, ctrl.signal).then(setOnFile, () => {});
    return () => ctrl.abort();
  }, [isNew, tag.id]);

  const options = useMemo(() => {
    const dup = new Set();
    const seen = new Set();
    contacts.data.forEach((c) => { if (seen.has(c.name.toLowerCase())) dup.add(c.name.toLowerCase()); seen.add(c.name.toLowerCase()); });
    return contacts.data.map((c) => ({ value: c.id, label: c.name, sub: dup.has(c.name.toLowerCase()) ? c.email : undefined }));
  }, [contacts.data]);

  const setSig = useCallback((patch) => editLocal((t) => ({ signature: { ...t.signature, ...patch } })), [editLocal]);

  const chooseApprover = (id) => {
    const c = contacts.data.find((x) => x.id === id);
    if (c) setSig({ approverId: c.id, approver: c.name, email: c.email });
  };

  const addApprover = async (input) => {
    const email = input.email.trim().toLowerCase();
    let contact = contacts.data.find((c) => c.email.toLowerCase() === email);
    const existed = !!contact;
    if (!contact) {
      let id;
      try {
        id = await apexApi.master.createApprover({ customerId: tag.customerId, ...input });
      } catch (e) {
        if (e instanceof WritesDisabledError) throw new Error('Saving to eMachine is turned off, so the approver was not added.');
        throw e;
      }
      const fresh = await contacts.reload();
      contact = (id != null && fresh.find((c) => c.id === String(id))) || fresh.find((c) => c.email.toLowerCase() === email);
    }
    setAdding(false);
    if (contact) setSig({ approverId: contact.id, approver: contact.name, email: contact.email });
    toast(existed ? `${contact.name} is already an approver` : 'Approver added');
  };

  /**
   * Submit: check, save the tag (with its cost lines, files and issues), read everything back, send the signed-document
   * request, then re-read the tag. The document service does the rest (document, Autodesk, emails).
   */
  const submit = async () => {
    if (submitting) return;
    const problems = [...submitProblems(tag), ...signatureProblems(sig)];
    if (problems.length) {
      toast(problems[0], 'error');
      const tab = tabForProblem(problems[0]);
      if (tab) goTo(tab);
      return;
    }
    setSubmitting(true);
    try {
      // Save first, so the document is made from what is stored. A new tag gets its id here.
      let saved = !isNew && !editor.dirty ? editor.form : null;
      if (!saved) {
        saved = await save({ quiet: true, follow: false });
        if (!saved) return;
      }
      const current = { ...saved, signature: sig };
      const data = await apexApi.tags.submitData(current);
      const body = buildSignedDocBody({ tag: current, signature: sig, user, data });
      const more = signedDocProblems(body);
      if (more.length) {
        toast(more[0], 'error');
        const tab = tabForProblem(more[0]);
        if (tab) goTo(tab);
        return;
      }
      const links = signedDocLinks(await postSignedDoc(body, user.email));
      rememberSignedDoc(current.id, links);
      let done;
      try {
        done = await apexApi.tags.finishSubmit(current.id);
      } catch (e) {
        toast('The signed document was created, but the tag’s status could not be updated. Open the tag to check it.', 'error');
        refresh?.();
        return;
      }
      editor.accept(done);
      refresh?.();
      setDoneLinks(links);
      setShowDone(true);
      follow(done);
    } catch (e) {
      toast(e instanceof WritesDisabledError ? 'Saving to eMachine is turned off, so nothing was submitted.' : e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const sendMode = sig.mode !== 'in-person';

  const canAdd = !readOnly && !!tag.customerId;

  return (
    <>
      <div className="tab-body sign">
        {signedDoc && (
          <section className="sig-on-file" aria-label="Signed document">
            <span className="field-label caps">Signed document</span>
            <SignedDocLinks links={signedDoc} />
          </section>
        )}
        {onFile.length > 0 && (
          <section className="sig-on-file" aria-label="Signature on file">
            <span className="field-label caps">Signed</span>
            {onFile.map((s) => (
              <div key={s.id} className="sig-on-file__item">
                {s.image && <img src={s.image} alt={`Signature of ${s.name}`} />}
                <p><strong>{s.name || 'Signed'}</strong>{s.role ? ` · ${s.role}` : ''}</p>
                {(s.signedAt || s.description) && <p className="muted small">{[s.signedAt, s.description].filter(Boolean).join(' · ')}</p>}
              </div>
            ))}
          </section>
        )}

        <span className="field-label">Approver from {customer || 'the customer'}</span>
        <div className="desc-picker">
          <SearchSelect value={sig.approver} options={options} loading={contacts.loading} disabled={readOnly || !tag.customerId} ariaLabel="Approver"
            placeholder={tag.customerId ? (contacts.error ? 'Approvers unavailable' : 'Select the approver') : 'This tag has no customer'}
            onChange={(o) => chooseApprover(o.value)} />
          {canAdd && (
            <button type="button" className="icon-btn desc-picker__add" aria-label="Add approver" title="Add approver" onClick={() => setAdding(true)}>
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
            {sig.email && <p className="sig-email">{sig.email}</p>}
          </>
        ) : (
          <label className="field">
            <span className="field-label">Approver email</span>
            <input className="input" type="email" inputMode="email" autoComplete="email" placeholder="name@company.com"
              value={sig.email} disabled={readOnly} onChange={(e) => setSig({ email: e.target.value.trim() })} />
          </label>
        )}

        {sendMode && !readOnly && (
          <NotConnected what="Sending a tag for signature">
            Submit works for “Sign in person”. Sending the tag to the approver to sign later needs its own request,
            which hasn’t been captured yet.
          </NotConnected>
        )}
      </div>
      {!readOnly && (
        <ActionBar>
          <SubmitButton onClick={submit} busy={busy || submitting} disabled={!submitConnected || sendMode} />
        </ActionBar>
      )}
      {showDone && signedDoc && <SignedDocDialog links={signedDoc} onClose={() => setShowDone(false)} />}
      {adding && <NewApproverDialog customerName={customer} onCancel={() => setAdding(false)} onCreate={addApprover} />}
    </>
  );
}
