import { Link } from 'react-router';
import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import { PageContainer } from '../components/layout/PageContainer';
import { PageHeader } from '../components/layout/PageHeader';
import { challenge } from '../challenges/challengeRegistry';

export function FaqPage() {
  return (
    <PageContainer>
      <Breadcrumbs items={[{ label: 'Learning path', to: '/' }, { label: 'FAQ' }]} />
      <PageHeader title="FAQ" description="Common questions about the labs and challenge." />
      <section className="learning-path-faq" aria-label="Frequently asked questions">
        <details>
          <summary>Where should I start?</summary>
          <p>Start with <Link to="/labs">Guided labs</Link>. The eight chapters follow a learning sequence.</p>
        </details>
        <details>
          <summary>What is the difference between the labs and challenge?</summary>
          <p>Guided labs introduce concepts through tutorials and exercises. <Link to={challenge.path}>Challenge</Link> opens Live Order Operations directly: a 10–20 minute investigation combining Chapters 1–8, with freely accessible workspaces, executable SQL, and its own progress. Chapter completion is recommended, not required.</p>
        </details>
        <details>
          <summary>Is my progress saved?</summary>
          <p>Completed tutorials and exercises are saved in this browser. Your Guided labs and Learning path progress bars count eight core chapters: finish all tutorials and exercises in a chapter to earn one completion. Completed activities stay marked when you return or reset a practice session. Individual chapter answers and playback positions restart when you revisit an activity. The challenge saves its selected workspace, SQL drafts, deployed changes, replay position, pinned evidence, notes, and achievements separately. Returning resumes directly. SQL queries execute locally; Materialize streaming and progress use the browser simulation. First-version completions remain historical and do not complete the investigation. Hints are recorded; worked repairs produce a “Completed with walkthrough” achievement. Restarting an incident preserves earlier achievements and chapter progress. If browser storage is unavailable, the challenge clearly reports that it can save for the current session only.</p>
        </details>
      </section>
    </PageContainer>
  );
}
