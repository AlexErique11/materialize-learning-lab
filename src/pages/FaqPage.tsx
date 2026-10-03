import { Link } from 'react-router';
import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import { PageContainer } from '../components/layout/PageContainer';
import { PageHeader } from '../components/layout/PageHeader';

export function FaqPage() {
  return (
    <PageContainer>
      <Breadcrumbs items={[{ label: 'Learning path', to: '/' }, { label: 'FAQ' }]} />
      <PageHeader title="FAQ" description="Common questions about labs and challenges." />
      <section className="learning-path-faq" aria-label="Frequently asked questions">
        <details>
          <summary>Where should I start?</summary>
          <p>Start with <Link to="/labs">Guided labs</Link>. The twelve core chapters follow a learning sequence, with an optional advanced chapter after them.</p>
        </details>
        <details>
          <summary>What is the difference between labs and challenges?</summary>
          <p>Guided labs introduce concepts through tutorials and exercises. <Link to="/challenges">Challenges</Link> combine those concepts in capstone projects. The challenge library includes all three capstones.</p>
        </details>
        <details>
          <summary>Is my progress saved?</summary>
          <p>This version provides the course structure. Exercises and completion tracking are still being built, so progress starts at zero.</p>
        </details>
      </section>
    </PageContainer>
  );
}
