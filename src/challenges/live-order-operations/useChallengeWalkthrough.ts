import { useEffect, useRef, useState } from 'react';
import { useWalkthrough } from '../../components/walkthrough/WalkthroughProvider';
import { challengeTourFinish, challengeTourSections, challengeTourSteps, challengeTourWelcome } from './challengeWalkthroughContent';
import { getChallengeTourPreference, saveChallengeTourPreference } from './challengeWalkthroughStorage';
import type { ChallengeRun } from './run';

// Timer flushes are legitimate at entry/exit; all investigation changes end the tour.
const investigationKey = (run: ChallengeRun) => JSON.stringify({ ...run, revision: 0, activeDurationMs: 0 });

export function useChallengeWalkthrough(run: ChallengeRun) {
  const walkthrough = useWalkthrough();
  const [preference, setPreference] = useState(getChallengeTourPreference);
  const [interrupted, setInterrupted] = useState(false);
  const original = useRef<{ key: string; scroll: number; path: string } | null>(null);
  const step = walkthrough.challengeOpen ? challengeTourSteps.find(item => item.id === walkthrough.challengeStep?.id) : undefined;
  const key = investigationKey(run);

  useEffect(() => {
    if (walkthrough.challengeOpen && original.current && original.current.key !== key) {
      walkthrough.closeWalkthrough();
      setInterrupted(true);
    }
  }, [key, walkthrough.challengeOpen, walkthrough.closeWalkthrough]);

  const dismissInvitation = () => setPreference(saveChallengeTourPreference({ dismissed: true }));
  const start = (page?: string) => {
    setInterrupted(false);
    const next = page ? getChallengeTourPreference() : saveChallengeTourPreference({ dismissed: true });
    setPreference(next);
    original.current = { key, scroll: window.scrollY, path: window.location.pathname };
    walkthrough.startChallengeTour({
      pageOnly: Boolean(page),
      steps: page ? challengeTourSteps.filter(step => step.page === page) : challengeTourSteps,
      sections: page ? [{ id: page, label: page === 'overview' ? 'Overview' : page === 'handover' ? 'Handover' : page }] : challengeTourSections,
      resumeId: page ? null : next.resumeId, welcome: challengeTourWelcome, finish: challengeTourFinish,
      onProgress: resumeId => { if (!page) setPreference(saveChallengeTourPreference({ resumeId })); },
      onClose: () => {
        const saved = original.current;
        original.current = null;
        requestAnimationFrame(() => {
          if (saved?.path === window.location.pathname) window.scrollTo({ top: saved.scroll, behavior: 'instant' });
        });
      },
    });
  };

  const displayRun: ChallengeRun = step ? {
    ...run, workspace: step.workspace ?? run.workspace,
    inspection: { ...run.inspection, comparison: 'both', data: 'orders', order: '' },
  } : run;
  return { open: walkthrough.challengeOpen, step, displayRun, start, dismissInvitation, interrupted, showInvitation: !preference.dismissed };
}
