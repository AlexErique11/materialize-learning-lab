import { useEffect, useRef } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router';
import { WalkthroughProvider } from '../../components/walkthrough/WalkthroughProvider';
import { AppHeader } from '../../components/layout/AppHeader';
import { LabEntryTransition } from '../../components/lab/LabEntryTransition';
import { AreaTransition } from '../../motion/AreaTransition';
import { UiMotion } from '../../motion/UiMotion';
import { challenge } from '../../challenges/challengeRegistry';

export function AppShell() {
  const mainRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  const isLearningPath = pathname === '/';
  const isGuidedLab = pathname.startsWith('/labs/');
  const isChallenge = pathname === challenge.path;

  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <div className={`app-shell${isLearningPath ? ' app-shell-learning-path' : ''}${isGuidedLab ? ' app-shell-guided-labs' : ''}${isChallenge ? ' app-shell-challenge' : ''}`}>
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
          {!isLearningPath && !isGuidedLab && !isChallenge && (
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
