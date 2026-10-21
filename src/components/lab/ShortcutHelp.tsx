import { Keyboard, X } from 'lucide-react';
import { useId, useLayoutEffect, useRef, useState } from 'react';
import { animateMotion } from '../../motion/motion';
import { ShortcutKeys } from '../ui/ShortcutKeys';

function ShortcutRow({ label, keys }: { label: string; keys: string }) {
  return <div className="shortcut-row"><dt>{label}</dt><dd><ShortcutKeys shortcuts={keys} /></dd></div>;
}

function positionPanel(panel: HTMLElement, trigger: HTMLElement) {
  const bounds = trigger.getBoundingClientRect();
  panel.style.left = `${Math.max(12, Math.min(bounds.right - panel.offsetWidth, innerWidth - panel.offsetWidth - 12))}px`;
  panel.style.top = `${Math.max(12, Math.min(bounds.bottom + 8, innerHeight - panel.offsetHeight - 12))}px`;
}

export function ShortcutHelp({ lecture, showReference, onOpenChange }: {
  lecture: boolean; showReference: boolean; onOpenChange: (open: boolean) => void;
}) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useLayoutEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const trigger = triggerRef.current;
    if (!panel || !trigger) return;
    const position = () => positionPanel(panel, trigger);
    position();
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    return () => {
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
    };
  }, [open]);

  return <>
    <button ref={triggerRef} className="shortcut-help-trigger" type="button" popoverTarget={id}
      aria-label="Keyboard shortcuts" aria-haspopup="dialog" aria-expanded={open} aria-controls={id}
      onClick={event => {
        event.preventDefault();
        const panel = panelRef.current;
        if (!panel || !panel.togglePopover()) return;
        // Native toggle events arrive after a paint; position in the opening action.
        positionPanel(panel, event.currentTarget);
        animateMotion(panel, 'shortcut-help', [
          { opacity: 0, transform: 'translateY(-3px) scale(0.98)' },
          { opacity: 1, transform: 'translateY(0) scale(1)' },
        ], 160);
      }}>
      <Keyboard size={16} aria-hidden="true" />
      <span>Shortcuts</span>
    </button>
    <div ref={panelRef} id={id} className="shortcut-help-panel" role="dialog" aria-labelledby={`${id}-title`}
      popover="auto" onToggle={event => {
        const next = event.newState === 'open';
        setOpen(next);
        onOpenChange(next);
      }}>
      <div className="shortcut-help-heading">
        <h2 id={`${id}-title`}>Keyboard shortcuts</h2>
        <button type="button" aria-label="Close keyboard shortcuts" popoverTarget={id} popoverTargetAction="hide" autoFocus>
          <X size={16} aria-hidden="true" />
        </button>
      </div>
      <section>
        <h3>{lecture ? 'Lecture' : 'Exercise'}</h3>
        <dl>
          {lecture ? <>
            <ShortcutRow label="Start guided run" keys="Enter" />
            <ShortcutRow label="Run / pause playback" keys="Space" />
            <ShortcutRow label="Previous / next playback step" keys="ArrowLeft ArrowRight" />
          </> : <>
            <ShortcutRow label="Check answer" keys="Enter" />
            <ShortcutRow label="Next question / finish exercise*" keys="Enter ArrowRight" />
            <ShortcutRow label="Show / hide hint" keys="H" />
            <ShortcutRow label="Show answer" keys="Control+Enter" />
          </>}
          {showReference && <ShortcutRow label="Open / close SQL & Objectives" keys="S" />}
          <ShortcutRow label="Reset" keys="R" />
        </dl>
        {!lecture && <p className="shortcut-help-note">*After the answer is accepted. The final button may open the next exercise or complete the chapter.</p>}
      </section>
      <section>
        <h3>{lecture ? 'During a guided run' : 'Chapter complete'}</h3>
        <dl>
          {lecture ? <ShortcutRow label="Back / next step or effect" keys="ArrowLeft ArrowRight" />
            : <ShortcutRow label="Go to the next chapter" keys="Enter" />}
          <ShortcutRow label={lecture ? 'Close guided run' : 'Close completion window'} keys="Escape" />
        </dl>
      </section>
      <p className="shortcut-help-note">Esc closes this reference{showReference ? ' or SQL & Objectives' : ''}. Letter shortcuts pause while you type. A focused button keeps its usual Enter and Space actions.</p>
    </div>
  </>;
}
