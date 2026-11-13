import { objectCost, ordersAt, type Configuration } from './incident';
import type { ChallengeRun } from './run';

export interface RepairComparison {
  label: string;
  before: string | number;
  after: string | number;
}

export interface WorkedRepairStep {
  target: string;
  title: string;
  description: string;
  comparisons?: RepairComparison[];
}

const viewLabel = (view: Configuration['helper']) => view === 'view' ? 'Regular view' : 'Materialized view';
const indexLabels = { none: 'None', operations: 'Operations only', both: 'Operations and support' };
const publicationLabels = {
  each: 'Every received record',
  equal: 'Progress reaches timestamp',
  complete: 'Progress strictly beyond timestamp',
};

export const rebuiltOrderExample = 101;

export function workedRepairSteps(before: ChallengeRun, after: ChallengeRun): WorkedRepairStep[] {
  const steps: WorkedRepairStep[] = [];
  const previous = before.config;
  const applied = after.config;

  switch (after.workspace) {
    case 'Data': {
      const comparisons = [
        { label: 'Order envelope', before: previous.source.envelope, after: applied.source.envelope },
        { label: 'Order identity', before: previous.source.key, after: applied.source.key },
      ].filter(change => change.before !== change.after);
      if (comparisons.length) {
        steps.push({
          target: 'source-settings', title: 'Apply keyed replacements',
          description: 'UPSERT keeps the latest full value for each order ID. When a correction arrives, it replaces the older version of that order.',
          comparisons,
        });
        const oldRows = ordersAt(before.time, previous.source);
        const newRows = ordersAt(after.time, applied.source);
        steps.push({
          target: 'source-rows', title: 'Inspect the rebuilt orders',
          description: `Order ${rebuiltOrderExample} shows the latest value for its key. The row count covers the entire relation rebuilt from the retained messages at the same incident time.`,
          comparisons: [{ label: 'Current source rows', before: oldRows.length, after: newRows.length }]
            .filter(change => change.before !== change.after),
        });
      }
      break;
    }
    case 'SQL':
      steps.push({
        target: 'sql-draft',
        title: before.draft === after.draft ? 'The worked draft is already in the editor' : 'Use event time in the SQL draft',
        description: 'The draft uses the order’s event time for both entry and the exclusive five-minute expiry. The deployed query is unchanged.',
      }, {
        target: after.frame === null ? 'sql-snapshot' : 'sql-preview', title: 'Preview before applying',
        description: [
          after.frame === null ? 'Choose a scenario replay snapshot, then run the query preview.' : 'Run the query preview at the selected snapshot.',
          after.draft === applied.predicate
            ? 'This draft already matches the deployed query.'
            : 'Review the returned rows before using Apply query to deploy the draft.',
        ].join(' '),
      });
      break;
    case 'System': {
      if (previous.connected !== applied.connected) {
        steps.push({
          target: 'connection', title: 'Resume the customer connection',
          description: 'Customer input can make progress again. The last complete result is preserved until you use Process pending updates.',
          comparisons: [{ label: 'Customer connection', before: 'Paused', after: 'Running' }],
        });
      }
      const comparisons = [
        { label: 'Recent-orders helper', before: viewLabel(previous.helper), after: viewLabel(applied.helper) },
        { label: 'Regional totals', before: viewLabel(previous.final), after: viewLabel(applied.final) },
        { label: 'Local indexes', before: indexLabels[previous.indexes], after: indexLabels[applied.indexes] },
        { label: 'State units', before: objectCost(previous), after: objectCost(applied) },
      ].filter(change => change.before !== change.after);
      if (comparisons.length) {
        steps.push({
          target: 'serving-design', title: 'Inspect the applied serving design',
          description: 'A regular helper view avoids extra maintained state. Operations and support each get a local index on one shared materialized result, within the eight-unit budget.',
          comparisons,
        });
      }
      break;
    }
    case 'Client': {
      const comparisons = [
        { label: 'Publication', before: publicationLabels[previous.publication], after: publicationLabels[applied.publication] },
        { label: 'Coordinated snapshot', before: previous.snapshot ? 'On' : 'Off', after: applied.snapshot ? 'On' : 'Off' },
      ].filter(change => change.before !== change.after);
      if (comparisons.length) {
        steps.push({
          target: 'publication', title: 'Publish only complete timestamps',
          description: 'The coordinated snapshot gives the client a starting result. Subsequent changes are buffered until progress is strictly beyond their timestamp.',
          comparisons,
        });
      }
      break;
    }
  }

  if (before.deliveries !== after.deliveries) {
    steps.push({
      target: after.workspace === 'Client' ? 'received-deliveries' : 'feedback',
      title: 'Start a fresh delivery replay',
      description: 'The repair reset the client’s delivery position. Receive deliveries again in Client to see the application rebuild its result.',
      comparisons: [{ label: 'Deliveries received', before: before.deliveries, after: after.deliveries }],
    });
  }
  if (before.read && !after.read) {
    steps.push({
      target: after.workspace === 'System' ? 'snapshot-request' : 'feedback',
      title: 'Request a new snapshot',
      description: 'The previous snapshot request was cleared. Use System to request a fresh read against the repaired configuration.',
    });
  }
  if (!steps.length) {
    steps.push({
      target: 'feedback', title: 'The worked settings are already applied',
      description: 'This repair left the applied settings unchanged. You can continue investigating from here.',
    });
  }
  return steps;
}
