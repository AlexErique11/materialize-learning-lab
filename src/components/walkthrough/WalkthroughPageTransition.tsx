import { useLayoutEffect, useRef, useState } from 'react';
import { MousePointer2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { useDialogMotion } from '../../motion/useDialogMotion';

export type PageTransitionPhase = 'unblur' | 'navigate' | 'page';
export interface PointerPosition { x: number; y: number }

export function WalkthroughPageTransition({ phase, label, navigationTarget, fallbackTarget, targetSelector, origin, closeLabel = 'Exit tour', onClose }: {
  phase: PageTransitionPhase; label: string; navigationTarget?: string; fallbackTarget?: string;
  targetSelector?: string; origin?: PointerPosition; closeLabel?: string; onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [position, setPosition] = useState(origin ?? { x: 0, y: 0 });
  const [hasTarget, setHasTarget] = useState(false);
  useDialogMotion(ref, true, onClose);
  useLayoutEffect(() => {
    if (phase === 'unblur') return;
    const find = (id?: string) => id ? [...document.querySelectorAll<HTMLElement>(`[data-walkthrough="${id}"]`)]
      .find(element => element.getClientRects().length > 0) : undefined;
    const target = targetSelector ? document.querySelector<HTMLElement>(targetSelector) : find(navigationTarget) ?? find(fallbackTarget);
    setHasTarget(Boolean(target && origin));
    if (!origin) { window.scrollTo({ top: 0, behavior: 'instant' }); return; }
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const documentY = rect.top + window.scrollY + rect.height / 2;
    const scrollTop = Math.max(0, Math.min(documentY - innerHeight * 0.45, document.documentElement.scrollHeight - innerHeight));
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: scrollTop, behavior: phase === 'navigate' && !reduce ? 'smooth' : 'instant' });
    const frame = requestAnimationFrame(() => setPosition({ x: rect.left + rect.width / 2, y: documentY - scrollTop }));
    return () => cancelAnimationFrame(frame);
  }, [phase, navigationTarget, fallbackTarget, targetSelector, origin]);
  return <dialog ref={ref} className="relation-guide walkthrough-dialog walkthrough-page-preview" data-transition-phase={phase}
    aria-label={`${label} page preview`} onCancel={event => { event.preventDefault(); onClose(); }}>
    {origin && <MousePointer2 aria-hidden="true" className="walkthrough-navigation-cursor" fill="white" size={25}
      style={{ transform: `translate(${position.x}px, ${position.y}px)`, opacity: phase !== 'unblur' && hasTarget ? 1 : 0, transition: phase === 'page' ? 'none' : undefined }} />}
    {origin && hasTarget && phase === 'page' && <span aria-hidden="true" className="walkthrough-navigation-click"
      style={{ left: position.x, top: position.y }} />}
    <div className="walkthrough-page-context"><span role="status">{label}</span><Button variant="ghost" onClick={onClose} autoFocus>{closeLabel}</Button></div>
  </dialog>;
}
