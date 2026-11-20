import { requestRead } from './incident';
import { updateRun, type ChallengeRun, type RunAction } from './run';

export interface RepairReplayAction {
  target: string;
  label: string;
  run: ChallengeRun;
}

export interface RepairReplay {
  before: ChallengeRun;
  actions: RepairReplayAction[];
}

export function workedRepairReplays(before: ChallengeRun, after: ChallengeRun) {
  const replays: Record<string, RepairReplay> = {};
  let run = before;
  let replay: RepairReplay;
  const begin = (target: string) => { replay = replays[target] = { before: run, actions: [] }; };
  const act = (target: string, label: string, action: RunAction) => {
    const next = updateRun(run, action);
    if (next === run) return;
    run = next;
    replay.actions.push({ target, label, run });
  };
  const { config } = after;

  switch (after.workspace) {
    case 'Data':
      if (before.config.source.envelope !== config.source.envelope || before.config.source.key !== config.source.key) {
        begin('source-settings');
        if (run.settings.source.envelope !== config.source.envelope) act('source-envelope', `Set order envelope to ${config.source.envelope}`, { type: 'stage', key: 'source', value: { ...run.settings.source, envelope: config.source.envelope } });
        if (run.settings.source.key !== config.source.key) act('source-key', `Set order identity to ${config.source.key}`, { type: 'stage', key: 'source', value: config.source });
        act('apply-source', 'Apply the source settings', { type: 'apply-settings', group: 'source' });
      }
      break;
    case 'SQL':
      if (before.draft !== after.draft || before.config.predicate !== config.predicate) {
        begin('sql-draft');
        if (run.draft !== after.draft) act('sql-editor', 'Enter the event-time predicate', { type: 'draft', value: after.draft });
        if (before.config.predicate !== config.predicate) act('sql-apply', 'Apply the event-time query', { type: 'deploy', runId: run.id, configuration: run.configurationRevision, predicate: run.draft });
      }
      break;
    case 'System':
      if (before.config.connected !== config.connected) {
        begin('connection');
        act('resume-connection', 'Resume the customer connection', { type: 'configure', key: 'connected', value: config.connected });
      }
      if (before.config.helper !== config.helper || before.config.final !== config.final || before.config.indexes !== config.indexes) {
        begin('serving-design');
        if (run.settings.helper !== config.helper) act('serving-helper', 'Use a regular view for recent orders', { type: 'stage', key: 'helper', value: config.helper });
        if (run.settings.final !== config.final) act('serving-result', 'Materialize the shared regional totals', { type: 'stage', key: 'final', value: config.final });
        if (run.settings.indexes !== config.indexes) act('serving-indexes', 'Add local indexes for operations and support', { type: 'stage', key: 'indexes', value: config.indexes });
        act('apply-serving', 'Apply the serving settings', { type: 'apply-settings', group: 'serving' });
      }
      if (!run.processed && after.processed) {
        begin('processing');
        act('process-updates', 'Process pending updates', { type: 'process' });
      }
      if (before.read !== after.read && after.read?.status === 'available' && after.read.bound === 3000) {
        begin('snapshot-request');
        act('normal-read', 'Request a three-second normal read', { type: 'read', attempt: requestRead(run.config, run.time, run.processed ? run.time : run.processedTime) });
      }
      break;
    case 'Client':
      if (before.config.snapshot !== config.snapshot || before.config.publication !== config.publication) {
        begin(before.config.snapshot !== config.snapshot ? 'coordinated-snapshot' : 'publication');
        if (run.settings.snapshot !== config.snapshot) act('client-snapshot', 'Enable the coordinated snapshot', { type: 'stage', key: 'snapshot', value: config.snapshot });
        if (run.settings.publication !== config.publication) act('client-publication', 'Publish only after progress passes the timestamp', { type: 'stage', key: 'publication', value: config.publication });
        act('apply-client', 'Apply the client settings', { type: 'apply-settings', group: 'client' });
      }
      break;
  }
  return replays;
}
