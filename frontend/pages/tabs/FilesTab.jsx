import { IconPaperclip, IconPlusCircle } from '../../components/icons';
import { NotConnected } from '../../components/NotConnected';
import { useApp } from '../../state/AppContext';

/** Attachments: shown once eMachine's file API is wired (features.attachments). */
export function FilesTab() {
  const { config } = useApp();
  return (
    <div className="tab-body">
      <div className="section-head section-head--bar">
        <IconPaperclip size={22} />
        <h3 className="normal">Attachments</h3>
        <button className="icon-btn push-right" aria-label="Add attachment" disabled>
          <IconPlusCircle size={30} />
        </button>
      </div>
      {!config.features.attachments && (
        <NotConnected what="Adding photos and documents">
          Uploading needs eMachine’s file API. Capture one upload in the existing app (DevTools → Network → Copy as cURL)
          and it can be wired in.
        </NotConnected>
      )}
    </div>
  );
}
