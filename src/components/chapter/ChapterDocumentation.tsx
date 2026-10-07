import { ChevronDown, ExternalLink, FileText } from 'lucide-react';
import { materializeDocumentation } from '../../app/resources';
import { formatChapterNumber, type ChapterDefinition } from '../../chapters/chapterRegistry';

export function ChapterDocumentation({ chapter }: { chapter: ChapterDefinition }) {
  const resources = chapter.number === 1 || chapter.number === 2
    ? chapter.documentationLinks ?? []
    : [...(chapter.documentationLinks ?? []), materializeDocumentation];

  return (
    <details className="chapter-learn-more">
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
        {resources.map((resource, index) => (
          <li key={resource.href}>
            <a href={resource.href} target="_blank" rel="noopener noreferrer">
              <span className="chapter-documentation-number" aria-hidden="true">
                {formatChapterNumber(index + 1)}
              </span>
              <span className="chapter-documentation-copy">
                <span className="chapter-documentation-title">{resource.title}</span>
                <span className="chapter-documentation-address" aria-hidden="true">
                  {resource.href.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </span>
              </span>
              <ExternalLink aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
