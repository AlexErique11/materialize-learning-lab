import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';

interface GuidedRunOverlayProps {
  open: boolean;
  onClose: () => void;
  step: number;
  total: number;
  title: string;
  description: ReactNode;
  attentionText?: ReactNode;
  continueLabel?: string;
  onContinue: () => void;
}

// Presentation only. The future chapter owns checkpoint selection and advancement.
export function GuidedRunOverlay({
  open,
  onClose,
  step,
  total,
  title,
  description,
  attentionText,
  continueLabel = 'Continue',
  onContinue,
}: GuidedRunOverlayProps) {
  return (
    <Dialog open={open} onClose={onClose} title={title} eyebrow={`Checkpoint ${step} of ${total}`}>
      <div className="text-sm leading-relaxed text-text-muted">{description}</div>
      {attentionText && (
        <div className="mt-5 rounded-md border border-border bg-surface-muted p-4">
          <p className="eyebrow mb-2">Pay attention to</p>
          <div className="text-sm">{attentionText}</div>
        </div>
      )}
      <div className="mt-6 flex justify-end">
        <Button variant="primary" onClick={onContinue}>
          {continueLabel}
          <ArrowRight size={16} aria-hidden="true" />
        </Button>
      </div>
    </Dialog>
  );
}
