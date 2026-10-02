import { Panel } from '../ui/Panel';
import { PanelHeader } from '../ui/PanelHeader';

export function ContentPlaceholder({ title }: { title: string }) {
  return (
    <Panel className="content-placeholder" aria-label={title}>
      <PanelHeader title={title} />
      <div className="content-placeholder-body" aria-hidden="true" />
    </Panel>
  );
}
