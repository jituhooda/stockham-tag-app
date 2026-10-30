import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';

/**
 * Ask before leaving the current tag with unsaved edits (in-app navigation and
 * tab close). Moving between the same tag's tabs is allowed. `dirtyRef` is a
 * ref so a save immediately followed by navigation isn't blocked by a stale value.
 */
export function useUnsavedChangesGuard(dirtyRef, tagPathPrefix, onDiscard) {
  const blocker = useBlocker(
    ({ nextLocation }) => dirtyRef.current && !nextLocation.pathname.startsWith(tagPathPrefix),
  );

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (window.confirm('You have unsaved changes. Leave without saving?')) {
      onDiscard?.();
      blocker.proceed();
    } else {
      blocker.reset();
    }
  }, [blocker, onDiscard]);

  useEffect(() => {
    const warn = (e) => {
      if (dirtyRef.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirtyRef]);
}
