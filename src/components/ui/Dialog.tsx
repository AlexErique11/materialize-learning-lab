import { useId, useLayoutEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';
import { useDialogMotion } from '../../motion/useDialogMotion';
import { useLabShortcuts } from '../../hooks/useLabShortcuts';

const dialogShortcuts = { Enter: '[data-dialog-primary]' };

function isOutsideDialog(dialog: HTMLDialogElement, x: number, y: number) {
  const bounds = dialog.getBoundingClientRect();
  return x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom;
}

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
  closeOnBackdrop?: boolean;
}

export function Dialog({ open, onClose, title, eyebrow, children, className = '', closeOnBackdrop = false }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const pointerStartedOutside = useRef(false);
  const titleId = useId();

  const requestClose = useDialogMotion(ref, open, onClose);
  useLabShortcuts(ref, dialogShortcuts, open);
  useLayoutEffect(() => {
    if (open) ref.current?.querySelector<HTMLButtonElement>('[data-dialog-primary]')?.focus({ preventScroll: true });
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={`dialog ${className}`}
      onPointerDown={(event) => {
        pointerStartedOutside.current = closeOnBackdrop && event.target === event.currentTarget
          && isOutsideDialog(event.currentTarget, event.clientX, event.clientY);
      }}
      onClick={(event) => {
        const startedOutside = pointerStartedOutside.current;
        pointerStartedOutside.current = false;
        if (closeOnBackdrop && startedOutside && event.target === event.currentTarget
          && isOutsideDialog(event.currentTarget, event.clientX, event.clientY)) requestClose();
      }}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
    >
      <div className="flex items-start justify-between gap-4 border-b border-border p-6">
        <div>
          {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
          <h2 id={titleId} className="text-xl font-semibold tracking-tight">
            {title}
          </h2>
        </div>
        <IconButton data-dialog-close label={`Close ${title}`} onClick={requestClose} autoFocus>
          <X size={18} />
        </IconButton>
      </div>
      <div className="p-6">{children}</div>
    </dialog>
  );
}
