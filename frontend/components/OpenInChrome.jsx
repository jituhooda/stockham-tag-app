import { canOfferChrome, chromeUrl } from '../lib/openInChrome';
import { platform } from '../lib/platform';

/** iPhone only: a link that opens this page in Chrome. It needs the Chrome app; without it iOS shows an error. */
export function OpenInChrome({ className }) {
  if (platform() !== 'ios' || !canOfferChrome()) return null;
  return (
    <p className={className}>
      <a href={chromeUrl(window.location.href, 'ios')}>Open in Chrome</a>
      <span className="muted small"> (needs the Chrome app)</span>
    </p>
  );
}
