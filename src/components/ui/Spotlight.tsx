import { useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Lightbulb, X } from 'lucide-react';
import { Button } from './Button';
import { useDialogMotion } from '../../motion/useDialogMotion';
import { animateMotion, reveal } from '../../motion/motion';
import { useLabShortcuts, type Shortcuts } from '../../hooks/useLabShortcuts';

const guideShortcuts = { ArrowLeft: '[data-guide-action="back"]', ArrowRight: '[data-guide-action="forward"]' };

interface SpotlightProps {
  open: boolean;
  targetRef: RefObject<HTMLElement | null>;
  step: number;
  total: number;
  title: string;
  description: ReactNode;
  phaseLabel: string;
  visual: ReactNode;
  children?: ReactNode;
  focusTargets?: readonly { id: string; label: string; ref: RefObject<HTMLElement | null>; revealWhenHidden?: boolean }[];
  focusIndex?: number;
  onFocusChange?: (index: number) => void;
  navigation?: { onBack: () => void; onNext: () => void; backDisabled: boolean; nextLabel: string };
  closeLabel?: string;
  placement?: 'auto' | 'above-first';
  className?: string;
  shortcuts?: Shortcuts;
  onClose: () => void;
}

interface SpotlightGeometry {
  cardTop: number;
  cardLeft: number;
  cardWidth: number;
  holes: readonly { top: number; left: number; width: number; height: number; id: string }[];
  grouped: boolean;
  shadePath: string;
}

