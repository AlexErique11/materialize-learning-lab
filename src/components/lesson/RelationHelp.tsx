import { HelpCircle } from 'lucide-react';
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { animateMotion } from '../../motion/motion';

export function RelationHelp({ label, text, children, className = '', onActivate, showIcon = true }: {
  label: string; text: string; children?: ReactNode; className?: string; onActivate?: () => void; showIcon?: boolean;
}) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const openRef = useRef(open);
  openRef.current = open;
  const pointerOpenRef = useRef(false);
  const dismissedRef = useRef(false);
  const closeTimerRef = useRef<number | undefined>(undefined);
  const animationRef = useRef<Animation | null>(null);
  const hiddenTransformRef = useRef('translateY(-3px) scale(0.98)');
  const [position, setPosition] = useState({ left: 0, top: 0 });

  const cancelClose = () => window.clearTimeout(closeTimerRef.current);
  const leave = () => {
    cancelClose();
    closeTimerRef.current = window.setTimeout(() => {
      if (!triggerRef.current?.matches(':hover') && !tooltipRef.current?.matches(':hover')
        && (document.activeElement !== triggerRef.current || (onActivate && pointerOpenRef.current))) setOpen(false);
    }, 150);
  };
  useEffect(() => {
    const dismissInactive = () => {
      window.clearTimeout(closeTimerRef.current);
      dismissedRef.current = true;
      pointerOpenRef.current = false;
      openRef.current = false;
      animationRef.current?.cancel();
      animationRef.current = null;
      const tooltip = tooltipRef.current;
      if (tooltip?.matches(':popover-open')) tooltip.hidePopover();
      setOpen(false);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') dismissInactive();
    };
    window.addEventListener('blur', dismissInactive);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearTimeout(closeTimerRef.current);
      window.removeEventListener('blur', dismissInactive);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  useLayoutEffect(() => {
    const tooltip = tooltipRef.current;
    const trigger = triggerRef.current;
    if (!tooltip || !trigger) return;
    const wasOpen = tooltip.matches(':popover-open');
    const appearance = wasOpen ? getComputedStyle(tooltip) : null;
    const previous = appearance && { opacity: appearance.opacity, transform: appearance.transform };
    animationRef.current?.cancel();
    animationRef.current = null;
    if (!open) {
      if (wasOpen) {
        const animation = pointerOpenRef.current ? animateMotion(tooltip, 'tooltip', [
          previous!, { opacity: 0, transform: hiddenTransformRef.current },
        ], 100) : null;
        animationRef.current = animation;
        const finish = () => {
          if (animationRef.current === animation && !openRef.current && tooltip.matches(':popover-open')) tooltip.hidePopover();
        };
        if (animation) void animation.finished.then(finish, finish);
        else finish();
      }
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
      const below = bounds.bottom + height + 8 <= innerHeight - 12;
      tooltip.dataset.placement = below ? 'below' : 'above';
      const top = below ? bounds.bottom + 8 : Math.max(12, bounds.top - height - 8);
      tooltip.style.transformOrigin = `${Math.max(0, Math.min(width, bounds.left + bounds.width / 2 - left))}px ${below ? 'top' : 'bottom'}`;
      hiddenTransformRef.current = `translateY(${below ? -3 : 3}px) scale(0.98)`;
      setPosition({ left, top });
    };
    measure();
    if (pointerOpenRef.current) animationRef.current = animateMotion(tooltip, 'tooltip', [
      previous ?? { opacity: 0, transform: hiddenTransformRef.current },
      { opacity: 1, transform: 'translateY(0) scale(1)' },
    ], 160);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const dismiss = () => { cancelClose(); setOpen(false); };
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !triggerRef.current?.contains(event.target) && !tooltipRef.current?.contains(event.target)) dismiss();
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
    <span className={`relation-help ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        className={onActivate ? 'button button-ghost' : undefined}
        aria-label={onActivate ? label : `About ${label}`}
        aria-describedby={open ? id : undefined}
        aria-expanded={onActivate ? undefined : open}
        aria-haspopup={onActivate ? 'dialog' : undefined}
        onPointerEnter={(event) => {
          if (event.pointerType === 'mouse' && document.hasFocus() && !dismissedRef.current) { cancelClose(); pointerOpenRef.current = true; setOpen(true); }
        }}
        onPointerMove={event => {
          if (event.pointerType === 'mouse' && dismissedRef.current && document.hasFocus()
            && (event.movementX !== 0 || event.movementY !== 0) && !document.querySelector('dialog:modal')) {
            dismissedRef.current = false;
            cancelClose(); pointerOpenRef.current = true; setOpen(true);
          }
        }}
        onPointerLeave={event => {
          if (event.pointerType !== 'touch') {
            if (document.hasFocus() && !document.querySelector('dialog:modal')) dismissedRef.current = false;
            leave();
          }
        }}
        onClick={() => {
          cancelClose();
          if (onActivate) { dismissedRef.current = true; pointerOpenRef.current = false; }
          setOpen(!onActivate);
          onActivate?.();
        }}
        onFocus={() => {
          if (document.hasFocus() && !dismissedRef.current) { cancelClose(); pointerOpenRef.current = false; setOpen(true); }
        }}
        onBlur={() => {
          if (document.hasFocus() && !document.querySelector('dialog:modal')) dismissedRef.current = false;
          leave();
        }}
      >
        {showIcon && <HelpCircle size={14} aria-hidden="true" />}
        {children}
      </button>

      <span
        ref={tooltipRef}
        id={id}
        role="tooltip"
        popover="manual"
        className="relation-help-tooltip"
        style={position}
        onPointerEnter={() => { if (document.hasFocus() && !dismissedRef.current) { cancelClose(); setOpen(true); } }}
        onPointerLeave={event => { if (event.pointerType !== 'touch') leave(); }}
      >
        <b>{label}</b>
        {text}
      </span>
    </span>
  );
}
