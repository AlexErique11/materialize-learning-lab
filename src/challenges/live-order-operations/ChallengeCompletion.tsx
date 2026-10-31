import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft, Trophy } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import './completion.css';

const sparks = Array.from({ length: 12 }, (_, index) => {
  const angle = index * Math.PI / 6;
  return { '--spark-x': `${Math.cos(angle) * 76}px`, '--spark-y': `${Math.sin(angle) * 76}px`, '--spark-angle': `${index * 30 + 90}deg` } as CSSProperties;
});

export function ChallengeCompletion({ complete }: { complete: boolean }) {
  const previous = useRef(complete);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (complete && !previous.current) setOpen(true);
    if (!complete) setOpen(false);
    previous.current = complete;
  }, [complete]);

  return <Dialog open={open} onClose={() => setOpen(false)} title="Congratulations!" eyebrow="Challenge completed" className="incident-completion">
    <div className="incident-completion-content">
      <div className="incident-completion-art" aria-hidden="true">
        {open && [0, 1, 2].map(burst => <span key={burst} className="incident-firework">{sparks.map((style, index) => <i key={index} style={style} />)}</span>)}
        <span className="incident-completion-trophy"><Trophy size={44} strokeWidth={1.5} /></span>
      </div>
      <h3>You saved the flash sale.</h3>
      <p>All five acceptance checks passed. You repaired the system and completed the Materialize Learning Lab challenge.</p>
      <p className="incident-completion-message">Congratulations on finishing the challenge!</p>
      <div className="incident-actions">
        <Link className="button button-secondary button-normal" to="/"><ArrowLeft size={14} aria-hidden="true" />Back to main page</Link>
        <Button variant="primary" data-dialog-primary onClick={() => setOpen(false)}>View handover</Button>
      </div>
    </div>
  </Dialog>;
}
