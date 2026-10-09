import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { chapters, chapterPath, formatChapterNumber } from '../chapters/chapterRegistry';
import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import { PageContainer } from '../components/layout/PageContainer';
import { PageHeader } from '../components/layout/PageHeader';
import { NotFoundPage } from '../pages/NotFoundPage';
import { findChallenge } from './challengeRegistry';

export function ChallengePage() {
  const { challengeSlug } = useParams();
  const challenge = findChallenge(challengeSlug);
  if (!challenge)
    return (
      <NotFoundPage
        title="Challenge not found"
        description="This challenge isn’t in the learning path. Explore the available capstones instead."
      />
    );
  const prerequisite = chapters.find((chapter) => chapter.number === challenge.afterChapter);

  return (
    <PageContainer tone="practice">
      <Breadcrumbs
        items={[
          { label: 'Learning path', to: '/' },
          { label: 'Challenges', to: '/challenges' },
          { label: challenge.title },
        ]}
      />
      <PageHeader
        title={challenge.title}
        description={challenge.description}
        eyebrow={
          <>
            <span className="eyebrow">Capstone {String(challenge.number).padStart(2, '0')}</span>
            <span className="reserved-badge" aria-hidden="true" />
          </>
        }
      />
      {prerequisite && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-md border border-border bg-surface px-5 py-4">
          <span className="text-sm text-text-muted">
            Designed for after chapter {formatChapterNumber(prerequisite.number)}
          </span>
          <Link
            to={chapterPath(prerequisite)}
            className="text-link inline-flex items-center gap-2 text-sm"
          >
            {prerequisite.shortTitle}
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      )}
      <div className="content-placeholder reserved-content" aria-hidden="true" />
      <Link to="/challenges" className="button button-ghost mt-6">
        <ArrowLeft size={15} aria-hidden="true" />
        All challenges
      </Link>
    </PageContainer>
  );
}
