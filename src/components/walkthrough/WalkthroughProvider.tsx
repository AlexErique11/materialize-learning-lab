import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { Spotlight } from '../ui/Spotlight';
import { focusLabContext, isShortcutInteraction } from '../ui/keyboardFocus';
import { chapterTourSteps, chapterTourWelcome, getLectureWalkthrough, type WalkthroughStep } from './walkthroughContent';
import { rememberChapterTour } from './walkthroughStorage';
import { useWalkthroughInteractionLock } from './useWalkthroughInteractionLock';
import { WalkthroughPageTransition, type PointerPosition } from './WalkthroughPageTransition';

const walkthroughShortcuts = {
  ArrowLeft: '[data-walkthrough-action="back"]',
  ArrowRight: '[data-walkthrough-action="forward"]',
  Enter: '[data-walkthrough-action="forward"]',
};

export interface ChallengeWalkthroughOptions {
  pageOnly?: boolean;
  steps: readonly WalkthroughStep[];
  sections: readonly { id: string; label: string }[];
  resumeId: string | null;
  welcome: { title: string; description: string };
  finish: { title: string; description: string };
  onProgress: (id: string | null) => void;
  onClose: () => void;
}
interface WalkthroughSession {
  kind: 'chapter' | 'lecture' | 'challenge';
  steps: readonly WalkthroughStep[];
  index: number;
  phase: 'welcome' | 'unblur' | 'navigate' | 'page' | 'steps' | 'finish';
  transitionFrom?: WalkthroughStep;
  pointerOrigin?: PointerPosition;
  challenge?: ChallengeWalkthroughOptions;
  originKey?: string;
}
const WalkthroughContext = createContext({
  open: false, lectureHelpAvailable: false, startLectureHelp: () => {}, startChapterTour: (_replace = false) => {},
  challengeOpen: false, challengeStep: undefined as WalkthroughStep | undefined,
  startChallengeTour: (_options: ChallengeWalkthroughOptions) => {}, closeWalkthrough: () => {},
});
export const useWalkthrough = () => useContext(WalkthroughContext);

function findTarget(step: WalkthroughStep): HTMLElement | null {
  if (!step.target) return null;
  return [...document.querySelectorAll<HTMLElement>(`[data-walkthrough="${step.target}"]`)].find((target) => target.getClientRects().length > 0 && getComputedStyle(target).visibility !== 'hidden') ?? null;
}

function pointerOrigin(): PointerPosition | undefined {
  const rect = document.querySelector('[data-walkthrough-action="forward"]')?.getBoundingClientRect();
  return rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : undefined;
}

