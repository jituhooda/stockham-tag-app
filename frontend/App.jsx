import { RouterProvider } from 'react-router-dom';
import { ToastProvider } from './components/ui';
import { InstallPage } from './pages/InstallPage';
import { SignInPage } from './pages/SignInPage';
import { router } from './routes/router';
import { AppProvider, useApp } from './state/AppContext';
import { TagListProvider } from './state/TagListContext';

function Gate() {
  const { signedIn } = useApp();
  if (!signedIn) return <SignInPage />;
  return (
    <TagListProvider>
      <RouterProvider router={router} />
    </TagListProvider>
  );
}

export function App() {
  // The install guide is public: it must work before anyone has signed in.
  if (window.location.pathname.replace(/\/$/, '') === '/install') return <InstallPage />;
  return (
    <ToastProvider>
      <AppProvider>
        <Gate />
      </AppProvider>
    </ToastProvider>
  );
}
