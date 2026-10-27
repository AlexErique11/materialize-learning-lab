import { initialConfiguration, repairedPredicate, traceTimes, workspaces, type Configuration, type Workspace } from './incident';
import type { ReadAttempt } from '../../chapters/consistent-reads/simulation';
import { parsePredicate } from './predicate';

export interface Check { id: string; label: string; passed: boolean; detail: string }
export interface Observation { id: string; label: string; detail: string; time: number; configuration: number; workspace: Workspace }
interface Change { label: string; time: number; configuration: number }
export interface ChallengeRun {
  scenarioVersion: 2; id: string; revision: number; configurationRevision: number;
  phase: 'briefing' | 'investigating' | 'handover' | 'completed'; workspace: Workspace;
  config: Configuration; draft: string; diagnostic: string; time: number; frame: number;
  processed: boolean; deliveries: number; read: ReadAttempt | null;
  observations: Observation[]; changes: Change[]; undo: Configuration[];
  hints: Partial<Record<Workspace, number>>; worked: Workspace[];
  note: string; validation: { configuration: number; checks: Check[] } | null; activeDurationMs: number;
}
export type RunAction =
  | { type: 'start' | 'investigate' | 'advance' | 'replay-client' | 'undo' | 'handover' | 'complete' }
  | { type: 'delivery'; timestamp: number }
  | { type: 'workspace'; workspace: Workspace } | { type: 'frame'; frame: number }
  | { type: 'draft' | 'diagnostic' | 'note'; value: string }
  | { type: 'deploy'; predicate: string; runId: string; configuration: number }
  | { type: 'configure'; key: Exclude<keyof Configuration, 'predicate' | 'source'>; value: string | boolean }
  | { type: 'source'; key: 'envelope' | 'key'; value: string }
  | { type: 'read'; attempt: ReadAttempt }
  | { type: 'pin'; observation: Omit<Observation, 'id' | 'configuration' | 'workspace'> }
  | { type: 'unpin'; id: string }
  | { type: 'hint' | 'worked'; workspace: Workspace }
  | { type: 'validation'; runId: string; configuration: number; checks: Check[] }
  | { type: 'time'; milliseconds: number };
