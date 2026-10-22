import { useOutletContext } from 'react-router';
import { ChapterDocumentation } from '../components/chapter/ChapterDocumentation';
import { ChapterOverviewIllustration } from '../components/chapter/ChapterOverviewIllustration';
import { ChapterOverviewSection } from '../components/chapter/ChapterOverviewSection';
import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import { ComingSoon } from '../components/ui/ComingSoon';
import { usePageTitle } from '../hooks/usePageTitle';
import { getChapterSections } from './chapterOutline';
import { guidedLabsHomePath, type ChapterDefinition } from './chapterRegistry';

export function ChapterPage() {
  const chapter = useOutletContext<ChapterDefinition>();
  usePageTitle(chapter.shortTitle);
  const sections = getChapterSections(chapter);
  const available = sections.some(section => section.pages.length > 0);

  return (
    <section className="chapter-overview" data-chapter={chapter.slug} aria-label="Chapter overview">
      <Breadcrumbs items={[
        { label: 'Learning path', to: '/' },
        { label: 'Guided labs', to: guidedLabsHomePath },
        { label: chapter.shortTitle },
      ]} />
      <header className="chapter-overview-hero">
        <div>
          <h1>{chapter.shortTitle}</h1>
          <p>{chapter.introduction ?? chapter.description}</p>
        </div>
        <ChapterOverviewIllustration imageSrc={chapter.overviewImage} imageFit={chapter.overviewImageFit} />
      </header>
      {available && <ChapterDocumentation key={chapter.slug} chapter={chapter} />}
      {!available && <ComingSoon description="This chapter's tutorials and exercises are being prepared. Explore the available chapters in the meantime." to={guidedLabsHomePath} action="Explore guided labs" />}
      {sections.filter(section => section.pages.length > 0).map((section) => (
        <ChapterOverviewSection
          key={`${chapter.slug}/${section.slug}`}
          chapter={chapter}
          section={section}
        />
      ))}
    </section>
  );
}
