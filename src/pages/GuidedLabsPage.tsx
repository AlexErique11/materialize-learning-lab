import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import {
  advancedChapters,
  chapterPath,
  coreChapters,
  formatChapterNumber,
  type ChapterDefinition,
} from '../chapters/chapterRegistry';
import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import { PageContainer } from '../components/layout/PageContainer';
import { PageHeader } from '../components/layout/PageHeader';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';

function ChapterList({ chapters }: { chapters: readonly ChapterDefinition[] }) {
  return (
    <ol className="chapter-list">
      {chapters.map((chapter) => (
        <li key={chapter.slug}>
          <Link to={chapterPath(chapter)} className="chapter-row">
            <span className="chapter-number">{formatChapterNumber(chapter.number)}</span>
            <div className="min-w-0">
              <h3 className="font-medium">{chapter.shortTitle}</h3>
              <p className="mt-1 text-sm leading-relaxed text-text-muted">{chapter.description}</p>
            </div>
            <Badge className="chapter-row-status">Not started</Badge>
            <ArrowRight size={17} className="chapter-row-arrow" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ol>
  );
}

export function GuidedLabsPage() {
  return (
    <PageContainer>
      <Breadcrumbs items={[{ label: 'Learning path', to: '/' }, { label: 'Guided labs' }]} />
      <PageHeader
        title="Guided labs"
        description="Twelve core chapters and one optional advanced chapter."
      />
      <div className="sequence-progress">
        <div>
          <p className="font-medium">Progress</p>
          <p className="mt-1 text-sm text-text-muted">
            0 / {coreChapters.length} core chapters completed
          </p>
        </div>
        <ProgressBar
          value={0}
          total={coreChapters.length}
          label="Core chapters completed"
          className="sequence-progress-bar"
        />
      </div>
      <section aria-labelledby="core-title">
        <div className="section-heading">
          <h2 id="core-title">Core sequence</h2>
          <span>{coreChapters.length} chapters</span>
        </div>
        <ChapterList chapters={coreChapters} />
      </section>
      <section className="mt-10" aria-labelledby="advanced-title">
        <div className="section-heading">
          <h2 id="advanced-title">Go further</h2>
          <Badge tone="accent">Optional · advanced</Badge>
        </div>
        <ChapterList chapters={advancedChapters} />
        <p className="mt-3 text-xs text-text-muted">
          The advanced chapter is separate from core completion.
        </p>
      </section>
    </PageContainer>
  );
}
