import { ArrowRight } from 'lucide-react';
import { Link, useOutletContext } from 'react-router';
import { ContentPlaceholder } from '../components/chapter/ContentPlaceholder';
import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import { PageContainer } from '../components/layout/PageContainer';
import { PageHeader } from '../components/layout/PageHeader';
import { Badge } from '../components/ui/Badge';
import { chapterSectionPath, getChapterSections } from './chapterOutline';
import { formatChapterNumber, type ChapterDefinition } from './chapterRegistry';

export function ChapterPage() {
  const chapter = useOutletContext<ChapterDefinition>();

  return (
    <PageContainer>
      <Breadcrumbs
        items={[
          { label: 'Learning path', to: '/' },
          { label: 'Guided labs', to: '/labs' },
          { label: chapter.shortTitle },
        ]}
      />
      <PageHeader
        title={chapter.title}
        eyebrow={
          <>
            <span className="eyebrow">Chapter {formatChapterNumber(chapter.number)}</span>
            {chapter.optional && <Badge tone="accent">Optional · advanced</Badge>}
            <Badge>Not started</Badge>
          </>
        }
      />
      <ContentPlaceholder title="What you'll learn" />
      <div className="chapter-section-cards">
        {getChapterSections(chapter).map((section) => (
          <Link
            key={section.slug}
            to={chapterSectionPath(chapter, section.slug)}
            className="chapter-section-card"
          >
            <h2>{section.title}</h2>
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        ))}
      </div>
    </PageContainer>
  );
}
