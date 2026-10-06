import { ArrowRight } from 'lucide-react';
import { Link, Navigate, useOutletContext, useParams } from 'react-router';
import { ChapterPagination } from '../components/chapter/ChapterPagination';
import { GuidedLabScreen } from '../labs/components/GuidedLabScreen';
import { NotFoundPage } from '../pages/NotFoundPage';
import {
  chapterContentPath,
  findChapterContent,
  findChapterSection,
} from './chapterOutline';
import type { ChapterDefinition } from './chapterRegistry';
import { getChapterNavigation } from './chapterNavigation';
import { LectureOne } from './changing-relations/LectureOne';
import { LectureTwo } from './changing-relations/LectureTwo';
import { ExerciseOne } from './changing-relations/ExerciseOne';
import { IncrementalLectureOne } from './incremental-maintenance/LectureOne';
import { IncrementalLectureTwo } from './incremental-maintenance/LectureTwo';

export function ChapterContentPage() {
  const chapter = useOutletContext<ChapterDefinition>();
  const { sectionSlug, pageSlug } = useParams();
  // Preserve existing bookmarks after merging Chapter 1's exercises.
  if (chapter.slug === 'changing-relations' && sectionSlug === 'exercises' && pageSlug === 'exercise-2') {
    return <Navigate to={chapterContentPath(chapter, findChapterContent(chapter, 'exercises', 'exercise-1')!)} replace />;
  }
  const section = findChapterSection(chapter, sectionSlug);
  const page = findChapterContent(chapter, sectionSlug, pageSlug);
  if (!section || (pageSlug !== undefined && !page)) return <NotFoundPage />;

  const navigation = getChapterNavigation(chapter, section, page);
  if (chapter.slug === 'incremental-maintenance' && section.slug === 'tutorial' && page?.slug === 'lecture-1') {
    return <IncrementalLectureOne chapter={chapter} navigation={<ChapterPagination {...navigation} />} />;
  }
  if (chapter.slug === 'incremental-maintenance' && section.slug === 'tutorial' && page?.slug === 'lecture-2') {
    return <IncrementalLectureTwo chapter={chapter} navigation={<ChapterPagination {...navigation} />} />;
  }
  if (chapter.slug === 'changing-relations' && section.slug === 'tutorial' && page?.slug === 'lecture-1') {
    return <LectureOne chapter={chapter} navigation={<ChapterPagination {...navigation} />} />;
  }
  if (chapter.slug === 'changing-relations' && section.slug === 'tutorial' && page?.slug === 'lecture-2') {
    return <LectureTwo chapter={chapter} navigation={<ChapterPagination {...navigation} />} />;
  }
  const title = page?.title ?? section.title;
  if (chapter.slug === 'changing-relations' && section.slug === 'exercises' && page?.slug === 'exercise-1') {
    return <ExerciseOne chapter={chapter} navigation={<ChapterPagination {...navigation} />} />;
  }
  const placeholderTitle = page
    ? section.slug === 'tutorial'
      ? 'Lecture content'
      : 'Exercise content'
    : `${section.title} content`;

  return (
    <GuidedLabScreen
      chapter={chapter}
      title={title}
      regionLabel={placeholderTitle}
      navigation={<ChapterPagination {...navigation} />}
    >
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
    </GuidedLabScreen>
  );
}
