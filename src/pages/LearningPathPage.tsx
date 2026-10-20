import {
  ArrowRight, ChevronRight, ChevronsRight, CircleArrowRight, FileText,
} from 'lucide-react';
import { Link } from 'react-router';
import { useLabProgress } from '../hooks/useLabProgress';
import { findChallenge, challengePath } from '../challenges/challengeRegistry';
import { DOCUMENTATION_URL } from '../app/resources';
import { Button } from '../components/ui/Button';
import { useWalkthrough } from '../components/walkthrough/WalkthroughProvider';
import { PageContainer } from '../components/layout/PageContainer';
import { PageHeader } from '../components/layout/PageHeader';
import { ProgressBar } from '../components/ui/ProgressBar';
import { featuredChallenges, labFeatures } from './learningPathContent';

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
  const { startChapterTour } = useWalkthrough();
  return (
    <PageContainer className="learning-path-page">
      <PageHeader
        eyebrow={<span className="learning-path-eyebrow">Learning path</span>}
        title="Learning path"
        trailing={<Button className="learning-path-tour-button" onClick={() => startChapterTour()}><span>Take a tour</span></Button>}
        description="Build real-time data skills with hands-on labs and challenges. Follow the guided path or explore on your own."
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
        <section className="learning-path-card" aria-labelledby="challenges-title">
          <Link to="/challenges" className="learning-path-card-header" aria-labelledby="challenges-title">
            <div><h2 id="challenges-title">Challenges</h2><p>Test your knowledge with real-world problems.</p></div>
            <ArrowRight className="learning-path-arrow" size={26} aria-hidden="true" />
          </Link>
          <ul className="learning-path-challenges">
            {featuredChallenges.map((slug) => {
              const challenge = findChallenge(slug);
              if (!challenge) return null;
              return (
                <li key={slug}>
                  <Link to={challengePath(challenge)}>
                    <CircleArrowRight className="learning-path-marker" size={26} strokeWidth={2.5} aria-hidden="true" />
                    <div><h3>{challenge.title}</h3><p>Challenge content coming soon.</p></div>
                    <span className="learning-path-status">Not started</span>
                    <ChevronRight className="learning-path-chevron" size={22} aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
          <LearningPathProgress total={featuredChallenges.length} label="Featured challenges completed" />
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
