import { ArrowRight, Layers3 } from 'lucide-react';
import { Link } from 'react-router';
import { challenges, challengePath } from '../challenges/challengeRegistry';
import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import { PageContainer } from '../components/layout/PageContainer';
import { PageHeader } from '../components/layout/PageHeader';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';

export function ChallengesPage() {
  return (
    <PageContainer tone="practice">
      <Breadcrumbs items={[{ label: 'Learning path', to: '/' }, { label: 'Challenges' }]} />
      <PageHeader title="Challenges" description="Capstone projects." />
      <div className="sequence-progress">
        <div>
          <p className="font-medium">Capstone progress</p>
          <p className="mt-1 text-sm text-text-muted">
            0 / {challenges.length} challenges completed
          </p>
        </div>
        <ProgressBar
          value={0}
          total={challenges.length}
          label="Challenges completed"
          className="sequence-progress-bar"
        />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        {challenges.map((challenge) => (
          <Link key={challenge.slug} to={challengePath(challenge)} className="challenge-card">
            <div className="mb-7 flex items-center justify-between gap-3">
              <span className="pathway-icon" aria-hidden="true">
                <Layers3 size={21} />
              </span>
              <Badge>Not started</Badge>
            </div>
            <p className="eyebrow mb-3">Capstone {String(challenge.number).padStart(2, '0')}</p>
            <h2 className="text-xl font-semibold leading-snug tracking-tight">{challenge.title}</h2>
            <p className="mb-6 mt-3 text-sm leading-relaxed text-text-muted">
              {challenge.description}
            </p>
            <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-4">
              <span className="text-xs text-text-muted">
                After chapter {String(challenge.afterChapter).padStart(2, '0')}
              </span>
              <ArrowRight size={17} aria-hidden="true" />
            </div>
          </Link>
        ))}
      </div>
    </PageContainer>
  );
}
