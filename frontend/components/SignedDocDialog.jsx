import { useEffect } from 'react';
import { IconCheckCircle, IconFile } from './icons';
import { Overlay } from './ui';

/** Shown after Submit succeeds: the link to the signed PDF the service made, or (sentTo) who the tag was sent to for signature. */
export function SignedDocDialog({ links, sentTo, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <Overlay>
      <div className="alert-backdrop">
        <div className="alert signed-doc" role="alertdialog" aria-modal="true" aria-label={sentTo ? 'Sent for signature' : 'Submitted'}>
          <IconCheckCircle size={44} className="signed-doc__ok" />
          <p><strong>{sentTo ? 'Sent for signature' : 'Submitted'}</strong></p>
          {sentTo ? <p className="muted small">{sentTo}</p> : <SignedDocLinks links={links} />}
          <button className="alert__ok" autoFocus onClick={onClose}>OK</button>
        </div>
      </div>
    </Overlay>
  );
}

export function SignedDocLinks({ links }) {
  return (
    <div className="signed-doc__links">
      {links.pdf ? (
        <a className="btn btn--dark" href={links.pdf} target="_blank" rel="noopener noreferrer">
          <IconFile size={18} /> Open signed document
        </a>
      ) : (
        <p className="muted small">The service didn’t return a link to the document.</p>
      )}
      {links.autodesk && <a className="signed-doc__alt" href={links.autodesk} target="_blank" rel="noopener noreferrer">View in Autodesk</a>}
      {links.docId && <span className="muted small">{links.docId}</span>}
    </div>
  );
}
