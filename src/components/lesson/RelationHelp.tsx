import { HelpCircle } from 'lucide-react';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

export function RelationHelp({ label, text }: { label: string; text: string }) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });

  useLayoutEffect(() => {
    const tooltip = tooltipRef.current;
    const trigger = triggerRef.current;
    if (!tooltip || !trigger) return;
    if (!open) {
      if (tooltip.matches(':popover-open')) tooltip.hidePopover();
      return;
    }
    // The native top layer keeps help visible outside the table's overflow container.
    tooltip.showPopover();
    const measure = () => {
      const bounds = trigger.getBoundingClientRect();
      const width = tooltip.offsetWidth;
      const height = tooltip.offsetHeight;
      const left = Math.max(
        12,
        Math.min(bounds.left + bounds.width / 2 - width / 2, innerWidth - width - 12)
      );
      const top =
        bounds.bottom + height + 8 <= innerHeight - 12
          ? bounds.bottom + 8
          : Math.max(12, bounds.top - height - 8);
      setPosition({ left, top });
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      tooltip.hidePopover();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const dismiss = () => setOpen(false);
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !triggerRef.current?.contains(event.target)) dismiss();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        dismiss();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <span className="relation-help">
      <button
        ref={triggerRef}
        type="button"
        aria-label={`About ${label}`}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onPointerEnter={(event) => {
          if (event.pointerType === 'mouse') setOpen(true);
        }}
        onPointerLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        <HelpCircle size={14} aria-hidden="true" />
      </button>

      <span
        ref={tooltipRef}
        id={id}
        role="tooltip"
        popover="manual"
        className="relation-help-tooltip"
        style={position}
      >
        <b>{label}</b>
        {text}
      </span>
    </span>
  );
}
