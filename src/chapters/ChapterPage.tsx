import { useOutletContext } from 'react-router';
import { ChapterDocumentation } from '../components/chapter/ChapterDocumentation';
import { ChapterOverviewIllustration } from '../components/chapter/ChapterOverviewIllustration';
import { ChapterOverviewSection } from '../components/chapter/ChapterOverviewSection';
import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import { usePageTitle } from '../hooks/usePageTitle';
import { getChapterSections } from './chapterOutline';
import type { ChapterDefinition } from './chapterRegistry';

export function ChapterPage() {
  const chapter = useOutletContext<ChapterDefinition>();
  usePageTitle(chapter.shortTitle);

  return (
    <section className="chapter-overview" data-chapter={chapter.slug} aria-label="Chapter overview">
      <Breadcrumbs items={[
        { label: 'Learning path', to: '/' },
        { label: 'Guided labs', to: '/labs' },
        { label: chapter.shortTitle },
      ]} />
      <header className="chapter-overview-hero">
        <div>
          <h1>{chapter.shortTitle}</h1>
          <p>{chapter.introduction ?? chapter.description}</p>
        </div>
        <ChapterOverviewIllustration imageSrc={chapter.overviewImage} imageFit={chapter.overviewImageFit} />
      </header>
      <ChapterDocumentation key={chapter.slug} chapter={chapter} />
      {getChapterSections(chapter).map((section) => (
        <ChapterOverviewSection
          key={`${chapter.slug}/${section.slug}`}
          chapter={chapter}
          section={section}
        />
      ))}
    </section>
  );
}
