import {
  ArrowRight, ChevronsRight, CircleArrowRight, FileText,
} from 'lucide-react';
import { Link } from 'react-router';
import { useLabProgress } from '../hooks/useLabProgress';
import { challenge } from '../challenges/challengeRegistry';
import { useChallengeProgress } from '../hooks/useChallengeProgress';
import { challengeActionLabel } from '../progress/challengeProgress';
import { DOCUMENTATION_URL } from '../app/resources';
import { Button } from '../components/ui/Button';
import { useWalkthrough } from '../components/walkthrough/WalkthroughProvider';
import { PageContainer } from '../components/layout/PageContainer';
import { PageHeader } from '../components/layout/PageHeader';
import { ProgressBar } from '../components/ui/ProgressBar';
import { labFeatures } from './learningPathContent';

function LearningPathProgress({ value = 0, total, label }: { value?: number; total: number; label: string }) {
  return (
    <div className="learning-path-progress">
      <div><span>Your progress</span><span>{value}/{total} completed</span></div>
      <ProgressBar value={value} total={total} label={label} />
    </div>
  );
}

export function LearningPathPage() {
  const progress = useLabProgress();
  const challengeProgress = useChallengeProgress();
  const { startChapterTour } = useWalkthrough();
  return (
    <PageContainer className="learning-path-page">
      <PageHeader
        eyebrow={<span className="learning-path-eyebrow">Learning path</span>}
        title="Learning path"
        trailing={<Button className="learning-path-tour-button" onClick={() => startChapterTour()}><span>Take a tour</span></Button>}
        description="Build real-time data skills with hands-on labs, then apply what you learned in a real-world challenge."
      />
      <div className="learning-path-grid">
        <section className="learning-path-card" aria-labelledby="guided-labs-title">
          <Link to="/labs" state={{ labIntro: true }} className="learning-path-card-header" aria-labelledby="guided-labs-title">
            <div>
              <h2 id="guided-labs-title">Guided labs</h2>
              <p>Step-by-step tutorials to learn the core concepts of Materialize.</p>
            </div>
            <ArrowRight className="learning-path-arrow" size={26} aria-hidden="true" />
          </Link>
          <ul className="learning-path-features">
            {labFeatures.map(({ title, description }) => (
              <li key={title}>
                <ChevronsRight className="learning-path-marker" size={26} strokeWidth={2.5} aria-hidden="true" />
                <div><h3>{title}</h3><p>{description}</p></div>
              </li>
            ))}
          </ul>
          <LearningPathProgress value={progress.completed} total={progress.total} label="Core chapters completed" />
        </section>
        <section className="learning-path-card" aria-labelledby="challenge-title">
          <Link to={challenge.path} state={{ challengeIntro: true }} className="learning-path-card-header" aria-labelledby="challenge-title">
            <div><h2 id="challenge-title">Challenge</h2><p>Put the chapters into practice in one complete incident.</p></div>
            <ArrowRight className="learning-path-arrow" size={26} aria-hidden="true" />
          </Link>
          <ul className="learning-path-features learning-path-challenge-features">
            <li><CircleArrowRight className="learning-path-marker" size={26} aria-hidden="true" /><div><h3>{challenge.pageTitle}</h3><p>Restore a trustworthy live-orders dashboard during a flash sale.</p></div></li>
            <li><CircleArrowRight className="learning-path-marker" size={26} aria-hidden="true" /><div><h3>One incident to investigate</h3><p>Explore the evidence, run SQL, and prove your repair works.</p></div></li>
            <li><CircleArrowRight className="learning-path-marker" size={26} aria-hidden="true" /><div><h3>Pick up where you left off</h3><p>Your repairs, hints, and progress save as you work.</p></div></li>
          </ul>
          <div className="learning-path-challenge-footer"><span>{challenge.durationMinutes[0]}–{challenge.durationMinutes[1]} minutes · Chapters 1–{challenge.afterChapter}</span><Link className="button button-primary" to={challenge.path} state={{ challengeIntro: true }}>{challengeActionLabel(challengeProgress)}<ArrowRight size={15} aria-hidden="true" /></Link></div>
        </section>
      </div>
      <section className="learning-path-resources" aria-labelledby="documentation-title">
        <div className="learning-path-documentation">
          <div className="learning-path-documentation-copy">
            <p className="learning-path-eyebrow">Help &amp; resources</p>
            <h2 id="documentation-title">Documentation</h2>
            <p>Explore the full Materialize docs to dive deeper, learn core concepts, and use them side by side with the lab as you work.</p>
          </div>
          <a className="button button-primary learning-path-docs-link" href={DOCUMENTATION_URL} target="_blank" rel="noopener noreferrer">
            <FileText size={18} aria-hidden="true" />
            <span>Open docs</span>
            <ArrowRight size={20} aria-hidden="true" />
          </a>
        </div>
      </section>
    </PageContainer>
  );
}
