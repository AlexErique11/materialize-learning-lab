import {
  chapterPath,
  formatChapterNumber,
  type ChapterDefinition,
} from '../../chapters/chapterRegistry';
import { Breadcrumbs } from '../../components/layout/Breadcrumbs';
import { PageHeader } from '../../components/layout/PageHeader';

interface LabHeaderProps {
  chapter: ChapterDefinition;
  title: string;
  description?: string;
}

export function LabHeader({ chapter, title, description }: LabHeaderProps) {
  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Learning path', to: '/' },
          { label: 'Guided labs', to: '/labs' },
          { label: chapter.shortTitle, to: chapterPath(chapter) },
          { label: title },
        ]}
      />
      <PageHeader
        title={title}
        description={description}
        eyebrow={
          <span className="eyebrow">
            Chapter {formatChapterNumber(chapter.number)} · {chapter.shortTitle}
          </span>
        }
      />
    </>
  );
}
