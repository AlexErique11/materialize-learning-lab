import { initialConfiguration, repairedPredicate, traceTimes, workspaces, type Configuration, type Workspace } from './incident';
import type { ReadAttempt } from '../../chapters/consistent-reads/simulation';
import { parsePredicate } from './predicate';

export interface Check { id: string; label: string; passed: boolean; detail: string }
interface Change { label: string; time: number; configuration: number }
export type SettingsGroup = 'source' | 'serving' | 'client';
export const settingsKeys = { source: ['source'], serving: ['helper', 'final', 'indexes'], client: ['publication', 'snapshot'] } as const;
export const pendingSettings = (run: ChallengeRun, group: SettingsGroup) => settingsKeys[group].some(key => JSON.stringify(run.settings[key]) !== JSON.stringify(run.config[key]));
export interface Inspection { data: 'orders' | 'messages' | 'customers'; order: string; comparison: 'both' | 'database' | 'application'; fallback: boolean }
export interface ChallengeRun {
  scenarioVersion: 2; id: string; revision: number; configurationRevision: number; queryRevision: number;
  settings: Configuration; inspection: Inspection; feedback: string;
  phase: 'briefing' | 'investigating' | 'handover' | 'completed'; workspace: Workspace;
  config: Configuration; draft: string; diagnostic: string; time: number; frame: number;
  processed: boolean; processedTime: number; deliveries: number; read: ReadAttempt | null;
  changes: Change[]; undo: Configuration[];
  hints: Partial<Record<Workspace, number>>; worked: Workspace[];
  note: string; validation: { configuration: number; checks: Check[] } | null; activeDurationMs: number;
}
export type RunAction =
  | { type: 'start' | 'investigate' | 'process' | 'advance' | 'replay-client' | 'undo' | 'handover' | 'complete' }
  | { type: 'stage'; key: keyof Configuration; value: string | boolean | Configuration['source'] }
  | { type: 'apply-settings' | 'discard-settings'; group: SettingsGroup }
  | { type: 'inspect'; key: keyof Inspection; value: string | boolean }
  | { type: 'delivery'; timestamp: number }
  | { type: 'workspace'; workspace: Workspace } | { type: 'frame'; frame: number }
  | { type: 'draft' | 'diagnostic' | 'note'; value: string }
  | { type: 'deploy'; predicate: string; runId: string; configuration: number }
  | { type: 'configure'; key: Exclude<keyof Configuration, 'predicate' | 'source'>; value: string | boolean }
  | { type: 'source'; key: 'envelope' | 'key'; value: string }
  | { type: 'read'; attempt: ReadAttempt }
  | { type: 'hint' | 'worked'; workspace: Workspace }
  | { type: 'validation'; runId: string; configuration: number; checks: Check[] }
  | { type: 'time'; milliseconds: number };
