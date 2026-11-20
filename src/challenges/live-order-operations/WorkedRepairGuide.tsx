import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { Spotlight } from '../../components/ui/Spotlight';
import { WalkthroughPageTransition, type PointerPosition } from '../../components/walkthrough/WalkthroughPageTransition';
import { useWalkthroughInteractionLock } from '../../components/walkthrough/useWalkthroughInteractionLock';
import type { ChallengeRun } from './run';
import type { RepairReplay } from './workedRepairReplay';
import type { WorkedRepairStep } from './workedRepairSteps';

type RepairPhase = 'before' | 'unblur' | 'navigate' | 'page' | 'result';
const phaseDuration = { unblur: 250, navigate: 700, page: 500 };

export function WorkedRepairGuide({ steps, replays, applied, displayed, onDisplay, pageRef, onClose }: {
  steps: readonly WorkedRepairStep[];
  replays: Record<string, RepairReplay>;
  applied: ChallengeRun;
  displayed: ChallengeRun;
  onDisplay: (run: ChallengeRun) => void;
  pageRef: RefObject<HTMLElement | null>;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const [reduceMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const origin = useRef<PointerPosition | undefined>(undefined);
  const step = steps[index]!;
  const finalStep = index === steps.length - 1;
  const replay = replays[step.target];
  const [phase, setPhase] = useState<RepairPhase>(() => !reduceMotion && replay?.actions.length ? 'before' : 'result');
  const [actionIndex, setActionIndex] = useState(0);
  const action = replay?.actions[actionIndex];
  const animating = phase === 'unblur' || phase === 'navigate' || phase === 'page';
  const result = replay && steps.slice(index + 1).some(item => replays[item.target]?.actions.length)
    ? replay.actions.at(-1)?.run ?? applied : applied;
  const shown = phase === 'result' ? result : phase === 'page' ? action?.run
    : replay?.actions[actionIndex - 1]?.run ?? replay?.before;

  useLayoutEffect(() => { onDisplay(shown ?? applied); }, [applied, onDisplay, shown]);

  const startAction = () => {
    const button = pageRef.current?.querySelector('[data-guide-action="forward"]');
    const rect = button?.getBoundingClientRect();
    origin.current = rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      : { x: innerWidth / 2, y: innerHeight / 2 };
    setPhase('unblur');
  };

  useEffect(() => {
    if (phase === 'before' || phase === 'result') return;
    const timer = window.setTimeout(() => {
      if (phase === 'unblur') setPhase('navigate');
      else if (phase === 'navigate') setPhase('page');
      else if (replay && actionIndex + 1 < replay.actions.length) {
        setActionIndex(actionIndex + 1);
        setPhase('navigate');
      } else setPhase('result');
    }, phaseDuration[phase]);
    return () => window.clearTimeout(timer);
  }, [actionIndex, phase, replay]);

  const goTo = (next: number, play: boolean) => {
    setActionIndex(0);
    setIndex(next);
    setPhase(play && !reduceMotion && replays[steps[next]!.target]?.actions.length ? 'before' : 'result');
  };

  useLayoutEffect(() => {
    if (animating) return;
    const page = pageRef.current;
    if (!page) return;
    const match = page.querySelector<HTMLElement>(`[data-repair-target="${step.target}"]`);
    const feedback = match instanceof HTMLDetailsElement && !match.open ? match : null;
    if (feedback) feedback.open = true;
    setTarget(match?.getClientRects().length ? match : page.querySelector<HTMLElement>('[data-repair-target="repair-notice"]'));
    return () => { if (feedback) feedback.open = false; };
  }, [animating, displayed, pageRef, step.target]);

  useWalkthroughInteractionLock(true, onClose);
  if (animating && action) return <WalkthroughPageTransition
    phase={phase}
    label={action.label}
    targetSelector={`[data-challenge-live] [data-repair-action="${action.target}"]`}
    origin={origin.current}
    onClose={onClose}
    closeLabel="Exit repair walkthrough"
  />;
  targetRef.current = target;
  if (!target) return null;

  return <Spotlight
    open
    className="walkthrough-dialog incident-repair-guide"
    placement="keep-target-visible"
    targetRef={targetRef}
    step={index + 1}
    total={steps.length}
    title={phase === 'before' ? `Before · ${step.title}` : step.title}
    description={phase === 'before' ? 'Select Show fix to watch the repair.' : step.description}
    phaseLabel="Worked repair"
    closeLabel="Close worked repair walkthrough"
    onClose={onClose}
    navigation={{
      backDisabled: index === 0,
      nextLabel: phase === 'before' ? 'Show fix' : finalStep ? 'Finish' : 'Next',
      onBack: () => goTo(index - 1, false),
      onNext: phase === 'before' ? startAction : finalStep ? onClose : () => goTo(index + 1, true),
    }}
    visual={step.comparisons?.length ? <dl className="incident-repair-comparisons">
      {step.comparisons.map(change => <div key={change.label} data-code={change.code || undefined}>
        <dt>{change.label}</dt>
        <dd><span>{change.before}</span>{phase === 'result' && <>
          <span aria-hidden="true">→</span><span className="sr-only">changed to</span><strong>{change.after}</strong>
        </>}</dd>
      </div>)}
    </dl> : null}
  />;
}
