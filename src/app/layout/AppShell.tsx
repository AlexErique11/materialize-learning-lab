import { useEffect, useRef } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router';
import { WalkthroughProvider } from '../../components/walkthrough/WalkthroughProvider';
import { AppHeader } from '../../components/layout/AppHeader';
import { LabEntryTransition } from '../../components/lab/LabEntryTransition';
import { AreaTransition } from '../../motion/AreaTransition';
import { UiMotion } from '../../motion/UiMotion';

export function AppShell() {
  const mainRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  const isLearningPath = pathname === '/';
  const isGuidedLab = pathname.startsWith('/labs/');

  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <div className={`app-shell${isLearningPath ? ' app-shell-learning-path' : ''}${isGuidedLab ? ' app-shell-guided-labs' : ''}`}
      onKeyDownCapture={event => { if (event.key === 'Tab') event.currentTarget.dataset.focusInput = 'tab'; }}
      onPointerDownCapture={event => { event.currentTarget.dataset.focusInput = 'pointer'; }}>
      <WalkthroughProvider>
        <UiMotion />
        <AreaTransition />
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <AppHeader />
        <LabEntryTransition>
          <main ref={mainRef} id="main-content" tabIndex={-1} className="app-main">
            <Outlet />
          </main>
          {!isLearningPath && !isGuidedLab && (
            <footer className="app-footer">
              <span>Materialize Learning Lab</span>
            </footer>
          )}
          <ScrollRestoration />
        </LabEntryTransition>
      </WalkthroughProvider>
    </div>
  );
}
