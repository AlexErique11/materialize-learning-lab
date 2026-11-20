import { objectCost, ordersAt, type Configuration } from './incident';
import type { ChallengeRun } from './run';
import { formatTime } from './simulation';

export interface RepairComparison {
  label: string;
  before: string | number;
  after: string | number;
  code?: boolean;
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
          comparisons: [
            { label: `Versions of order ${rebuiltOrderExample}`, before: oldRows.filter(row => row.orderId === rebuiltOrderExample).length, after: newRows.filter(row => row.orderId === rebuiltOrderExample).length },
            { label: 'Current source rows', before: oldRows.length, after: newRows.length },
          ]
            .filter(change => change.before !== change.after),
        });
      }
      break;
    }
    case 'SQL':
      if (previous.predicate !== applied.predicate || before.draft !== after.draft) {
        steps.push({
          target: 'sql-draft',
          title: 'Apply the event-time query',
          description: 'The deployed query now uses the order’s event time for entry and the exclusive five-minute expiry. The editor shows the applied predicate.',
          comparisons: [
            { label: 'Deployed WHERE predicate', before: previous.predicate, after: applied.predicate, code: true },
            { label: 'Deployed query version', before: before.queryRevision + 1, after: after.queryRevision + 1 },
          ]
            .filter(change => change.before !== change.after),
        });
      }
      break;
    case 'System': {
      if (previous.connected !== applied.connected) {
        steps.push({
          target: 'connection', title: 'Resume the customer connection',
          description: 'Customer input can make progress again, allowing pending updates to reach the serving result.',
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
      if (before.processedTime !== after.processedTime || !before.processed && after.processed) {
        steps.push({
          target: 'processing', title: 'Process pending updates',
          description: `The serving result has caught up to the incident time of ${formatTime(after.processedTime)}.`,
          comparisons: [{ label: 'Processed through', before: formatTime(before.processedTime), after: formatTime(after.processedTime) }]
            .filter(change => change.before !== change.after),
        });
      }
      break;
    }
    case 'Client': {
      if (previous.snapshot !== applied.snapshot) {
        steps.push({
          target: 'coordinated-snapshot', title: 'Initialize with a coordinated snapshot',
          description: 'The snapshot supplies the rows already in the result when the subscription starts. Receive deliveries to see those rows appear once progress passes the snapshot timestamp.',
          comparisons: [{ label: 'Coordinated snapshot', before: previous.snapshot ? 'On' : 'Off', after: applied.snapshot ? 'On' : 'Off' }],
        });
      }
      if (previous.publication !== applied.publication) {
        steps.push({
          target: 'publication', title: 'Publish only complete timestamps',
          description: 'Buffer signed changes until progress is strictly beyond their timestamp, then publish the complete result.',
          comparisons: [{ label: 'Publication', before: publicationLabels[previous.publication], after: publicationLabels[applied.publication] }],
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
  if (after.read?.status === 'available' && after.read.bound === 3000 && before.read !== after.read) {
    steps.push({
      target: after.workspace === 'System' ? 'snapshot-request' : 'feedback',
      title: 'Verify the normal read',
      description: `The repair recorded a successful three-second normal read at snapshot ${formatTime(after.read.timestamp)}.`,
      comparisons: [{ label: 'Normal read', before: before.read?.status === 'available' && before.read.bound === 3000 ? formatTime(before.read.timestamp) : 'No successful normal read', after: formatTime(after.read.timestamp) }]
        .filter(change => change.before !== change.after),
    });
  } else if (before.read && !after.read) {
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
