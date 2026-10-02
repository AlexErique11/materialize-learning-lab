import { ArrowRight } from 'lucide-react';
import { Link, useOutletContext, useParams } from 'react-router';
import { ChapterPagination } from '../components/chapter/ChapterPagination';
import { ContentPlaceholder } from '../components/chapter/ContentPlaceholder';
import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import { PageContainer } from '../components/layout/PageContainer';
import { PageHeader } from '../components/layout/PageHeader';
import { NotFoundPage } from '../pages/NotFoundPage';
import {
  chapterContentPath,
  findChapterContent,
  findChapterSection,
  getChapterPages,
} from './chapterOutline';
import { chapterPath, formatChapterNumber, type ChapterDefinition } from './chapterRegistry';

export function ChapterContentPage() {
  const chapter = useOutletContext<ChapterDefinition>();
  const { sectionSlug, pageSlug } = useParams();
  const section = findChapterSection(chapter, sectionSlug);
  const page = findChapterContent(chapter, sectionSlug, pageSlug);
  if (!section || (pageSlug !== undefined && !page)) return <NotFoundPage />;

  const pages = getChapterPages(chapter);
  const index = page
    ? pages.findIndex((item) => item.sectionSlug === page.sectionSlug && item.slug === page.slug)
    : -1;
  const previous = page ? pages[index - 1] : undefined;
  const next = page ? pages[index + 1] : pages.find((item) => item.sectionSlug === section.slug);
  const title = page?.title ?? section.title;
  const placeholderTitle = page
    ? section.slug === 'tutorial'
      ? 'Lecture content'
      : 'Exercise content'
    : `${section.title} content`;

  return (
    <PageContainer
      fitViewport={Boolean(page)}
      tone={section.slug === 'exercises' ? 'practice' : 'learning'}
    >
      {!page && (
        <Breadcrumbs
          items={[
            { label: 'Learning path', to: '/' },
            { label: 'Guided labs', to: '/labs' },
            { label: chapter.shortTitle, to: chapterPath(chapter) },
            { label: section.title },
          ]}
        />
      )}
      <PageHeader
        title={title}
        eyebrow={
          <span className="eyebrow">
            Chapter {formatChapterNumber(chapter.number)} · {section.title}
          </span>
        }
      />
      <ContentPlaceholder title={placeholderTitle} />
      {!page && section.pages.length > 0 && (
        <ol className="chapter-content-list" aria-label={`${section.title} pages`}>
          {section.pages.map((item) => (
            <li key={item.slug}>
              <Link to={chapterContentPath(chapter, { ...item, sectionSlug: section.slug })}>
                {item.title}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ol>
      )}
      <ChapterPagination
        previous={
          previous
            ? { to: chapterContentPath(chapter, previous), title: previous.title }
            : { to: chapterPath(chapter), title: chapter.shortTitle, label: 'Chapter overview' }
        }
        next={
          next
            ? { to: chapterContentPath(chapter, next), title: next.title }
            : page
              ? { to: chapterPath(chapter), title: chapter.shortTitle, label: 'Back to chapter' }
              : undefined
        }
      />
    </PageContainer>
  );
}
