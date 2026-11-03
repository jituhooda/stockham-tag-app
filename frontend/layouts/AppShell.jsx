import { Outlet, useMatch } from 'react-router-dom';
import { Logo } from '../components/ui';
import { useLayout } from '../hooks/useLayout';
import { TagListPage } from '../pages/TagListPage';

/**
 * Phone: one pane - the tag list, or the open tag full screen.
 * Tablet / desktop: the list stays on the left and the open tag fills the right.
 */
export function AppShell() {
  const { layout, split } = useLayout();
  const inTag = !!useMatch('/tags/*');
  const classes = ['shell', `shell--${layout}`, split ? 'shell--split' : inTag ? 'shell--show-detail' : 'shell--show-list'];
  return (
    <div className={classes.join(' ')} data-layout={layout}>
      <aside className="shell__list" aria-label="Tags">
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