export function Spotlight({ open, targetRef, step, total, title, description, phaseLabel, visual, children, focusTargets, focusIndex = 0, onFocusChange, navigation, closeLabel = 'Close guided run', placement = 'auto', className = '', shortcuts, onClose }: SpotlightProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useLabShortcuts(dialogRef, shortcuts ?? (navigation ? guideShortcuts : {}), open);
  const cardRef = useRef<HTMLDivElement>(null);
  const [geometry, setGeometry] = useState<SpotlightGeometry | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const sequential = Boolean(focusTargets && focusTargets.length > 1 && !geometry?.grouped);
  const requestClose = useDialogMotion(dialogRef, open, onClose, cardRef);
  const previousStep = useRef('');
  useLayoutEffect(() => {
    const key = `${step}:${title}:${phaseLabel}:${focusIndex}`;
    if (open && previousStep.current && previousStep.current !== key) {
      reveal(cardRef.current, 'guide-step');
      animateMotion(dialogRef.current?.querySelector('.relation-guide-hole') ?? null, 'guide-target', [{ opacity: 0.3 }, { opacity: 1 }]);
    }
    previousStep.current = open ? key : '';
  }, [open, step, title, phaseLabel, focusIndex]);

  const currentTarget = targetRef.current;
  useLayoutEffect(() => {
    if (!open) return;
    const target = targetRef.current;
    const card = cardRef.current;
    if (!target || !card) return;
    const revealWhenHidden = focusTargets?.find(item => item.ref.current === target)?.revealWhenHidden;
    const measure = () => {
      // Compact frames hide some summaries. Inspect the same element above the
      // page without inserting another row or changing its simulation state.
      if (revealWhenHidden) {
        target.classList.remove('relation-guide-detached-target');
        if (!target.getClientRects().length) target.classList.add('relation-guide-detached-target');
      }
      let rect = target.getBoundingClientRect();
      const padding = 6;
      const gap = 14;
      const preferredWidth = Math.min(480, innerWidth - 24);
      card.style.width = `${preferredWidth}px`;
      let cardWidth = preferredWidth;
      let cardHeight = card.offsetHeight;
      let cardLeft = Math.max(12, Math.min(rect.right + padding - cardWidth, innerWidth - cardWidth - 12));
      let cardTop = rect.bottom + padding + gap;
      const above = rect.top - padding - gap - cardHeight;
      if (placement === 'above-first' && above >= 12) cardTop = above;
      else if (cardTop + cardHeight > innerHeight - 12) {
        if (above >= 12) cardTop = above;
        else {
          const workspace = target.closest('.relation-workspace')?.getBoundingClientRect() ?? { left: 12, right: innerWidth - 12 };
          let leftSpace = rect.left - padding - gap - workspace.left;
          let rightSpace = workspace.right - rect.right - padding - gap;
          // A tall diagram can fill its workspace while the sidebar still leaves
          // enough screen space for an explanation without covering the target.
          if (Math.max(leftSpace, rightSpace) < 260) {
            leftSpace = rect.left - padding - gap - 12;
            rightSpace = innerWidth - 12 - rect.right - padding - gap;
          }
          const sideSpace = Math.max(leftSpace, rightSpace);
          if (sideSpace >= 260) {
            cardWidth = Math.min(preferredWidth, sideSpace);
            card.style.width = `${cardWidth}px`;
            cardHeight = card.offsetHeight;
            cardLeft = leftSpace >= rightSpace ? rect.left - padding - gap - cardWidth : rect.right + padding + gap;
            cardTop = Math.max(12, Math.min(rect.top - padding, innerHeight - cardHeight - 12));
          } else {
            // Make room above stacked targets, including sections taller than the viewport.
            const desiredTop = cardHeight + padding + gap + 12;
            if (desiredTop < innerHeight - 80) {
              window.scrollBy({ top: rect.top - desiredTop, behavior: 'instant' });
              rect = target.getBoundingClientRect();
              cardTop = Math.max(12, rect.top - padding - gap - cardHeight);
            } else cardTop = Math.max(12, Math.min(above, innerHeight - cardHeight - 12));
          }
        }
      }
      const top = Math.max(8, rect.top - padding);
      const left = Math.max(8, rect.left - padding);
      const width = Math.min(rect.width + padding * 2, innerWidth - left - 8);
      const height = Math.min(rect.height + padding * 2, innerHeight - top - 8);
      const primary = { top, left, width, height, id: focusTargets?.[focusIndex]?.id ?? 'primary' };
      let holes = [primary];
      let grouped = false;
      const related = focusTargets?.filter(item => item.ref.current !== target).map(item => ({
        id: item.id, rect: item.ref.current?.getBoundingClientRect(),
      })) ?? [];
      // Separate history views of the same panel need sequential inspection.
      const distinctTargets = !focusTargets || new Set(focusTargets.map(item => item.ref.current)).size === focusTargets.length;
      if (distinctTargets && innerWidth >= 1024 && related.length > 0 && related.length <= 2 && related.every(item => item.rect && item.rect.width > 0 && item.rect.height > 0
        && item.rect.top >= 12 && item.rect.bottom <= innerHeight - 12)) {
        const candidates = [primary, ...related.map(item => ({ id: item.id, top: item.rect!.top - padding, left: item.rect!.left - padding,
          width: item.rect!.width + padding * 2, height: item.rect!.height + padding * 2 }))];
        const positions = [{ top: cardTop, left: cardLeft }, ...candidates.flatMap(hole => [
          { top: hole.top - gap - cardHeight, left: Math.max(12, Math.min(hole.left, innerWidth - cardWidth - 12)) },
          { top: hole.top + hole.height + gap, left: Math.max(12, Math.min(hole.left, innerWidth - cardWidth - 12)) },
          { top: hole.top, left: hole.left - gap - cardWidth },
          { top: hole.top, left: hole.left + hole.width + gap },
        ])];
        const separate = candidates.every((hole, index) => candidates.slice(index + 1).every(other =>
          hole.left + hole.width <= other.left || other.left + other.width <= hole.left
          || hole.top + hole.height <= other.top || other.top + other.height <= hole.top));
        const position = separate && positions.find(point => point.top >= 12 && point.top + cardHeight <= innerHeight - 12 && point.left >= 12
          && point.left + cardWidth <= innerWidth - 12 && candidates.every(hole => point.left + cardWidth + 8 <= hole.left
            || point.left >= hole.left + hole.width + 8 || point.top + cardHeight + 8 <= hole.top || point.top >= hole.top + hole.height + 8));
        if (position) {
          holes = candidates;
          grouped = true;
          cardTop = position.top;
          cardLeft = position.left;
        }
      }
      // Separate openings keep unrelated panels dimmed, even when targets are far apart.
      const shadePath = `M0 0H${innerWidth}V${innerHeight}H0Z ` + holes.map(hole =>
        `M${hole.left} ${hole.top}h${hole.width}v${hole.height}h${-hole.width}Z`).join(' ');
      setGeometry({ cardTop, cardLeft, cardWidth, holes, grouped, shadePath });
    };
    target.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(target);
    observer.observe(card);
    for (const item of focusTargets ?? []) if (item.ref.current) observer.observe(item.ref.current);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      target.classList.remove('relation-guide-detached-target');
      observer.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, targetRef, currentTarget, step, title, phaseLabel, placement, focusTargets, focusIndex]);

  return (
    <dialog ref={dialogRef} className={`relation-guide ${className}`} aria-labelledby={titleId} aria-describedby={descriptionId}
      data-inspection-mode={sequential ? 'sequential' : 'grouped'} data-focus-index={focusIndex} data-focus-count={focusTargets?.length ?? 1}
      onCancel={(event) => { event.preventDefault(); requestClose(); }}>
      {geometry && <>
        <div className="relation-guide-shade" style={{ inset: 0, clipPath: `path(evenodd, "${geometry.shadePath}")` }} />
        {geometry.holes.map(hole => <div key={hole.id} className="relation-guide-hole" data-focus={hole.id} aria-hidden="true"
          style={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height }} />)}
      </>}
      <div ref={cardRef} className="relation-guide-card" style={{ top: geometry?.cardTop ?? 12, left: geometry?.cardLeft ?? 12, width: geometry?.cardWidth }}>
        <div className="relation-guide-card-heading">
          <Lightbulb size={22} aria-hidden="true" />
          <h2 id={titleId}>{title}</h2>
          <Button variant="ghost" className="relation-guide-close" aria-label={closeLabel} onClick={requestClose} autoFocus><X size={17} aria-hidden="true" /></Button>
        </div>
        <div className="relation-guide-phase">{phaseLabel}</div>
        <p id={descriptionId}>{description}</p>
        {open && visual}
        {open && focusTargets && focusTargets.length > 1 && <nav className="relation-guide-focus" aria-label="Inspect related changes">
          {focusTargets.map((item, index) => <Button key={item.id} size="compact" variant="ghost" aria-pressed={focusIndex === index}
            onClick={() => onFocusChange?.(index)}>{item.label}</Button>)}
          {sequential && <span aria-live="polite">Inspect {focusIndex + 1} of {focusTargets.length}</span>}
        </nav>}
        <div className="relation-guide-actions">
          <span className="relation-guide-step">{step} of {total}</span>
          {open && (navigation ? <>
            <Button data-guide-action="back" aria-keyshortcuts="ArrowLeft" disabled={navigation.backDisabled && (!sequential || focusIndex === 0)} onClick={() => {
              if (sequential && focusIndex > 0) onFocusChange?.(focusIndex - 1);
              else navigation.onBack();
            }}>Back</Button>
            <Button data-guide-action="forward" aria-keyshortcuts="ArrowRight" variant="primary" onClick={() => {
              if (sequential && focusIndex < (focusTargets?.length ?? 1) - 1) onFocusChange?.(focusIndex + 1);
              else navigation.onNext();
            }}>{sequential && focusIndex < (focusTargets?.length ?? 1) - 1 ? 'Next' : navigation.nextLabel}</Button>
          </> : children)}
        </div>
      </div>
    </dialog>
  );
}
