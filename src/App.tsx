import { Navigate, Outlet, RouterProvider, createBrowserRouter, useMatch } from 'react-router-dom';
import { Logo } from './components/Logo';
import { ToastProvider } from './components/Toast';
import { TagDetailPage } from './pages/TagDetailPage';
import { TagListPage } from './pages/TagListPage';
import { MasterDataProvider } from './store/MasterDataContext';
import { TagsProvider } from './store/TagsContext';

/**
 * Phones show either the list or a tag. From tablet-landscape widths up, the
 * list stays on the left and the open tag fills the right (see styles.css).
 */
function Shell() {
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

function Placeholder() {
  return (
    <div className="placeholder">
      <Logo className="placeholder__logo" />
      <p>Select a tag to view it, or add a new one.</p>
    </div>
  );
}

const router = createBrowserRouter([
  {
    element: <Shell />,
    children: [
      { index: true, element: <Placeholder /> },
      { path: 'tags/:id', element: <Navigate to="details" replace /> },
      { path: 'tags/:id/:tab/:sub?', element: <TagDetailPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

export function App() {
  return (
    <ToastProvider>
      <MasterDataProvider>
        <TagsProvider>
          <RouterProvider router={router} />
        </TagsProvider>
      </MasterDataProvider>
    </ToastProvider>
  );
}
