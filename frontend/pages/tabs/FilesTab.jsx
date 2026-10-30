import { useRef, useState } from 'react';
import { IconClose, IconFile, IconPaperclip, IconPlusCircle, IconTrash } from '../../components/icons';
import { useToast } from '../../components/ui';
import { useAuthedObjectUrl } from '../../hooks/useAuthedObjectUrl';
import { apexApi } from '../../lib/apexApi';
import { compressImage, formatBytes } from '../../services/image';
import { NEW_TAG_ID } from '../../services/tagModel';
import { useApp } from '../../state/AppContext';

const ACCEPT = 'image/*,application/pdf,.doc,.docx,.xls,.xlsx';

export function FilesTab({ tag, editor, save, follow, readOnly }) {
  const { config } = useApp();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const toast = useToast();
  const maxBytes = config?.uploads?.maxBytes || 10 * 1024 * 1024;

  const onFiles = async (files) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      // Files attach to a stored tag, so a brand-new tag is saved first.
      let tagId = tag.id;
      let created = null;
      if (tagId === NEW_TAG_ID) {
        created = await save({ quiet: true, follow: false });
        if (!created) return;
        tagId = created.id;
      }
      for (const original of Array.from(files)) {
        const file = await compressImage(original);
        if (file.size > maxBytes) {
          toast(`${original.name} is larger than ${formatBytes(maxBytes)}`, 'error');
          continue;
        }
        try {
          const att = await apexApi.attachments.upload(tagId, file);
          editor.setAttachments((list) => [...list, att]);
        } catch (e) {
          toast(`${original.name}: ${e.message}`, 'error');
        }
      }
      if (created) follow(created);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async (a) => {
    if (!window.confirm(`Delete ${a.name}?`)) return;
    try {
      await apexApi.attachments.remove(tag.id, a.id);
      editor.setAttachments((list) => list.filter((x) => x.id !== a.id));
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <>
      <div className="tab-body">
        <div className="section-head section-head--bar">
          <IconPaperclip size={22} />
          <h3 className="normal">Attachments</h3>
          {!readOnly && (
            <button className="icon-btn push-right" aria-label="Add attachment" onClick={() => inputRef.current?.click()} disabled={busy}>
              <IconPlusCircle size={30} />
            </button>
          )}
          <input ref={inputRef} type="file" multiple accept={ACCEPT} hidden onChange={(e) => onFiles(e.target.files)} />
        </div>

        {busy && <p className="muted small center">Uploading…</p>}
        {!tag.attachments.length && !busy && (
          <button className="dropzone" onClick={() => !readOnly && inputRef.current?.click()} disabled={readOnly}>
            {readOnly ? 'No attachments' : 'Tap to add photos or documents'}
          </button>
        )}

        <div className="file-grid">
          {tag.attachments.map((a) => (
            <figure className="file-tile" key={a.id}>
              <button className="file-tile__thumb" onClick={() => setPreview(a)} aria-label={`Open ${a.name}`}>
                <Thumb attachment={a} />
              </button>
              <figcaption>
                <span title={`${a.name} · ${formatBytes(a.size)}`}>{a.name}</span>
                {!readOnly && (
                  <button className="icon-btn trash" aria-label={`Delete ${a.name}`} onClick={() => remove(a)}>
                    <IconTrash size={20} />
                  </button>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      {preview && <Preview attachment={preview} onClose={() => setPreview(null)} />}
    </>
  );
}

const isImage = (a) => a.contentType.startsWith('image/');

function Thumb({ attachment }) {
  const src = useAuthedObjectUrl(attachment.url, isImage(attachment));
  if (!isImage(attachment)) return <IconFile size={48} />;
  return src ? <img src={src} alt="" /> : <span className="muted small">…</span>;
}

function Preview({ attachment: a, onClose }) {
  const src = useAuthedObjectUrl(a.url);
  return (
    <div className="lightbox" role="dialog" aria-label={a.name} onClick={onClose}>
      <button className="icon-btn icon-btn--light lightbox__close" aria-label="Close"><IconClose size={28} /></button>
      {isImage(a) && src ? (
        <img src={src} alt={a.name} onClick={(e) => e.stopPropagation()} />
      ) : (
        <div className="lightbox__file" onClick={(e) => e.stopPropagation()}>
          <IconFile size={56} />
          <p>{a.name}</p>
          <p className="muted small">{formatBytes(a.size)}</p>
          {src && <a className="btn btn--dark" href={src} download={a.name}>Download</a>}
        </div>
      )}
    </div>
  );
}
