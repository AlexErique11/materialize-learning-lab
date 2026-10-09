import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Dialog } from '../ui/Dialog';

interface SqlObjectivesPanelProps {
  open: boolean;
  onClose: () => void;
  objective?: ReactNode;
  sql?: string;
  documentationLinks?: readonly { label: string; href: string }[];
}

export function SqlObjectivesPanel({
  open,
  onClose,
  objective,
  sql,
  documentationLinks = [],
}: SqlObjectivesPanelProps) {
  return (
    <Dialog open={open} onClose={onClose} title="SQL & Objectives" eyebrow="Lab reference">
      <div className="space-y-7">
        <section>
          <h3 className="reference-title">Learning objective</h3>
          <div className="text-sm leading-relaxed text-text-muted">
            {objective ?? <div className="reserved-reference-line" aria-hidden="true" />}
          </div>
        </section>
        <section>
          <h3 className="reference-title">SQL reference</h3>
          {sql ? (
            <pre className="sql-reference">
              <code>{sql}</code>
            </pre>
          ) : (
            <div className="reserved-sql-reference" aria-hidden="true" />
          )}
        </section>
        <section>
          <h3 className="reference-title">Documentation</h3>
          {documentationLinks.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {documentationLinks.map((link) => (
                <li key={link.href}>
                  <a className="text-link inline-flex items-center gap-1" href={link.href} target="_blank" rel="noopener noreferrer">
                    {link.label}
                    <ArrowUpRight size={14} aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <div className="reserved-reference-line" aria-hidden="true" />
          )}
        </section>
      </div>
    </Dialog>
  );
}
