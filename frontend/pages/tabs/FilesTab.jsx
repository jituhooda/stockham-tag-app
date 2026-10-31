import { useCallback, useEffect, useRef, useState } from 'react';
import { IconAudio, IconClose, IconDocument, IconImage, IconPaperclip, IconPlusCircle, IconTrash, IconVideo } from '../../components/icons';
import { ImageEditor } from '../../components/ImageEditor';
import { ConfirmDialog, Overlay, Spinner, useToast } from '../../components/ui';
import { apexApi, fileKind } from '../../lib/apexApi';
import { apexConfig } from '../../lib/apexConfig';
import { WritesDisabledError } from '../../lib/apexHttp';
import { NEW_TAG_ID } from '../../services/tagModel';
import { useApp } from '../../state/AppContext';

const KIND_ICON = { image: IconImage, video: IconVideo, audio: IconAudio, document: IconDocument };
const DOC_TYPES = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf,.odt,.ods,.zip,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv';

const isImage = (f) => /^image\//.test(f.type) || fileKind(f.name) === 'image';

/** Full-screen photo viewer with a close (×) button in the upper-right corner. */
function ImageViewer({ file, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <Overlay>
      <div className="viewer" role="dialog" aria-modal="true" aria-label={file.name} onClick={onClose}>
        <div className="viewer__frame" onClick={(e) => e.stopPropagation()}>
          <button className="viewer__close" aria-label="Close" onClick={onClose}><IconClose size={22} /></button>
          <img src={file.url} alt={file.name} />
        </div>
      </div>
    </Overlay>
  );
}

