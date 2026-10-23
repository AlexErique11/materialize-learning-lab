import { Link } from 'react-router';
import { AppHeader } from '../components/layout/AppHeader';
import { PageContainer } from '../components/layout/PageContainer';
import { PageHeader } from '../components/layout/PageHeader';

export function RouteErrorPage() {
  return (
    <>
      <AppHeader />
      <main>
        <PageContainer>
          <PageHeader
            title="Something went wrong"
            description="The page couldn’t be loaded. Reload the learning path to try again."
          />
          <Link to="/" reloadDocument className="button button-primary">
            Reload learning path
          </Link>
        </PageContainer>
      </main>
    </>
  );
}
