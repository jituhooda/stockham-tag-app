import { Navigate, createBrowserRouter } from 'react-router-dom';
import { AppShell, EmptyDetail } from '../layouts/AppShell';
import { TagDetailPage } from '../pages/TagDetailPage';

export const TAB_KEYS = ['details', 'cost', 'files', 'issues', 'sign'];
export const tagPath = (id, tab = 'details', sub) => `/tags/${encodeURIComponent(id)}/${tab}${sub ? `/${sub}` : ''}`;

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <EmptyDetail /> },
      { path: 'tags/:id', element: <Navigate to="details" replace /> },
      { path: 'tags/:id/:tab/:sub?', element: <TagDetailPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