export function WalkthroughProvider({ children }: { children: ReactNode }) {
  const { pathname, key: locationKey } = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState<WalkthroughSession | null>(null);
  const sessionRef = useRef(session); sessionRef.current = session;
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const pendingRoute = useRef<string | null>(null);
  const step = session?.phase === 'finish' ? undefined : session?.steps[session.index];
  const welcoming = session?.phase === 'welcome';
  const previewingPage = session?.phase === 'page' || session?.phase === 'unblur' || session?.phase === 'navigate';
  const displayedStep = session?.phase === 'unblur' || session?.phase === 'navigate' ? session.transitionFrom : step;
  const lectureSteps = getLectureWalkthrough(pathname);

  const close = useCallback(() => {
    const current = sessionRef.current;
    pendingRoute.current = null;
    setSession(null);
    current?.challenge?.onClose();
    requestAnimationFrame(() => {
      if (triggerRef.current?.isConnected && !isShortcutInteraction(triggerRef.current)) triggerRef.current.focus({ preventScroll: true });
      else focusLabContext();
    });
  }, []);
  useWalkthroughInteractionLock(session !== null, close);
  const startChapterTour = useCallback((replace = false) => {
    rememberChapterTour();
    triggerRef.current = document.activeElement as HTMLElement;
    setSession({ kind: 'chapter', steps: chapterTourSteps, index: 0, phase: 'welcome' });
    pendingRoute.current = chapterTourSteps[0]!.path;
    navigate(chapterTourSteps[0]!.path, { replace });
  }, [navigate]);
  const startLectureHelp = () => {
    if (!lectureSteps) return;
    const steps = lectureSteps.filter((item) => findTarget(item));
    if (!steps.length) return;
    triggerRef.current = document.activeElement as HTMLElement;
    setSession({ kind: 'lecture', steps, index: 0, phase: 'steps' });
  };
  const startChallengeTour = (options: ChallengeWalkthroughOptions) => {
    if (!options.steps.length) return;
    triggerRef.current = document.activeElement as HTMLElement;
    setSession({ kind: 'challenge', steps: options.steps, index: 0, phase: options.pageOnly ? 'steps' : 'welcome', challenge: options, originKey: locationKey });
  };
  const beginChallenge = (steps: readonly WalkthroughStep[], index = 0) => {
    if (!session?.challenge || !steps.length) return;
    session.challenge.onProgress(steps[index]?.id ?? null);
    const changingPage = steps[index]?.page !== step?.page;
    setSession({ ...session, steps, index, phase: welcoming ? 'page' : changingPage ? 'unblur' : 'steps',
      transitionFrom: changingPage && !welcoming ? step : undefined, pointerOrigin: changingPage && !welcoming ? pointerOrigin() : undefined });
  };
  const move = (index: number) => {
    if (!session) return;
    const next = session.steps[index];
    if (!next) {
      if (session.challenge && !session.challenge.pageOnly) {
        session.challenge.onProgress(null);
        setSession({ ...session, phase: 'finish' });
      } else close();
      return;
    }
    session.challenge?.onProgress(next.id ?? null);
    const changingPage = Boolean(session.challenge && next.page !== step?.page);
    setSession({ ...session, index, phase: changingPage ? 'unblur' : 'steps',
      transitionFrom: changingPage ? step : undefined, pointerOrigin: changingPage ? pointerOrigin() : undefined });
    if (pathname !== next.path) {
      pendingRoute.current = next.path;
      navigate(next.path);
    }
  };

  useEffect(() => {
    // React Router may commit the new page after the session update. Wait for tour navigation.
    if (pendingRoute.current) {
      if (pathname !== pendingRoute.current) return;
      pendingRoute.current = null;
    }
    // Browser navigation leaves the tour rather than taking the learner back to its route.
    if (session && (pathname !== (step?.path ?? session.steps[0]?.path)
      || (session.kind === 'challenge' && session.originKey !== locationKey))) close();
  }, [pathname, locationKey, step, session, close]);
  useEffect(() => {
    if (!previewingPage) return;
    const phase = session?.phase;
    const timer = window.setTimeout(() => setSession(current => current?.phase === phase ? {
      ...current, phase: phase === 'unblur' ? 'navigate' : phase === 'navigate' ? 'page' : 'steps',
    } : current), 700);
    return () => window.clearTimeout(timer);
  }, [previewingPage, session?.phase, step]);
  useLayoutEffect(() => {
    if (welcoming || previewingPage || !step || pathname !== step.path) { setTarget(null); return; }
    const resolve = () => setTarget(findTarget(step));
    resolve();
    const observer = session?.kind === 'challenge' ? new MutationObserver(resolve) : null;
    observer?.observe(document.querySelector('main') ?? document.body, { childList: true, subtree: true });
    window.addEventListener('resize', resolve);
    return () => { observer?.disconnect(); window.removeEventListener('resize', resolve); };
  }, [pathname, step, welcoming, previewingPage, session?.kind]);
  useEffect(() => {
    if (session?.kind !== 'challenge') return;
    const frame = requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('.walkthrough-dialog[open] [data-walkthrough-action="forward"]')?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [session?.kind, session?.phase, step]);
  targetRef.current = target;
  const ready = Boolean(!welcoming && !previewingPage && step && pathname === step.path && target);
  const description = step && target?.matches(':disabled') && step.unavailable
    ? step.description + ' ' + step.unavailable : step?.description;
  const challengeOptions = session?.challenge;
  const sectionLabel = challengeOptions?.sections.find(section => section.id === step?.section)?.label;
  const phaseLabel = challengeOptions?.pageOnly ? `${challengeOptions.sections[0]?.label ?? 'Page'} help`
    : challengeOptions ? `Challenge walkthrough · ${sectionLabel ?? 'Overview'}`
    : session?.kind === 'chapter' ? 'Chapter 1 tour' : 'Lecture controls';
  const sectionPicker = challengeOptions && !challengeOptions.pageOnly && <label className="walkthrough-section-picker">Jump to section
    <select aria-label="Walkthrough section" value={step?.section ?? 'overview'} onChange={event => {
      const index = challengeOptions.steps.findIndex(item => item.section === event.target.value);
      if (index >= 0) beginChallenge(challengeOptions.steps, index);
    }}>{challengeOptions.sections.map(section => <option key={section.id} value={section.id}>{section.label}</option>)}</select>
  </label>;
  const supportingContent = <>
    {step?.detail && <details className="walkthrough-detail" key={step.id}><summary>More detail</summary><p>{step.detail}</p></details>}
    {sectionPicker}
    {challengeOptions && <span className="sr-only" role="status">{phaseLabel}. Step {(session?.index ?? 0) + 1} of {session?.steps.length}. {step?.title}</span>}
  </>;

  const actions = session && <>
    {session.kind !== 'lecture' && <Button variant="ghost" onClick={close}>Exit tour</Button>}
    <Button data-walkthrough-action="back" aria-keyshortcuts="ArrowLeft" disabled={session.index === 0} onClick={() => move(session.index - 1)}>Back</Button>
    <Button data-walkthrough-action="forward" aria-keyshortcuts="ArrowRight Enter" variant="primary" onClick={() => move(session.index + 1)}>{session.index === session.steps.length - 1 ? challengeOptions ? 'Finish walkthrough' : 'Finish' : 'Next'}</Button>
  </>;

  return <WalkthroughContext value={{ open: session !== null, lectureHelpAvailable: lectureSteps !== null, startChapterTour, startLectureHelp,
    startChallengeTour, closeWalkthrough: close, challengeOpen: session?.kind === 'challenge', challengeStep: session?.kind === 'challenge' && (session.phase === 'steps' || previewingPage) ? displayedStep : undefined }}>
    {children}
    {welcoming && session && pathname === step?.path && <Dialog open onClose={close} shortcuts={walkthroughShortcuts} className="walkthrough-dialog" title={(challengeOptions?.welcome ?? chapterTourWelcome).title} eyebrow={challengeOptions ? 'Challenge walkthrough' : 'Chapter walkthrough'}>
      <p className="text-sm leading-relaxed text-text-muted">{(challengeOptions?.welcome ?? chapterTourWelcome).description}</p>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="ghost" onClick={close}>Exit</Button>
        {challengeOptions?.resumeId && <Button onClick={() => beginChallenge(challengeOptions.steps, Math.max(0, challengeOptions.steps.findIndex(item => item.id === challengeOptions.resumeId)))}>Resume walkthrough</Button>}
        <Button data-walkthrough-action="forward" aria-keyshortcuts="ArrowRight Enter" variant="primary" onClick={() => challengeOptions ? beginChallenge(challengeOptions.steps) : setSession({ ...session, phase: 'steps' })}>{challengeOptions?.resumeId ? 'Start again' : 'Start walkthrough'}</Button>
      </div>
    </Dialog>}
    {previewingPage && step && session && <WalkthroughPageTransition phase={session.phase as 'unblur' | 'navigate' | 'page'}
      label={displayedStep?.page === 'overview' ? 'Challenge overview' : displayedStep?.page === 'handover' ? 'Handover' : `${displayedStep?.page} workspace`}
      navigationTarget={step.navigationTarget} fallbackTarget={step.navigationFallbackTarget} origin={session.pointerOrigin} onClose={close} />}
    {session?.phase === 'finish' && challengeOptions && <Dialog open onClose={close} shortcuts={walkthroughShortcuts} title={challengeOptions.finish.title} eyebrow="Challenge walkthrough" className="walkthrough-dialog">
      <p>{challengeOptions.finish.description}</p>
      <div className="mt-6 flex justify-end"><Button data-walkthrough-action="forward" variant="primary" onClick={close}>Return to challenge</Button></div>
    </Dialog>}
    {!welcoming && !previewingPage && session && step && (!step.target || (challengeOptions && !target)) && pathname === step.path && <Dialog open onClose={close} shortcuts={walkthroughShortcuts} title={step.title} eyebrow={phaseLabel} className={`walkthrough-dialog ${challengeOptions ? '' : '[&_h2]:text-4xl'}`}>
      <p className="text-sm leading-relaxed text-text-muted">{step.description}</p>
      {supportingContent}
      <div className="mt-6 flex flex-wrap justify-end gap-3">{actions}</div>
    </Dialog>}
    {ready && session && step && <Spotlight open className={`walkthrough-dialog${challengeOptions ? ' challenge-walkthrough-focus' : ''}`} shortcuts={walkthroughShortcuts} targetRef={targetRef} step={session.index + 1} total={session.steps.length}
      title={step.title} description={description} phaseLabel={phaseLabel}
      visual={supportingContent} closeLabel="Close walkthrough" onClose={close}>
      {actions}
    </Spotlight>}
  </WalkthroughContext>;
}
