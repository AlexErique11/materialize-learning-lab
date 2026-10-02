import { ArrowLeft, Compass } from 'lucide-react';
import { Link } from 'react-router';
import { PageContainer } from '../components/layout/PageContainer';
import { PageHeader } from '../components/layout/PageHeader';

interface NotFoundPageProps {
  title?: string;
  description?: string;
}

export function NotFoundPage({
  title = 'Page not found',
  description = 'This location isn’t part of the learning path. Let’s get you back to familiar ground.',
}: NotFoundPageProps) {
  return (
    <PageContainer className="not-found-page">
      <Compass size={36} className="mb-7 text-accent" aria-hidden="true" />
      <PageHeader
        title={title}
        description={description}
        eyebrow={<span className="eyebrow">404</span>}
      />
      <div className="flex flex-wrap gap-3">
        <Link to="/" className="button button-primary">
          <ArrowLeft size={16} aria-hidden="true" />
          Learning path
        </Link>
        <Link to="/labs" className="button button-secondary">
          Browse guided labs
        </Link>
      </div>
    </PageContainer>
  );
}
