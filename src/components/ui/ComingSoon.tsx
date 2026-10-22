import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';

export function ComingSoon({ description, to, action }: { description: string; to: string; action: string }) {
  return <section className="space-y-4 rounded-md border border-border bg-surface p-6" aria-label="Coming soon">
    <h2 className="text-xl font-semibold">Coming soon</h2>
    <p className="text-text-muted">{description}</p>
    <Link className="button button-secondary" to={to}>{action}<ArrowRight size={16} aria-hidden="true" /></Link>
  </section>;
}
