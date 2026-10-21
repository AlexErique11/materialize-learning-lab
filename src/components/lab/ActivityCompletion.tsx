import { CheckCircle2 } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import '../../styles/activity-completion.css';

const confetti = [
  [-28, -25, -70], [-23, -43, 55], [-13, -54, -115], [0, -59, 80],
  [14, -53, -65], [27, -40, 120], [34, -22, -90], [22, -12, 65],
  [8, -33, 140], [-8, -39, -80], [-20, -14, 95], [30, -31, -130],
];

/** Celebrate finishing this run, rather than mounting an already-completed activity. */
export function ActivityCompletion({ complete, kind, className = '' }: {
  complete: boolean; kind: 'tutorial' | 'exercise'; className?: string;
}) {
  const previous = useRef(complete);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const finishedNow = complete && !previous.current;
    previous.current = complete;
    if (!complete) setVisible(false);
    if (!finishedNow) return;
    setVisible(true);
    const timeout = window.setTimeout(() => setVisible(false), 3000);
    return () => window.clearTimeout(timeout);
  }, [complete]);

  if (!visible) return null;
  return <span className={`relation-tutorial-complete activity-completion ${className}`} role="status">
    <CheckCircle2 size={14} aria-hidden="true" />
    {kind === 'tutorial' ? 'Tutorial completed' : 'Exercise completed'}
    <span className="activity-completion-confetti" aria-hidden="true">
      {confetti.map(([x, y, rotation], index) => <i key={index} style={{
        '--confetti-x': `${x}px`, '--confetti-y': `${y}px`, '--confetti-rotation': `${rotation}deg`,
      } as CSSProperties} />)}
    </span>
  </span>;
}
