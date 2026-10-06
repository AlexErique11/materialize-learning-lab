import { Button } from '../ui/Button';
import type { ReactNode } from 'react';

// Narrow workspaces display one complete panel instead of stacking tables below the viewport.
export function PanelTabs({ value, onChange, disabled = false, children }: {
  value?: 'ledger' | 'relation'; onChange: (value: 'ledger' | 'relation') => void; disabled?: boolean; children?: ReactNode;
}) {
  return <nav className="workspace-panel-tabs" aria-label="Workspace panels">
    <Button aria-pressed={value === 'ledger'} disabled={disabled} onClick={() => onChange('ledger')}>Change ledger</Button>
    <Button aria-pressed={value === 'relation'} disabled={disabled} onClick={() => onChange('relation')}>Current relation</Button>
    {children}
  </nav>;
}
