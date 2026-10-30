import { Outlet, useMatch } from 'react-router-dom';
import { Logo } from '../components/ui';
import { TagListPage } from '../pages/TagListPage';

/**
 * Phones show either the list or a tag. From 1024px wide the list stays on the
 * left and the open tag fills the right (see assets/styles.css).
 */
export function AppShell() {
  const inTag = !!useMatch('/tags/*');
  return (
    <div className={`shell${inTag ? ' shell--detail' : ''}`}>
      <aside className="shell__list">
        <TagListPage />
      </aside>
      <main className="shell__detail">
        <Outlet />
      </main>
    </div>
  );
}

export function EmptyDetail() {
  return (
    <div className="placeholder">
      <Logo className="placeholder__logo" />
      <p>Select a tag to view it, or add a new one.</p>
    </div>
  );
}
