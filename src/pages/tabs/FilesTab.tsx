import { useRef, useState } from 'react';
import { ActionBar, SaveButton } from '../../components/ActionBar';
import { IconClose, IconFile, IconPaperclip, IconPlusCircle, IconTrash } from '../../components/Icons';
import { useToast } from '../../components/Toast';
import type { Attachment } from '../../types';
import { compressImage, readAsDataUrl } from '../../utils/image';
import { formatBytes, uid } from '../../utils/misc';
import type { TabProps } from '../TagDetailPage';

const MAX_FILE = 4 * 1024 * 1024;

export function FilesTab({ tag, edit, save, readOnly }: TabProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Attachment | null>(null);
  const toast = useToast();

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const added: Attachment[] = [];
    for (const f of Array.from(files)) {
      try {
        const isImage = f.type.startsWith('image/');
        if (!isImage && f.size > MAX_FILE) {
          toast(`${f.name} is larger than ${formatBytes(MAX_FILE)}`, 'error');
          continue;
        }
        const dataUrl = isImage ? await compressImage(f) : await readAsDataUrl(f);
        added.push({ key: uid(), name: f.name, type: f.type, size: Math.round((dataUrl.length * 3) / 4), dataUrl, addedAt: new Date().toISOString() });
      } catch {
        toast(`Couldn’t read ${f.name}`, 'error');
      }
    }
    if (added.length) edit((t) => ({ attachments: [...t.attachments, ...added] }));
    setBusy(false);
    if (inputRef.current) inputRef.current.value = '';
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
          <input ref={inputRef} type="file" multiple accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx" hidden onChange={(e) => onFiles(e.target.files)} />
        </div>

        {busy && <p className="muted small center">Processing…</p>}
        {!tag.attachments.length && !busy && (
          <button className="dropzone" onClick={() => !readOnly && inputRef.current?.click()} disabled={readOnly}>
            {readOnly ? 'No attachments' : 'Tap to add photos or documents'}
          </button>
        )}

        <div className="file-grid">
          {tag.attachments.map((a) => (
            <figure className="file-tile" key={a.key}>
              <button className="file-tile__thumb" onClick={() => setPreview(a)} aria-label={`Open ${a.name}`}>
                {a.type.startsWith('image/') ? <img src={a.dataUrl} alt="" loading="lazy" /> : <IconFile size={48} />}
              </button>
              <figcaption>
                <span title={a.name}>{a.name}</span>
                {!readOnly && (
                  <button
                    className="icon-btn trash"
                    aria-label={`Delete ${a.name}`}
                    onClick={() => window.confirm(`Delete ${a.name}?`) && edit((t) => ({ attachments: t.attachments.filter((x) => x.key !== a.key) }))}
                  >
                    <IconTrash size={20} />
                  </button>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
      {!readOnly && (
        <ActionBar>
          <SaveButton onClick={() => save()} disabled={busy} />
        </ActionBar>
      )}

      {preview && (
        <div className="lightbox" role="dialog" aria-label={preview.name} onClick={() => setPreview(null)}>
          <button className="icon-btn icon-btn--light lightbox__close" aria-label="Close"><IconClose size={28} /></button>
          {preview.type.startsWith('image/') ? (
            <img src={preview.dataUrl} alt={preview.name} onClick={(e) => e.stopPropagation()} />
          ) : (
            <div className="lightbox__file" onClick={(e) => e.stopPropagation()}>
              <IconFile size={56} />
              <p>{preview.name}</p>
              <a className="btn btn--dark" href={preview.dataUrl} download={preview.name}>Download</a>
            </div>
          )}
        </div>
      )}
    </>
  );
}
