import {
  chapterContentPath,
  getChapterPages,
  type ChapterContentDefinition,
  type ChapterSectionDefinition,
} from './chapterOutline';
import { chapterPath, type ChapterDefinition } from './chapterRegistry';

export interface ChapterPageDestination {
  to: string;
  title: string;
  label?: string;
}

interface ChapterNavigation {
  previous: ChapterPageDestination;
  next?: ChapterPageDestination;
}

export function getChapterNavigation(
  chapter: ChapterDefinition,
  section: ChapterSectionDefinition,
  page?: ChapterContentDefinition,
): ChapterNavigation {
  const pages = getChapterPages(chapter);
  const index = page
    ? pages.findIndex((item) => item.sectionSlug === page.sectionSlug && item.slug === page.slug)
    : -1;
  const previous = page ? pages[index - 1] : undefined;
  const next = page ? pages[index + 1] : pages.find((item) => item.sectionSlug === section.slug);
  const overview = { to: chapterPath(chapter), title: chapter.shortTitle };

  return {
    previous: previous
      ? { to: chapterContentPath(chapter, previous), title: previous.title }
      : { ...overview, label: 'Chapter overview' },
    next: next
      ? { to: chapterContentPath(chapter, next), title: next.title }
      : page ? { ...overview, label: 'Back to chapter' } : undefined,
  };
}