export function createRun(id: string): ChallengeRun {
  return { scenarioVersion: 2, id, revision: 0, configurationRevision: 0, queryRevision: 0, settings: initialConfiguration(), inspection: { data: 'orders', order: '', comparison: 'both', fallback: false }, feedback: '', phase: 'briefing', workspace: 'Dashboard',
    config: initialConfiguration(), draft: initialConfiguration().predicate, diagnostic: 'SELECT order_id, status, amount, event_at, arrived_at FROM orders ORDER BY order_id;',
    time: 630000, frame: 10, processed: false, processedTime: 622999, deliveries: 0, read: null, changes: [], undo: [], hints: {}, worked: [], note: '', validation: null, activeDurationMs: 0 };
}
export const assistedRun = (run: ChallengeRun) => run.worked.length > 0;
export const minimumExplanationLength = 20;
const checkIds = ['query', 'source', 'service', 'client', 'objects'];
export const readyForHandover = (run: ChallengeRun) => Boolean(run.validation?.configuration === run.configurationRevision && run.validation.checks.length === 5 && checkIds.every(id => run.validation!.checks.filter(check => check.id === id && check.passed).length === 1));
export function updateRun(run: ChallengeRun, action: RunAction): ChallengeRun {
  const revise = (patch: Partial<ChallengeRun>) => ({ ...run, ...patch, revision: run.revision + 1 });
  const change = (config: Configuration, label: string) => {
    const query = config.predicate !== run.config.predicate;
    const source = JSON.stringify(config.source) !== JSON.stringify(run.config.source);
    const connection = config.connected !== run.config.connected;
    const serving = ['helper', 'final', 'indexes'].some(key => config[key as keyof Configuration] !== run.config[key as keyof Configuration]);
    const client = config.publication !== run.config.publication || config.snapshot !== run.config.snapshot;
    const resetClient = query || source || client;
    const settings = { ...run.settings };
    // Keep unrelated pending edits; clean fields follow applied changes and undo.
    for (const key of Object.keys(config) as (keyof Configuration)[]) {
      if (JSON.stringify(run.settings[key]) === JSON.stringify(run.config[key])) Object.assign(settings, { [key]: config[key] });
    }
    const effect = [query || source ? 'Database results recomputed; last read cleared.' : connection || serving ? 'Last read cleared.' : '', resetClient ? 'Client deliveries reset to 0.' : '', connection ? config.connected ? 'Connection running; process pending updates to catch up. The last complete snapshot is preserved.' : 'Connection paused; input progress stops. The last complete snapshot and client deliveries are preserved.' : ''].filter(Boolean).join(' ');
    return revise({ config, settings, feedback: label + '. ' + effect,
      queryRevision: run.queryRevision + Number(query),
      configurationRevision: run.configurationRevision + 1, validation: null, phase: 'investigating',
      deliveries: resetClient ? 0 : run.deliveries,
      read: query || source || connection || serving ? null : run.read,
      processed: connection ? false : run.processed, processedTime: run.processedTime,
      undo: [...run.undo, run.config].slice(-10),
      changes: [...run.changes, { label, time: run.time, configuration: run.configurationRevision + 1 }].slice(-60) });
  };
  if (action.type === 'time') return run.phase === 'investigating' && Number.isFinite(action.milliseconds) && action.milliseconds > 0 && action.milliseconds <= 60000 ? revise({ activeDurationMs: run.activeDurationMs + action.milliseconds }) : run;
  if (action.type === 'start') return run.phase === 'briefing' ? revise({ phase: 'investigating' }) : run;
  if (action.type === 'workspace') return workspaces.includes(action.workspace) ? revise({ workspace: action.workspace }) : run;
  if (action.type === 'note' || action.type === 'diagnostic' || action.type === 'draft') return action.value.length <= (action.type === 'note' ? 4000 : 12000) ? revise({ [action.type]: action.value, ...(action.type === 'note' && run.phase === 'completed' ? { phase: 'handover' as const } : {}) }) : run;
  if (run.phase === 'briefing') return run;
  switch (action.type) {
    case 'investigate': return revise({ phase: 'investigating' });
    case 'frame': return Number.isInteger(action.frame) && action.frame >= 0 && action.frame < traceTimes.length ? revise({ frame: action.frame }) : run;
    case 'stage': {
      const settings = { ...run.settings, [action.key]: action.value };
      return configuration(settings) && settings.predicate === run.config.predicate && settings.connected === run.config.connected && settings.fallback === run.config.fallback ? revise({ settings }) : run;
    }
    case 'apply-settings': {
      if (!settingsKeys[action.group] || !pendingSettings(run, action.group)) return run;
      const config = { ...run.config };
      for (const key of settingsKeys[action.group]) Object.assign(config, { [key]: run.settings[key] });
      const next = change(config, action.group === 'source' ? 'Applied source settings; retained messages rebuilt' : action.group === 'serving' ? 'Applied serving settings' : 'Applied client settings');
      return { ...next, settings: { ...next.settings, ...Object.fromEntries(settingsKeys[action.group].map(key => [key, config[key]])) } };
    }
    case 'discard-settings': return settingsKeys[action.group] ? revise({ settings: { ...run.settings, ...Object.fromEntries(settingsKeys[action.group].map(key => [key, run.config[key]])) } }) : run;
    case 'inspect': {
      const inspection = { ...run.inspection, [action.key]: action.value };
      return validInspection(inspection) ? revise({ inspection }) : run;
    }
    case 'process': return run.config.connected && !run.processed ? revise({ processed: true, processedTime: run.time, read: null, validation: null, phase: 'investigating', feedback: 'Pending updates processed. Database and serving frontiers now follow the connected inputs. Request a new read to verify freshness. Client deliveries are unchanged.', changes: [...run.changes, { label: 'Processed pending updates', time: run.time, configuration: run.configurationRevision }].slice(-60) }) : run;
    case 'advance': {
      const time = Math.max(run.time, run.time < 631000 ? 631000 : 632000);
      return time === run.time ? run : revise({ time, processed: false, validation: null, phase: 'investigating', feedback: time === 631000 ? 'Incident advanced to 631 s: subscription baseline is available. No order values changed. Process pending updates in System when connected.' : 'Incident advanced to 632 s: order 101 changed from 70 to 90. The database stays at its previous complete snapshot until pending updates are processed. Client deliveries are unchanged.' });
    }
    case 'deploy': {
      if (action.runId !== run.id || action.configuration !== run.configurationRevision || action.predicate !== run.draft) return run;
      try { parsePredicate(action.predicate); return change({ ...run.config, predicate: action.predicate }, 'Applied SQL query'); } catch { return run; }
    }
    case 'configure': {
      const allowed: Record<string, readonly unknown[]> = { connected: [true, false], helper: ['view', 'materialized'], final: ['view', 'materialized'], indexes: ['both', 'operations', 'none'], publication: ['each', 'equal', 'complete'], snapshot: [true, false], fallback: [true, false] };
      if (!allowed[action.key]?.includes(action.value) || run.config[action.key] === action.value) return run;
      return change({ ...run.config, [action.key]: action.value }, `Changed ${action.key} to ${action.value}`);
    }
    case 'source': {
      if (!(action.key === 'envelope' ? ['UPSERT', 'NONE'] : ['order_id', 'customer_id']).includes(action.value)) return run;
      return change({ ...run.config, source: { ...run.config.source, [action.key]: action.value } }, 'Rebuilt simulated source from retained keyed records');
    }
    case 'read': return revise({ read: action.attempt, validation: null, phase: 'investigating', feedback: `Read requested: ${action.attempt.status}. This is a saved outcome at the request time; request again after changing the system.` });
    case 'delivery': return run.config.connected && run.processed && [631000, 631001, 632000, 632001].includes(action.timestamp) ? revise({ deliveries: Math.min(8, run.deliveries + 1), time: Math.max(run.time, action.timestamp), processedTime: Math.max(run.time, action.timestamp), validation: null, phase: 'investigating', feedback: `Received delivery ${Math.min(8, run.deliveries + 1)} at ${(action.timestamp / 1000).toFixed(3)} s. ${action.timestamp > run.time ? 'The shared incident clock advanced to this timestamp.' : 'The shared incident clock is unchanged.'} Check pending changes, progress, and the visible application result.` }) : run;
    case 'replay-client': return revise({ deliveries: 0, feedback: 'Client deliveries reset to 0. Applied settings, database reads, and incident time are preserved.' });
    case 'undo': {
      const previous = run.undo.at(-1);
      if (!previous) return run;
      const next = change(previous, 'Undid last configuration change; incident time preserved');
      return { ...next, draft: previous.predicate !== run.config.predicate ? previous.predicate : run.draft, undo: run.undo.slice(0, -1) };
    }
    case 'hint': return revise({ hints: { ...run.hints, [action.workspace]: Math.min(3, (run.hints[action.workspace] ?? 0) + 1) } });
    case 'worked': {
      const worked = [...new Set([...run.worked, action.workspace])];
      if (action.workspace === 'SQL') return revise({ draft: repairedPredicate, worked });
      if (action.workspace === 'System') return { ...change({ ...run.config, connected: true }, 'Worked intervention: resumed customer connection'), worked };
      if (action.workspace === 'Client') return { ...change({ ...run.config, publication: 'complete', snapshot: true }, 'Worked intervention: complete timestamp publication'), worked };
      return revise({ worked, hints: { ...run.hints, [action.workspace]: 3 } });
    }
    case 'validation': return action.runId === run.id && action.configuration === run.configurationRevision ? revise({ validation: { configuration: action.configuration, checks: action.checks }, ...(run.phase === 'completed' && action.checks.some(check => !check.passed) ? { phase: 'handover' as const } : {}) }) : run;
    case 'handover': return revise({ phase: 'handover' });
    case 'complete': return run.phase === 'handover' && readyForHandover(run) && run.note.trim().length >= minimumExplanationLength ? revise({ phase: 'completed' }) : run;
  }
}
function configuration(value: unknown): value is Configuration {
  if (!value || typeof value !== 'object') return false;
  const c = value as Configuration;
  if (typeof c.predicate !== 'string' || !c.source || !['UPSERT', 'NONE'].includes(c.source.envelope) || !['order_id', 'customer_id'].includes(c.source.key) || typeof c.connected !== 'boolean' || typeof c.snapshot !== 'boolean' || typeof c.fallback !== 'boolean' || !['view', 'materialized'].includes(c.helper) || !['view', 'materialized'].includes(c.final) || !['both', 'operations', 'none'].includes(c.indexes) || !['each', 'equal', 'complete'].includes(c.publication)) return false;
  try { parsePredicate(c.predicate); return true; } catch { return false; }
}
function validInspection(value: Inspection) {
  return value && ['orders', 'messages', 'customers'].includes(value.data) && typeof value.order === 'string' && value.order.length <= 100 && ['both', 'database', 'application'].includes(value.comparison) && typeof value.fallback === 'boolean';
}
export function parseRun(value: unknown): ChallengeRun | null {
  if (!value || typeof value !== 'object') return null;
  const r = { ...value } as ChallengeRun;
  // Existing V2 investigations gain clean drafts without losing their applied state.
  if (r.settings === undefined) r.settings = r.config ? { ...r.config, source: { ...r.config.source } } : r.config;
  if (r.queryRevision === undefined) r.queryRevision = 0;
  if (r.processedTime === undefined) r.processedTime = r.processed ? r.time : 622999;
  if (r.inspection === undefined) r.inspection = { data: 'orders', order: '', comparison: 'both', fallback: false };
  if (r.feedback === undefined) r.feedback = '';
  // Older V2 saves may contain notebook snapshots; keep the investigation and discard those snapshots.
  delete (r as ChallengeRun & { observations?: unknown }).observations;
  const integer = (v: unknown, max: number) => Number.isSafeInteger(v) && Number(v) >= 0 && Number(v) <= max;
  if (r.scenarioVersion !== 2 || typeof r.id !== 'string' || !r.id || r.id.length > 100 || !integer(r.revision, 100000000) || !integer(r.configurationRevision, r.revision) || !['briefing', 'investigating', 'handover', 'completed'].includes(r.phase) || !workspaces.includes(r.workspace) || !configuration(r.config) || typeof r.draft !== 'string' || r.draft.length > 12000 || typeof r.diagnostic !== 'string' || r.diagnostic.length > 12000 || typeof r.note !== 'string' || r.note.length > 4000 || ![630000, 631000, 631001, 632000, 632001].includes(r.time) || !integer(r.frame, traceTimes.length - 1) || !integer(r.deliveries, 8) || typeof r.processed !== 'boolean' || !integer(r.activeDurationMs, 31536000000)) return null;
  if (![622999, 630000, 631000, 631001, 632000, 632001].includes(r.processedTime) || r.processedTime > r.time || (r.processed && r.processedTime !== r.time) || !configuration(r.settings) || r.settings.predicate !== r.config.predicate || r.settings.connected !== r.config.connected || r.settings.fallback !== r.config.fallback || !integer(r.queryRevision, r.configurationRevision) || !validInspection(r.inspection) || typeof r.feedback !== 'string' || r.feedback.length > 1000) return null;
  if (!Array.isArray(r.changes) || r.changes.length > 60 || !r.changes.every(c => c && typeof c.label === 'string' && c.label.length <= 200 && integer(c.time, 1000000) && integer(c.configuration, r.configurationRevision)) || !Array.isArray(r.undo) || r.undo.length > 10 || !r.undo.every(configuration)) return null;
  if (!r.hints || typeof r.hints !== 'object' || !Object.entries(r.hints).every(([key, count]) => workspaces.includes(key as Workspace) && integer(count, 3)) || !Array.isArray(r.worked) || r.worked.length > 5 || !r.worked.every(w => workspaces.includes(w))) return null;
  if (r.read !== null && (!r.read || !['available', 'waiting', 'too-old', 'stale'].includes(r.read.status) || r.read.policy !== 'bounded' || !integer(r.read.timestamp, 1000000) || ![3000, 10000].includes(r.read.bound!) || typeof r.read.rowVisible !== 'boolean')) return null;
  if (r.validation !== null && (!r.validation || r.validation.configuration !== r.configurationRevision || !Array.isArray(r.validation.checks) || r.validation.checks.length !== 5 || !checkIds.every(id => r.validation!.checks.filter(c => c?.id === id).length === 1) || !r.validation.checks.every(c => c && typeof c.id === 'string' && typeof c.label === 'string' && typeof c.detail === 'string' && c.detail.length <= 5000 && typeof c.passed === 'boolean'))) return null;
  if (r.phase === 'completed' && (!readyForHandover(r) || r.note.trim().length < minimumExplanationLength)) return null;
  r.changes = r.changes.map(change => change.label === 'Applied regional query' ? { ...change, label: 'Applied SQL query' } : change);
  r.feedback = r.feedback.replace(/^Applied regional query\./, 'Applied SQL query.');
  return r;
}
