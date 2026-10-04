import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Lightbulb, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface GuidedSpotlightProps {
  open: boolean;
  targetRef: RefObject<HTMLElement | null>;
  step: number;
  total: number;
  title: string;
  description: ReactNode;
  phaseLabel: string;
  visual: ReactNode;
  children: ReactNode;
  onClose: () => void;
}

interface SpotlightGeometry {
  top: number;
  left: number;
  width: number;
  height: number;
  cardTop: number;
  cardLeft: number;
  cardWidth: number;
}

export function GuidedSpotlight({ open, targetRef, step, total, title, description, phaseLabel, visual, children, onClose }: GuidedSpotlightProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [geometry, setGeometry] = useState<SpotlightGeometry | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    return () => { if (dialog.open) dialog.close(); };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const target = targetRef.current;
    const card = cardRef.current;
    if (!target || !card) return;
    // Prefer above/below; on short desktops use the space beside the clear panel.
    const measure = () => {
      let rect = target.getBoundingClientRect();
      const padding = 6;
      const gap = 14;
      const preferredWidth = Math.min(480, innerWidth - 24);
      card.style.width = `${preferredWidth}px`;
      let cardWidth = preferredWidth;
      let cardHeight = card.offsetHeight;
      let cardLeft = Math.max(12, Math.min(rect.right + padding - cardWidth, innerWidth - cardWidth - 12));
      let cardTop = rect.bottom + padding + gap;
      if (cardTop + cardHeight > innerHeight - 12) {
        const above = rect.top - padding - gap - cardHeight;
        if (above >= 12) cardTop = above;
        else {
          const workspace = target.closest('.relation-workspace')!.getBoundingClientRect();
          const leftSpace = rect.left - padding - gap - workspace.left;
          const rightSpace = workspace.right - rect.right - padding - gap;
          const sideSpace = Math.max(leftSpace, rightSpace);
          if (sideSpace >= 260) {
            cardWidth = Math.min(preferredWidth, sideSpace);
            card.style.width = `${cardWidth}px`;
            cardHeight = card.offsetHeight;
            cardLeft = leftSpace >= rightSpace ? rect.left - padding - gap - cardWidth : rect.right + padding + gap;
            cardTop = Math.max(12, Math.min(rect.top - padding, innerHeight - cardHeight - 12));
          } else {
            // On stacked phone layouts, make room above the target for the teaching card.
            const desiredTop = cardHeight + padding + gap + 12;
            if (desiredTop + rect.height + padding <= innerHeight - 8) {
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
      setGeometry({ top, left, width, height, cardTop, cardLeft, cardWidth });
    };
    target.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(target);
    observer.observe(card);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, targetRef, step, title, phaseLabel]);

  return (
    <dialog ref={dialogRef} className="relation-guide" aria-labelledby={titleId} aria-describedby={descriptionId}
      onCancel={(event) => { event.preventDefault(); onClose(); }}>
      {geometry && <>
        <div className="relation-guide-shade" style={{ top: 0, left: 0, width: '100%', height: geometry.top }} />
        <div className="relation-guide-shade" style={{ top: geometry.top, left: 0, width: geometry.left, height: geometry.height }} />
        <div className="relation-guide-shade" style={{ top: geometry.top, left: geometry.left + geometry.width, right: 0, height: geometry.height }} />
        <div className="relation-guide-shade" style={{ top: geometry.top + geometry.height, left: 0, width: '100%', bottom: 0 }} />
        <div className="relation-guide-hole" aria-hidden="true" style={{ top: geometry.top, left: geometry.left, width: geometry.width, height: geometry.height }} />
      </>}
      <div ref={cardRef} className="relation-guide-card" style={{ top: geometry?.cardTop ?? 12, left: geometry?.cardLeft ?? 12, width: geometry?.cardWidth }}>
        <div className="relation-guide-card-heading">
          <Lightbulb size={22} aria-hidden="true" />
          <h2 id={titleId}>{title}</h2>
          <Button variant="ghost" className="relation-guide-close" aria-label="Close guided run" onClick={onClose} autoFocus><X size={17} aria-hidden="true" /></Button>
        </div>
        <div className="relation-guide-phase">{phaseLabel}</div>
        <p id={descriptionId}>{description}</p>
        {open && visual}
        <div className="relation-guide-actions">
          <span className="relation-guide-step">{step} of {total}</span>
          {open && children}
        </div>
      </div>
    </dialog>
  );
}
