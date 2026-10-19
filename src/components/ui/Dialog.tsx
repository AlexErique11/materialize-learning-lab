import { useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';
import { useDialogMotion } from '../../motion/useDialogMotion';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
}

export function Dialog({ open, onClose, title, eyebrow, children, className = '' }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  const requestClose = useDialogMotion(ref, open, onClose);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={`dialog ${className}`}
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
        <IconButton label={`Close ${title}`} onClick={requestClose} autoFocus>
          <X size={18} />
        </IconButton>
      </div>
      <div className="p-6">{children}</div>
    </dialog>
  );
}
