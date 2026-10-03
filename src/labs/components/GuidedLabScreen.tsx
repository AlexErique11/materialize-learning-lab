import { useEffect, useState, type ReactNode } from 'react';
import { ArrowRight, Lightbulb, Play } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { chapterSectionPath, getChapterSections } from '../../chapters/chapterOutline';
import { chapterPath, type ChapterDefinition } from '../../chapters/chapterRegistry';
import { Breadcrumbs } from '../../components/layout/Breadcrumbs';
import { DOCUMENTATION_URL } from '../../components/layout/AppHeader';
import { SqlObjectivesPanel } from '../../components/lab/SqlObjectivesPanel';
import { Button } from '../../components/ui/Button';
import { ProgressBar } from '../../components/ui/ProgressBar';

interface GuidedLabScreenProps {
  chapter: ChapterDefinition;
  title?: string;
  regionLabel?: string;
  children?: ReactNode;
}

export function GuidedLabScreen({ chapter, title = chapter.shortTitle, regionLabel = 'Lab workspace', children }: GuidedLabScreenProps) {
  const [referenceOpen, setReferenceOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => { setReferenceOpen(false); }, [pathname]);
  useEffect(() => { document.title = `${title} | Materialize Learning Lab`; }, [title]);

  return <section className="guided-lab-page">
    <Breadcrumbs items={[
      { label: 'Guided labs', to: '/labs' },
      { label: chapter.shortTitle, ...(title !== chapter.shortTitle ? { to: chapterPath(chapter) } : {}) },
      ...(title !== chapter.shortTitle ? [{ label: title }] : []),
    ]} />
    <div className="guided-lab-heading">
      <div className="guided-lab-title">
        <h1>{title}</h1>
        <p>{chapter.description}</p>
      </div>
      <div className="guided-lab-controls" aria-label="Lab controls">
        <div className="guided-lab-progress">
          <div><span>Progress</span><strong>0 / 4</strong></div>
          <ProgressBar value={0} total={4} label="Lab checkpoints completed" />
        </div>
        <Button onClick={() => setReferenceOpen(true)}>SQL &amp; Objectives</Button>
        <Button disabled title="This lab is to be done">Reset</Button>
        <Button disabled title="This lab is to be done"><Play size={13} fill="currentColor" aria-hidden="true" />Run</Button>
        <Button variant="primary" disabled title="This lab is to be done"><Play size={13} fill="currentColor" aria-hidden="true" />Start guided run</Button>
      </div>
    </div>
    <section className="guided-lab-canvas" aria-label={regionLabel}><p>To be done</p></section>
    {children && <div className="guided-lab-page-navigation">{children}</div>}
    <aside className="guided-lab-tip" aria-label="Lab tip">
      <Lightbulb size={27} aria-hidden="true" />
      <strong>Tip</strong>
      <p>Use the SQL &amp; Objectives panel to see what to build, or start a guided run to step through the scenario.</p>
      <button type="button" onClick={() => setReferenceOpen(true)}>Open SQL &amp; Objectives<ArrowRight size={16} aria-hidden="true" /></button>
    </aside>
    <SqlObjectivesPanel open={referenceOpen} onClose={() => setReferenceOpen(false)}
      objective={<>
        <p>{chapter.description}</p>
        <nav className="guided-lab-reference-links" aria-label="Lab sections">
          {getChapterSections(chapter).map(section => <Link key={section.slug} to={chapterSectionPath(chapter, section.slug)}>{section.title}<ArrowRight size={16} aria-hidden="true" /></Link>)}
        </nav>
      </>}
      documentationLinks={[{ label: 'Materialize documentation', href: DOCUMENTATION_URL }]} />
  </section>;
}
