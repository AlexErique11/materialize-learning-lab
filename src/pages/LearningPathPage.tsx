import {
  ArrowRight, ChevronRight, ChevronsRight, CircleArrowRight, CircleHelp, FileText,
} from 'lucide-react';
import { Link } from 'react-router';
import { coreChapters } from '../chapters/chapterRegistry';
import { findChallenge, challengePath } from '../challenges/challengeRegistry';
import { DOCUMENTATION_URL } from '../app/resources';
import { Button } from '../components/ui/Button';
import { useWalkthrough } from '../components/walkthrough/WalkthroughProvider';
import { PageContainer } from '../components/layout/PageContainer';
import { PageHeader } from '../components/layout/PageHeader';
import { ProgressBar } from '../components/ui/ProgressBar';
import { featuredChallenges, labFeatures } from './learningPathContent';

function LearningPathProgress({ total, label }: { total: number; label: string }) {
  return (
    <div className="learning-path-progress">
      <div><span>Your progress</span><span>0/{total} completed</span></div>
      <ProgressBar value={0} total={total} label={label} />
    </div>
  );
}

export function LearningPathPage() {
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
          <Link to="/labs" className="learning-path-card-header" aria-labelledby="guided-labs-title">
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
          <LearningPathProgress total={coreChapters.length} label="Core chapters completed" />
        </section>
        <section className="learning-path-card" aria-labelledby="challenges-title">
          <Link to="/challenges" className="learning-path-card-header" aria-labelledby="challenges-title">
            <div><h2 id="challenges-title">Challenges</h2><p>Test your knowledge with real-world problems.</p></div>
            <ArrowRight className="learning-path-arrow" size={26} aria-hidden="true" />
          </Link>
          <ul className="learning-path-challenges">
            {featuredChallenges.map(({ slug, title, description }) => {
              const challenge = findChallenge(slug);
              if (!challenge) return null;
              return (
                <li key={slug}>
                  <Link to={challengePath(challenge)}>
                    <CircleArrowRight className="learning-path-marker" size={26} strokeWidth={2.5} aria-hidden="true" />
                    <div><h3>{title}</h3><p>{description}</p></div>
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
      <section className="learning-path-resources" aria-labelledby="resources-title">
        <header><h2 id="resources-title">Help &amp; resources</h2><p>Everything you need to succeed on your learning journey.</p></header>
        <div className="learning-path-resource-grid">
          <a className="learning-path-resource" href={DOCUMENTATION_URL} target="_blank" rel="noopener noreferrer">
            <FileText size={32} aria-hidden="true" />
            <div><h3>Documentation</h3><p>Read the full Materialize docs.</p></div>
            <ArrowRight className="learning-path-arrow" size={23} aria-hidden="true" />
          </a>
          <Link to="/faq" className="learning-path-resource" target="_blank" rel="noopener noreferrer">
            <CircleHelp size={32} aria-hidden="true" />
            <div><h3>FAQ</h3><p>Common questions about labs and challenges.</p></div>
            <ArrowRight className="learning-path-arrow" size={23} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </PageContainer>
  );
}
