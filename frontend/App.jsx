import { RouterProvider } from 'react-router-dom';
import { Banner, Spinner, ToastProvider } from './components/ui';
import { SignInPage } from './pages/SignInPage';
import { router } from './routes/router';
import { AppProvider, useApp } from './state/AppContext';
import { TagListProvider } from './state/TagListContext';

function Gate() {
  const { status, error, reload } = useApp();
  if (status === 'loading') return <div className="boot"><Spinner label="Starting…" /></div>;
  if (status === 'signed-out') return <SignInPage />;
  if (status === 'error') {
    return (
      <div className="boot">
        <Banner kind="error" action={<button className="link-btn" onClick={reload}>Retry</button>}>
          Can’t start the app: {error}
        </Banner>
      </div>
    );
  }
  return (
    <TagListProvider>
      <RouterProvider router={router} />
    </TagListProvider>
  );
}

export function App() {
  return (
    <ToastProvider>
      <AppProvider>
        <Gate />
      </AppProvider>
    </ToastProvider>
  );
}
