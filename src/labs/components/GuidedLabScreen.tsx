import { useEffect, useState, type ReactNode } from 'react';
import { ArrowRight, Lightbulb, Play } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { materializeDocumentation } from '../../app/resources';
import { chapterSectionPath, getChapterSections } from '../../chapters/chapterOutline';
import { chapterPath, type ChapterDefinition } from '../../chapters/chapterRegistry';
import { SqlObjectivesPanel } from '../../components/lab/SqlObjectivesPanel';
import { Breadcrumbs } from '../../components/layout/Breadcrumbs';
import { Button } from '../../components/ui/Button';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { usePageTitle } from '../../hooks/usePageTitle';

// Preserve the reference's four checkpoints until real lab content supplies progress.
const PLACEHOLDER_CHECKPOINT_TOTAL = 4;

interface GuidedLabScreenProps {
  chapter: ChapterDefinition;
  title?: string;
  regionLabel?: string;
  navigation?: ReactNode;
  children?: ReactNode;
}

export function GuidedLabScreen({
  chapter,
  title = chapter.shortTitle,
  regionLabel = 'Lab workspace',
  navigation,
  children,
}: GuidedLabScreenProps) {
  const [referenceOpen, setReferenceOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => {
    setReferenceOpen(false);
  }, [pathname]);
  usePageTitle(title);

  return (
    <section className="guided-lab-page">
      <div className="guided-lab-top-row">
        <Breadcrumbs items={[
          { label: 'Guided labs', to: '/labs' },
          { label: chapter.shortTitle, ...(title !== chapter.shortTitle ? { to: chapterPath(chapter) } : {}) },
          ...(title !== chapter.shortTitle ? [{ label: title }] : []),
        ]} />
        {navigation}
      </div>
      <div className="guided-lab-heading">
        <div className="guided-lab-title">
          <h1>{title}</h1>
          <p>{chapter.description}</p>
        </div>
        <div className="guided-lab-controls" aria-label="Lab controls">
          <div className="guided-lab-progress">
            <div><span>Progress</span><strong>{`0 / ${PLACEHOLDER_CHECKPOINT_TOTAL}`}</strong></div>
            <ProgressBar value={0} total={PLACEHOLDER_CHECKPOINT_TOTAL} label="Lab checkpoints completed" />
          </div>
          <Button onClick={() => setReferenceOpen(true)}>SQL &amp; Objectives</Button>
          <Button disabled title="This lab is to be done">Reset</Button>
          <Button disabled title="This lab is to be done">
            <Play size={13} fill="currentColor" aria-hidden="true" />Run
          </Button>
          <Button variant="primary" disabled title="This lab is to be done">
            <Play size={13} fill="currentColor" aria-hidden="true" />Start guided run
          </Button>
        </div>
      </div>
      <section className="guided-lab-canvas" aria-label={regionLabel}><p>To be done</p></section>
      {children && <div className="guided-lab-page-navigation">{children}</div>}
      <aside className="guided-lab-tip" aria-label="Lab tip">
        <Lightbulb size={27} aria-hidden="true" />
        <strong>Tip</strong>
        <p>Use the SQL &amp; Objectives panel to see what to build, or start a guided run to step through the scenario.</p>
        <button type="button" onClick={() => setReferenceOpen(true)}>
          Open SQL &amp; Objectives<ArrowRight size={16} aria-hidden="true" />
        </button>
      </aside>
      <SqlObjectivesPanel
        open={referenceOpen}
        onClose={() => setReferenceOpen(false)}
        objective={
          <>
            <p>{chapter.description}</p>
            <nav className="guided-lab-reference-links" aria-label="Lab sections">
              {getChapterSections(chapter).map((section) => (
                <Link key={section.slug} to={chapterSectionPath(chapter, section.slug)}>
                  {section.title}<ArrowRight size={16} aria-hidden="true" />
                </Link>
              ))}
            </nav>
          </>
        }
        documentationLinks={[{ label: materializeDocumentation.title, href: materializeDocumentation.href }]}
      />
    </section>
  );
}
