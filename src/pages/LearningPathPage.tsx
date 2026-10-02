import { ArrowRight, ArrowUpRight, BookOpen, Layers3, Library } from 'lucide-react';
import { Link } from 'react-router';
import { advancedChapters, coreChapters } from '../chapters/chapterRegistry';
import { challenges } from '../challenges/challengeRegistry';
import { DOCUMENTATION_URL } from '../components/layout/AppHeader';
import { PageContainer } from '../components/layout/PageContainer';
import { PageHeader } from '../components/layout/PageHeader';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';

export function LearningPathPage() {
  return (
    <PageContainer fitViewport className="learning-path-page">
      <PageHeader title="Learning path" description="Materialize chapters and challenges." />
      <div className="pathway-grid">
        <Link
          to="/labs"
          className="panel pathway-card"
          aria-labelledby="guided-labs-title"
        >
          <div className="pathway-card-header">
            <span className="pathway-icon" aria-hidden="true">
              <BookOpen size={23} />
            </span>
            <h2 id="guided-labs-title" className="pathway-title">
              Guided labs
            </h2>
            <Badge className="ml-auto">
              {coreChapters.length} core + {advancedChapters.length} optional
            </Badge>
          </div>
          <p className="pathway-description">Tutorials and exercises, organized by chapter.</p>
          <div className="pathway-action">
            Explore guided labs <ArrowRight size={17} aria-hidden="true" />
          </div>
          <div className="pathway-progress">
            <div className="mb-2 flex justify-between gap-2">
              <span>Core chapters completed</span>
              <span className="font-medium text-text">0 / {coreChapters.length}</span>
            </div>
            <ProgressBar value={0} total={coreChapters.length} label="Core chapters completed" />
          </div>
        </Link>
        <Link
          to="/challenges"
          className="panel pathway-card"
          data-tone="practice"
          aria-labelledby="challenges-title"
        >
          <div className="pathway-card-header">
            <span className="pathway-icon" aria-hidden="true">
              <Layers3 size={23} />
            </span>
            <h2 id="challenges-title" className="pathway-title">
              Challenges
            </h2>
            <Badge className="ml-auto">{challenges.length} capstones</Badge>
          </div>
          <ol className="capstone-preview">
            {challenges.map((challenge) => (
              <li key={challenge.slug}>
                <span aria-hidden="true">{String(challenge.number).padStart(2, '0')}</span>
                {challenge.title}
              </li>
            ))}
          </ol>
          <div className="pathway-action">
            Explore challenges <ArrowRight size={17} aria-hidden="true" />
          </div>
          <div className="pathway-progress">
            <div className="mb-2 flex justify-between gap-2">
              <span>Challenges completed</span>
              <span className="font-medium text-text">0 / {challenges.length}</span>
            </div>
            <ProgressBar value={0} total={challenges.length} label="Challenges completed" />
          </div>
        </Link>
      </div>
      <section className="resources-section" aria-labelledby="resources-title">
        <h2 id="resources-title">Resources</h2>
        <a className="resource-link" href={DOCUMENTATION_URL}>
          <Library size={16} aria-hidden="true" />
          Materialize documentation
          <ArrowUpRight size={15} aria-hidden="true" />
        </a>
      </section>
    </PageContainer>
  );
}
