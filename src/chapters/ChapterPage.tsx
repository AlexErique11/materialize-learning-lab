import { useEffect } from 'react';
import { ArrowRight, BookOpen, ChevronDown, Clock, Code, ExternalLink, FileText } from 'lucide-react';
import { Link, useOutletContext } from 'react-router';
import { ChapterOverviewIllustration } from '../components/chapter/ChapterOverviewIllustration';
import { DOCUMENTATION_URL } from '../components/layout/AppHeader';
import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import { chapterContentPath, chapterSectionPath, getChapterSections } from './chapterOutline';
import { formatChapterNumber, type ChapterDefinition } from './chapterRegistry';

export function ChapterPage() {
  const chapter = useOutletContext<ChapterDefinition>();
  const introduction = chapter.slug === 'time-in-materialize'
    ? 'Learn how time and updates flow through Materialize. In this chapter you will explore logical time, order lifecycles, and how Materialize processes and maintains up-to-date results in real time.'
    : chapter.description;

  useEffect(() => {
    document.title = `${chapter.shortTitle} | Materialize Learning Lab`;
  }, [chapter.shortTitle]);

  return (
    <section className="chapter-overview" aria-label="Chapter overview">
      <Breadcrumbs items={[
        { label: 'Learning path', to: '/' },
        { label: 'Guided labs', to: '/labs' },
        { label: chapter.shortTitle },
      ]} />
      <header className="chapter-overview-hero">
        <div>
          <h1>{chapter.shortTitle}</h1>
          <p>{introduction}</p>
        </div>
        <ChapterOverviewIllustration />
      </header>
      <details key={chapter.slug} className="chapter-learn-more">
        <summary>
          <span className="chapter-learn-more-icon"><FileText aria-hidden="true" /></span>
          <span className="chapter-learn-more-art" aria-hidden="true">
            <svg viewBox="129 214 996 826" preserveAspectRatio="none">
              <image href="/materialize-logo-high-resolution.png" width="1254" height="1254" />
            </svg>
          </span>
          <div className="chapter-learn-more-copy">
            <h2>Learn more</h2>
            <p>Explore the documentation for this chapter.</p>
          </div>
          <ChevronDown size={20} aria-hidden="true" />
        </summary>
        <ul className="chapter-documentation-links" aria-label="Documentation links">
          {[
            ...(chapter.documentationLinks ?? []),
            { title: 'Materialize documentation', href: DOCUMENTATION_URL },
          ].map((resource, index) => (
            <li key={resource.href}>
              <a href={resource.href} target="_blank" rel="noopener noreferrer">
                <span className="chapter-documentation-number" aria-hidden="true">{formatChapterNumber(index + 1)}</span>
                <span className="chapter-documentation-copy">
                  <span className="chapter-documentation-title">{resource.title}</span>
                  <span className="chapter-documentation-address" aria-hidden="true">{resource.href.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                </span>
                <ExternalLink aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </details>
      {getChapterSections(chapter).map((section) => {
        const isTutorial = section.slug === 'tutorial';
        const title = isTutorial ? 'Tutorials' : 'Exercises';
        const SectionIcon = isTutorial ? BookOpen : Code;
        return (
          <details key={`${chapter.slug}/${section.slug}`} className="chapter-overview-section" open>
            <summary>
              <SectionIcon size={36} aria-hidden="true" />
              <div>
                <h2>{title}</h2>
                <p>{isTutorial
                  ? 'Step-by-step guided tutorials to learn the core concepts of this chapter.'
                  : 'Hands-on exercises to test your understanding.'}</p>
              </div>
              <ChevronDown size={20} aria-hidden="true" />
            </summary>
            <ol className="chapter-overview-list" aria-label={`${title} list`}>
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
                    className={`chapter-overview-start${isTutorial && index === 0 ? ' chapter-overview-start-primary' : ''}`}
                    to={chapterContentPath(chapter, { ...page, sectionSlug: section.slug })}
                    aria-label={`Start ${isTutorial ? 'tutorial' : 'exercise'}: ${page.title}`}
                  >
                    Start {isTutorial ? 'tutorial' : 'exercise'}<ArrowRight size={18} aria-hidden="true" />
                  </Link>
                </li>
              )) : (
                <li className="chapter-overview-row chapter-overview-empty">
                  <span className="chapter-overview-number" aria-hidden="true">—</span>
                  <div className="chapter-overview-row-copy">
                    <h3>{title} to be done</h3>
                    <p>Content for this chapter will be added here.</p>
                  </div>
                  <Link className="chapter-overview-start" to={chapterSectionPath(chapter, section.slug)}>
                    Open {title.toLowerCase()}<ArrowRight size={18} aria-hidden="true" />
                  </Link>
                </li>
              )}
            </ol>
          </details>
        );
      })}
    </section>
  );
}
