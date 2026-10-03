import { useState } from 'react';
import {
  ArrowRight, ChevronRight, ChevronsRight, CircleArrowRight, CircleHelp, FileText,
} from 'lucide-react';
import { Link } from 'react-router';
import { coreChapters } from '../chapters/chapterRegistry';
import { findChallenge, challengePath } from '../challenges/challengeRegistry';
import { DOCUMENTATION_URL } from '../components/layout/AppHeader';
import { PageContainer } from '../components/layout/PageContainer';
import { PageHeader } from '../components/layout/PageHeader';
import { ProgressBar } from '../components/ui/ProgressBar';

const labFeatures = [
  { marker: ChevronsRight, markerClassName: '', title: 'Learn by doing', description: 'Follow interactive, hands-on tutorials with a running environment.' },
  { marker: ChevronsRight, markerClassName: '', title: 'Build core skills', description: 'From streaming SQL to real-time applications.' },
  { marker: ChevronsRight, markerClassName: '', title: 'Track your progress', description: 'See what you’ve completed and pick up where you left off.' },
];

// The reference features two entry points; the full capstone catalog stays at /challenges.
const featuredChallenges = [
  { slug: 'fresh-but-expensive', marker: CircleArrowRight, title: 'Challange 1 : Some challange not designed yet', description: 'Lorem ipsum dolor sit amet.' },
  { slug: 'live-order-operations', marker: CircleArrowRight, title: 'Challange 2 : Some challange not designed yet', description: 'Lorem ipsum dolor sit amet.' },
];

export function LearningPathPage() {
  const [faqOpen, setFaqOpen] = useState(false);

  return (
    <PageContainer className="learning-path-page">
      <PageHeader
        eyebrow={<span className="learning-path-eyebrow">Learning path</span>}
        title="Learning path"
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
            {labFeatures.map(({ marker: Marker, markerClassName, title, description }) => (
              <li key={title}>
                <Marker className={`learning-path-marker${markerClassName}`} size={26} strokeWidth={2.5} aria-hidden="true" />
                <div><h3>{title}</h3><p>{description}</p></div>
              </li>
            ))}
          </ul>
          <div className="learning-path-progress">
            <div><span>Your progress</span><span>0/{coreChapters.length} completed</span></div>
            <ProgressBar value={0} total={coreChapters.length} label="Core chapters completed" />
          </div>
        </section>
        <section className="learning-path-card" aria-labelledby="challenges-title">
          <Link to="/challenges" className="learning-path-card-header" aria-labelledby="challenges-title">
            <div><h2 id="challenges-title">Challenges</h2><p>Test your knowledge with real-world problems.</p></div>
            <ArrowRight className="learning-path-arrow" size={26} aria-hidden="true" />
          </Link>
          <ul className="learning-path-challenges">
            {featuredChallenges.map(({ slug, marker: Marker, title, description }) => {
              const challenge = findChallenge(slug);
              if (!challenge) return null;
              return (
                <li key={slug}>
                  <Link to={challengePath(challenge)}>
                    <Marker className="learning-path-marker" size={26} strokeWidth={2.5} aria-hidden="true" />
                    <div><h3>{title}</h3><p>{description}</p></div>
                    <span className="learning-path-status">Not started</span>
                    <ChevronRight className="learning-path-chevron" size={22} aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="learning-path-progress">
            <div><span>Your progress</span><span>0/{featuredChallenges.length} completed</span></div>
            <ProgressBar value={0} total={featuredChallenges.length} label="Featured challenges completed" />
          </div>
        </section>
      </div>
      <section className="learning-path-resources" aria-labelledby="resources-title">
        <header><h2 id="resources-title">Help &amp; resources</h2><p>Everything you need to succeed on your learning journey.</p></header>
        <div className="learning-path-resource-grid">
          <a className="learning-path-resource" href={DOCUMENTATION_URL}>
            <FileText size={32} aria-hidden="true" />
            <div><h3>Documentation</h3><p>Read the full Materialize docs.</p></div>
            <ArrowRight className="learning-path-arrow" size={23} aria-hidden="true" />
          </a>
          <button type="button" className="learning-path-resource" aria-expanded={faqOpen} aria-controls="learning-path-faq" onClick={() => setFaqOpen((open) => !open)}>
            <CircleHelp size={32} aria-hidden="true" />
            <div><h3>FAQ</h3><p>Common questions about labs and challenges.</p></div>
            <ArrowRight className="learning-path-arrow" size={23} aria-hidden="true" />
          </button>
        </div>
        <section id="learning-path-faq" className="learning-path-faq" hidden={!faqOpen} aria-label="Frequently asked questions">
          <h3>Frequently asked questions</h3>
          <details>
            <summary>Where should I start?</summary>
            <p>Start with <Link to="/labs">Guided labs</Link>. The twelve core chapters follow a learning sequence, with an optional advanced chapter after them.</p>
          </details>
          <details>
            <summary>What is the difference between labs and challenges?</summary>
            <p>Guided labs introduce concepts through tutorials and exercises. <Link to="/challenges">Challenges</Link> combine those concepts in capstone projects. The challenge library includes all three capstones.</p>
          </details>
          <details>
            <summary>Is my progress saved?</summary>
            <p>This version provides the course structure. Exercises and completion tracking are still being built, so progress starts at zero.</p>
          </details>
        </section>
      </section>
    </PageContainer>
  );
}