/** One attached file: a photo thumbnail, or an icon for video / audio / documents. Tapping a photo enlarges it; other files open in a new tab. */
function FileCard({ file, onDelete, onView, canDelete }) {
  const kind = fileKind(file.name);
  const [broken, setBroken] = useState(false);
  const [viewing, setViewing] = useState(false);
  const Icon = KIND_ICON[kind];
  const showImage = kind === 'image' && !broken;
  const thumb = showImage
    ? <img src={file.url} alt={file.name} loading="lazy" onError={() => setBroken(true)} />
    : <span className="file-card__icon"><Icon size={44} /></span>;
  return (
    <li className="file-card">
      {showImage ? (
        <button type="button" className="file-card__thumb" onClick={() => setViewing(true)} aria-label={`View ${file.name}`}>{thumb}</button>
      ) : (
        <a className="file-card__thumb" href={file.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${file.name}`}>{thumb}</a>
      )}
      {viewing && <ImageViewer file={file} onClose={() => setViewing(false)} />}
      <div className="file-card__foot">
        <span className="file-card__name" title={file.name}>{file.name}</span>
        {canDelete && (
          <button className="icon-btn trash" aria-label={`Delete ${file.name}`} onClick={() => onDelete(file)}>
            <IconTrash size={26} />
          </button>
        )}
      </div>
    </li>
  );
}

/** Attachments: photos, audio and documents saved on the tag (stored in eMachine's cloud storage). */
export function FilesTab({ tag, readOnly }) {
  const { user } = useApp();
  const toast = useToast();
  const isNew = tag.id === NEW_TAG_ID;
  const [files, setFiles] = useState(null);
  const [error, setError] = useState('');
  const [menu, setMenu] = useState(null); // { top, right } while the source menu is open
  const [editing, setEditing] = useState(null); // a picked photo waiting in the editor
  const [uploading, setUploading] = useState(0);
  const [asking, setAsking] = useState(null);
  const plusRef = useRef(null);
  const photoInput = useRef(null);
  const audioInput = useRef(null);
  const docInput = useRef(null);

  const load = useCallback(async (signal) => {
    if (isNew) { setFiles([]); return; }
    try {
      setFiles(await apexApi.tags.photos(tag.id, signal));
      setError('');
    } catch (e) {
      if (!signal?.aborted) setError(e.message);
    }
  }, [tag.id, isNew]);

  useEffect(() => {
    const ctrl = new AbortController();
    load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  const openMenu = () => {
    if (isNew) { toast('Save the tag first, then you can add files.', 'error'); return; }
    const r = plusRef.current.getBoundingClientRect();
    setMenu({ top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) });
  };

  const upload = async (file) => {
    setUploading((n) => n + 1);
    try {
      await apexApi.tags.attachFile({ tagId: tag.id, file, filename: file.name, user: user.email });
      await load();
      toast('File added');
    } catch (e) {
      toast(e instanceof WritesDisabledError ? 'Saving to eMachine is turned off, so the file was not added.' : e.message, 'error');
    } finally {
      setUploading((n) => n - 1);
    }
  };

  const picked = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // so choosing the same file again still fires
    if (!file) return;
    if (isImage(file)) setEditing(file);
    else upload(file);
  };

  const remove = async () => {
    const file = asking;
    try {
      const fromCloud = await apexApi.tags.deletePhoto(file.id, { name: file.name, user: user.email });
      setFiles((list) => list.filter((f) => f.id !== file.id));
      setAsking(null);
      toast(fromCloud ? 'Deleted' : 'Deleted from the tag, but the stored copy could not be removed', fromCloud ? undefined : 'error');
    } catch (e) {
      setAsking(null);
      toast(e instanceof WritesDisabledError ? 'Saving to eMachine is turned off, so nothing was deleted.' : e.message, 'error');
    }
  };

  const choose = (input) => { setMenu(null); input.current?.click(); };

  return (
    <div className="tab-body">
      <div className="section-head section-head--bar">
        <IconPaperclip size={22} />
        <h3 className="normal">Attachments</h3>
        {!readOnly && (
          <button ref={plusRef} className="icon-btn push-right" aria-label="Add attachment" aria-haspopup="menu" aria-expanded={!!menu} onClick={openMenu}>
            <IconPlusCircle size={30} />
          </button>
        )}
      </div>

      {isNew && <p className="muted small center">Save the tag first, then you can attach files.</p>}
      {error && <p className="files-error" role="alert">Couldn’t load files: {error} <button className="link-btn" onClick={() => load()}>Retry</button></p>}
      {files === null && !error && <Spinner />}
      {files && !files.length && !uploading && !isNew && <p className="muted small center">No files attached yet.</p>}

      <ul className="file-grid">
        {(files || []).map((f) => <FileCard key={f.id} file={f} canDelete={!readOnly} onDelete={setAsking} />)}
        {uploading > 0 && (
          <li className="file-card file-card--busy" aria-live="polite">
            <span className="file-card__thumb"><span className="dialog__spinner" role="status" aria-label="Uploading" /></span>
            <div className="file-card__foot"><span className="file-card__name">Uploading…</span></div>
          </li>
        )}
      </ul>

      <input ref={photoInput} type="file" accept="image/*,video/*" hidden onChange={picked} />
      <input ref={audioInput} type="file" accept="audio/*" hidden onChange={picked} />
      <input ref={docInput} type="file" accept={DOC_TYPES} hidden onChange={picked} />

      {menu && (
        <Overlay>
        <div className="menu-backdrop" onPointerDown={() => setMenu(null)}>
          <div className="source-menu" role="menu" style={{ top: menu.top, right: menu.right }} onPointerDown={(e) => e.stopPropagation()}>
            <button role="menuitem" onClick={() => choose(photoInput)}><IconImage size={26} /> Photos &amp; Videos</button>
            <button role="menuitem" onClick={() => choose(audioInput)}><IconAudio size={26} /> Audio</button>
            <button role="menuitem" onClick={() => choose(docInput)}><IconDocument size={26} /> Documents</button>
            <button role="menuitem" className="source-menu__cancel" onClick={() => setMenu(null)}>Cancel</button>
          </div>
        </div>
        </Overlay>
      )}

      {editing && (
        <ImageEditor
          file={editing}
          maxPixels={apexConfig.uploads.imageMaxPixels}
          quality={apexConfig.uploads.imageQuality}
          onCancel={() => setEditing(null)}
          onDone={(edited) => { setEditing(null); upload(edited); }}
        />
      )}

      {asking && <ConfirmDialog text="Are you sure to delete?" onCancel={() => setAsking(null)} onConfirm={remove} />}
    </div>
  );
}
