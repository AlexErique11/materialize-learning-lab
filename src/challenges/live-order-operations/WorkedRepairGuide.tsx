import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { Spotlight } from '../../components/ui/Spotlight';
import { useWalkthroughInteractionLock } from '../../components/walkthrough/useWalkthroughInteractionLock';
import type { WorkedRepairStep } from './workedRepairSteps';

export function WorkedRepairGuide({ steps, pageRef, onClose }: {
  steps: readonly WorkedRepairStep[];
  pageRef: RefObject<HTMLElement | null>;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const step = steps[index]!;
  const finalStep = index === steps.length - 1;

  useLayoutEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    const match = page.querySelector<HTMLElement>(`[data-repair-target="${step.target}"]`);
    const feedback = match instanceof HTMLDetailsElement && !match.open ? match : null;
    if (feedback) feedback.open = true;
    setTarget(match?.getClientRects().length ? match : page.querySelector<HTMLElement>('[data-repair-target="repair-notice"]'));
    return () => { if (feedback) feedback.open = false; };
  }, [pageRef, step.target]);

  useWalkthroughInteractionLock(Boolean(target), onClose);
  targetRef.current = target;
  if (!target) return null;

  return <Spotlight
    open
    className="walkthrough-dialog incident-repair-guide"
    placement="keep-target-visible"
    targetRef={targetRef}
    step={index + 1}
    total={steps.length}
    title={step.title}
    description={step.description}
    phaseLabel="Worked repair"
    closeLabel="Close worked repair walkthrough"
    onClose={onClose}
    navigation={{
      backDisabled: index === 0,
      nextLabel: finalStep ? 'Finish' : 'Next',
      onBack: () => setIndex(index - 1),
      onNext: finalStep ? onClose : () => setIndex(index + 1),
    }}
    visual={step.comparisons?.length ? <dl className="incident-repair-comparisons">
      {step.comparisons.map(change => <div key={change.label}>
        <dt>{change.label}</dt>
        <dd><span>{change.before}</span><span aria-hidden="true">→</span><span className="sr-only">changed to</span><strong>{change.after}</strong></dd>
      </div>)}
    </dl> : null}
  />;
}
