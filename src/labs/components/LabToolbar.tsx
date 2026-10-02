import { useId } from 'react';
import { BookOpen, Play, RotateCcw, Route } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ProgressBar } from '../../components/ui/ProgressBar';

interface LabToolbarProps {
  completed?: number;
  total?: number;
  onOpenReference: () => void;
  onReset?: () => void;
  onRun?: () => void;
  onStartGuidedRun?: () => void;
}

export function LabToolbar({
  completed = 0,
  total = 0,
  onOpenReference,
  onReset,
  onRun,
  onStartGuidedRun,
}: LabToolbarProps) {
  const hintId = useId();
  const hasScenarioControls = Boolean(onReset || onRun || onStartGuidedRun);
  return (
    <div className="lab-toolbar">
      <div className="lab-toolbar-row">
        <div className="lab-progress">
          <p className="mb-2 text-xs text-text-muted">
            Progress{' '}
            <span className="font-medium text-text">
              {completed} / {total}
            </span>
          </p>
          <ProgressBar
            value={completed}
            total={total}
            label={total > 0 ? 'Lab checkpoints completed' : 'No lab checkpoints available yet'}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="compact" onClick={onOpenReference}>
            <BookOpen size={15} aria-hidden="true" />
            SQL & Objectives
          </Button>
          <Button
            size="compact"
            onClick={onReset}
            disabled={!onReset}
            aria-describedby={!hasScenarioControls ? hintId : undefined}
          >
            <RotateCcw size={14} aria-hidden="true" />
            Reset
          </Button>
          <Button
            size="compact"
            onClick={onRun}
            disabled={!onRun}
            aria-describedby={!hasScenarioControls ? hintId : undefined}
          >
            <Play size={14} aria-hidden="true" />
            Run
          </Button>
          <Button
            size="compact"
            variant="primary"
            onClick={onStartGuidedRun}
            disabled={!onStartGuidedRun}
            aria-describedby={!hasScenarioControls ? hintId : undefined}
          >
            <Route size={15} aria-hidden="true" />
            Start guided run
          </Button>
        </div>
      </div>
      {!hasScenarioControls && (
        <p id={hintId} className="mt-3 text-xs text-text-muted">
          Run controls become available when a scenario is added. No checkpoints yet.
        </p>
      )}
    </div>
  );
}
