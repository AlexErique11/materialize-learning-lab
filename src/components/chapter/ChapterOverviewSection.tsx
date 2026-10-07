import { ArrowRight, BookOpen, ChevronDown, Clock, Code } from 'lucide-react';
import { Link } from 'react-router';
import {
  chapterContentPath,
  chapterSectionPath,
  type ChapterSectionDefinition,
} from '../../chapters/chapterOutline';
import { formatChapterNumber, type ChapterDefinition } from '../../chapters/chapterRegistry';

interface ChapterOverviewSectionProps {
  chapter: ChapterDefinition;
  section: ChapterSectionDefinition;
}

export function ChapterOverviewSection({ chapter, section }: ChapterOverviewSectionProps) {
  const isTutorial = section.slug === 'tutorial';
  const SectionIcon = isTutorial ? BookOpen : Code;

  return (
    <details data-walkthrough={isTutorial ? 'tutorials' : 'exercises'} className="chapter-overview-section" open>
      <summary>
        <SectionIcon size={36} aria-hidden="true" />
        <div>
          <h2>{section.listTitle}</h2>
          <p>{section.description}</p>
        </div>
        <ChevronDown size={20} aria-hidden="true" />
      </summary>
      <ol className="chapter-overview-list" aria-label={`${section.listTitle} list`}>
        {section.pages.length > 0 ? section.pages.map((page, index) => (
          <li key={page.slug} className="chapter-overview-row">
            <span className="chapter-overview-number">{formatChapterNumber(index + 1)}</span>
            <div className="chapter-overview-row-copy">
              <h3>{page.title}</h3>
              <p>{page.description ?? 'To be done'}</p>
            </div>
            {isTutorial ? (
              page.durationMinutes && <span className="chapter-overview-duration">
                <Clock size={18} aria-hidden="true" />{page.durationMinutes} min
              </span>
            ) : <span className="chapter-overview-status">Not started</span>}
            <Link
              data-walkthrough={isTutorial && page.slug === 'lecture-1' ? 'start-lecture-1' : undefined}
              className="chapter-overview-start chapter-overview-start-lesson"
              to={chapterContentPath(chapter, { ...page, sectionSlug: section.slug })}
              aria-label={`Start ${section.itemLabel}: ${page.title}`}
            >
              Start {section.itemLabel}<ArrowRight size={18} aria-hidden="true" />
            </Link>
          </li>
        )) : (
          <li className="chapter-overview-row chapter-overview-empty">
            <span className="chapter-overview-number" aria-hidden="true">—</span>
            <div className="chapter-overview-row-copy">
              <h3>{section.listTitle} to be done</h3>
              <p>Content for this chapter will be added here.</p>
            </div>
            <Link className="chapter-overview-start" to={chapterSectionPath(chapter, section.slug)}>
              Open {section.listTitle.toLowerCase()}<ArrowRight size={18} aria-hidden="true" />
            </Link>
          </li>
        )}
      </ol>
    </details>
  );
}