export function createRun(id: string): ChallengeRun {
  return { scenarioVersion: 2, id, revision: 0, configurationRevision: 0, phase: 'briefing', workspace: 'Dashboard',
    config: initialConfiguration(), draft: initialConfiguration().predicate, diagnostic: 'SELECT order_id, status, amount, event_at, arrived_at FROM orders ORDER BY order_id;',
    time: 630000, frame: 10, processed: false, deliveries: 0, read: null, observations: [], changes: [], undo: [], hints: {}, worked: [], note: '', validation: null, activeDurationMs: 0 };
}
export const assistedRun = (run: ChallengeRun) => run.worked.length > 0;
const checkIds = ['query', 'source', 'service', 'client', 'objects'];
export const readyForHandover = (run: ChallengeRun) => Boolean(run.validation?.configuration === run.configurationRevision && run.validation.checks.length === 5 && checkIds.every(id => run.validation!.checks.filter(check => check.id === id && check.passed).length === 1));
export const hasComparison = (run: ChallengeRun) => run.observations.some(a => run.observations.some(b => a.configuration !== b.configuration));
export function updateRun(run: ChallengeRun, action: RunAction): ChallengeRun {
  const revise = (patch: Partial<ChallengeRun>) => ({ ...run, ...patch, revision: run.revision + 1 });
  const change = (config: Configuration, label: string, resetRead = true, processed = run.processed) => revise({ config,
    configurationRevision: run.configurationRevision + 1, validation: null, phase: 'investigating', deliveries: 0,
    read: resetRead ? null : run.read, processed,
    undo: [...run.undo, run.config].slice(-10),
    changes: [...run.changes, { label, time: run.time, configuration: run.configurationRevision + 1 }].slice(-60) });
  if (action.type === 'time') return run.phase === 'investigating' && Number.isFinite(action.milliseconds) && action.milliseconds > 0 && action.milliseconds <= 60000 ? revise({ activeDurationMs: run.activeDurationMs + action.milliseconds }) : run;
  if (action.type === 'start') return run.phase === 'briefing' ? revise({ phase: 'investigating' }) : run;
  if (action.type === 'workspace') return workspaces.includes(action.workspace) ? revise({ workspace: action.workspace }) : run;
  if (action.type === 'note' || action.type === 'diagnostic' || action.type === 'draft') return action.value.length <= (action.type === 'note' ? 4000 : 12000) ? revise({ [action.type]: action.value, ...(action.type === 'note' && run.phase === 'completed' ? { phase: 'handover' as const } : {}) }) : run;
  if (run.phase === 'briefing') return run;
  switch (action.type) {
    case 'investigate': return revise({ phase: 'investigating' });
    case 'frame': return Number.isInteger(action.frame) && action.frame >= 0 && action.frame < traceTimes.length ? revise({ frame: action.frame }) : run;
    case 'advance': {
      if (run.config.connected && !run.processed) return revise({ processed: true, read: null, validation: null, phase: 'investigating', changes: [...run.changes, { label: 'Aggregate and serving processing advanced', time: run.time, configuration: run.configurationRevision }].slice(-60) });
      const time = Math.max(run.time, run.time === 630000 ? 631000 : 632000);
      return time === run.time ? run : revise({ time, validation: null, phase: 'investigating' });
    }
    case 'deploy': {
      if (action.runId !== run.id || action.configuration !== run.configurationRevision || action.predicate !== run.draft) return run;
      try { parsePredicate(action.predicate); return change({ ...run.config, predicate: action.predicate }, 'Deployed regional query; subscription reinitialized'); } catch { return run; }
    }
    case 'configure': {
      const allowed: Record<string, readonly unknown[]> = { connected: [true, false], helper: ['view', 'materialized'], final: ['view', 'materialized'], indexes: ['both', 'operations', 'none'], publication: ['each', 'equal', 'complete'], snapshot: [true, false], fallback: [true, false] };
      if (!allowed[action.key]?.includes(action.value) || run.config[action.key] === action.value) return run;
      return change({ ...run.config, [action.key]: action.value }, `Changed ${action.key} to ${action.value}`, !['publication', 'snapshot', 'fallback'].includes(action.key), action.key === 'connected' ? false : run.processed);
    }
    case 'source': {
      if (!(action.key === 'envelope' ? ['UPSERT', 'NONE'] : ['order_id', 'customer_id']).includes(action.value)) return run;
      return change({ ...run.config, source: { ...run.config.source, [action.key]: action.value } }, 'Rebuilt simulated source from retained keyed records');
    }
    case 'read': return revise({ read: action.attempt, validation: null, phase: 'investigating' });
    case 'delivery': return run.config.connected && run.processed && [631000, 631001, 632000, 632001].includes(action.timestamp) ? revise({ deliveries: Math.min(8, run.deliveries + 1), time: Math.max(run.time, action.timestamp), validation: null, phase: 'investigating' }) : run;
    case 'replay-client': return revise({ deliveries: 0 });
    case 'undo': {
      const previous = run.undo.at(-1);
      if (!previous) return run;
      const next = change(previous, 'Undid last configuration change', true, previous.connected && run.processed);
      return { ...next, draft: previous.predicate, undo: run.undo.slice(0, -1) };
    }
    case 'pin': return run.observations.length >= 30 || action.observation.detail.length > 5000 ? run : revise({ observations: [...run.observations, { ...action.observation, id: `${run.id}-${run.revision}`, configuration: run.configurationRevision, workspace: run.workspace }] });
    case 'unpin': return revise({ observations: run.observations.filter(item => item.id !== action.id) });
    case 'hint': return revise({ hints: { ...run.hints, [action.workspace]: Math.min(3, (run.hints[action.workspace] ?? 0) + 1) } });
    case 'worked': {
      const worked = [...new Set([...run.worked, action.workspace])];
      if (action.workspace === 'SQL') return revise({ draft: repairedPredicate, worked });
      if (action.workspace === 'System') return { ...change({ ...run.config, connected: true }, 'Worked intervention: resumed customer connection', true, false), worked };
      if (action.workspace === 'Client') return { ...change({ ...run.config, publication: 'complete', snapshot: true }, 'Worked intervention: complete timestamp publication', false), worked };
      return revise({ worked, hints: { ...run.hints, [action.workspace]: 3 } });
    }
    case 'validation': return action.runId === run.id && action.configuration === run.configurationRevision ? revise({ validation: { configuration: action.configuration, checks: action.checks }, ...(run.phase === 'completed' && action.checks.some(check => !check.passed) ? { phase: 'handover' as const } : {}) }) : run;
    case 'handover': return revise({ phase: 'handover' });
    case 'complete': return run.phase === 'handover' && readyForHandover(run) && hasComparison(run) && run.note.trim().length >= 20 ? revise({ phase: 'completed' }) : run;
  }
}
function configuration(value: unknown): value is Configuration {
  if (!value || typeof value !== 'object') return false;
  const c = value as Configuration;
  if (typeof c.predicate !== 'string' || !c.source || !['UPSERT', 'NONE'].includes(c.source.envelope) || !['order_id', 'customer_id'].includes(c.source.key) || typeof c.connected !== 'boolean' || typeof c.snapshot !== 'boolean' || typeof c.fallback !== 'boolean' || !['view', 'materialized'].includes(c.helper) || !['view', 'materialized'].includes(c.final) || !['both', 'operations', 'none'].includes(c.indexes) || !['each', 'equal', 'complete'].includes(c.publication)) return false;
  try { parsePredicate(c.predicate); return true; } catch { return false; }
}
export function parseRun(value: unknown): ChallengeRun | null {
  if (!value || typeof value !== 'object') return null;
  const r = value as ChallengeRun;
  const integer = (v: unknown, max: number) => Number.isSafeInteger(v) && Number(v) >= 0 && Number(v) <= max;
  if (r.scenarioVersion !== 2 || typeof r.id !== 'string' || !r.id || r.id.length > 100 || !integer(r.revision, 100000000) || !integer(r.configurationRevision, r.revision) || !['briefing', 'investigating', 'handover', 'completed'].includes(r.phase) || !workspaces.includes(r.workspace) || !configuration(r.config) || typeof r.draft !== 'string' || r.draft.length > 12000 || typeof r.diagnostic !== 'string' || r.diagnostic.length > 12000 || typeof r.note !== 'string' || r.note.length > 4000 || ![630000, 631000, 631001, 632000, 632001].includes(r.time) || !integer(r.frame, traceTimes.length - 1) || !integer(r.deliveries, 8) || typeof r.processed !== 'boolean' || !integer(r.activeDurationMs, 31536000000)) return null;
  if (!Array.isArray(r.observations) || r.observations.length > 30 || !r.observations.every(o => o && typeof o.id === 'string' && o.id.length <= 150 && typeof o.label === 'string' && o.label.length <= 200 && typeof o.detail === 'string' && o.detail.length <= 5000 && integer(o.time, 1000000) && integer(o.configuration, r.configurationRevision) && workspaces.includes(o.workspace))) return null;
  if (!Array.isArray(r.changes) || r.changes.length > 60 || !r.changes.every(c => c && typeof c.label === 'string' && c.label.length <= 200 && integer(c.time, 1000000) && integer(c.configuration, r.configurationRevision)) || !Array.isArray(r.undo) || r.undo.length > 10 || !r.undo.every(configuration)) return null;
  if (!r.hints || typeof r.hints !== 'object' || !Object.entries(r.hints).every(([key, count]) => workspaces.includes(key as Workspace) && integer(count, 3)) || !Array.isArray(r.worked) || r.worked.length > 5 || !r.worked.every(w => workspaces.includes(w))) return null;
  if (r.read !== null && (!r.read || !['available', 'waiting', 'too-old', 'stale'].includes(r.read.status) || r.read.policy !== 'bounded' || !integer(r.read.timestamp, 1000000) || ![3000, 10000].includes(r.read.bound!) || typeof r.read.rowVisible !== 'boolean')) return null;
  if (r.validation !== null && (!r.validation || r.validation.configuration !== r.configurationRevision || !Array.isArray(r.validation.checks) || r.validation.checks.length !== 5 || !checkIds.every(id => r.validation!.checks.filter(c => c?.id === id).length === 1) || !r.validation.checks.every(c => c && typeof c.id === 'string' && typeof c.label === 'string' && typeof c.detail === 'string' && c.detail.length <= 5000 && typeof c.passed === 'boolean'))) return null;
  if (r.phase === 'completed' && (!readyForHandover(r) || !hasComparison(r) || r.note.trim().length < 20)) return null;
  return r;
}
