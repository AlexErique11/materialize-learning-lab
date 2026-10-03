import { useEffect, useRef } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router';
import { AppHeader } from '../../components/layout/AppHeader';

export function AppShell() {
  const mainRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  const isLearningPath = pathname === '/';
  const isGuidedLab = pathname.startsWith('/labs/');

  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <div className={`app-shell${isLearningPath ? ' app-shell-learning-path' : ''}${isGuidedLab ? ' app-shell-guided-labs' : ''}`}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <AppHeader />
      <main ref={mainRef} id="main-content" tabIndex={-1} className="app-main">
        <Outlet />
      </main>
      {!isLearningPath && !isGuidedLab && (
        <footer className="app-footer">
          <span>Materialize Learning Lab</span>
        </footer>
      )}
      <ScrollRestoration />
    </div>
  );
}
