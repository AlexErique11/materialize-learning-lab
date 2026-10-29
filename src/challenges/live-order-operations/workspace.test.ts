import { describe, expect, it } from 'vitest';
import { previewKey } from './InvestigationSql';
import { frontiers, repairedPredicate, requestRead } from './incident';
import { createRun, parseRun, pendingSettings, updateRun, type RunAction } from './run';

const started = () => updateRun(createRun('scopes'), { type: 'start' });
function ready() {
  let run = started();
  for (const action of [{ type: 'source', key: 'envelope', value: 'UPSERT' }, { type: 'configure', key: 'helper', value: 'view' }, { type: 'configure', key: 'indexes', value: 'both' }, { type: 'configure', key: 'connected', value: true }, { type: 'process' }, { type: 'delivery', timestamp: 631000 }] satisfies RunAction[]) run = updateRun(run, action);
  return updateRun(run, { type: 'read', attempt: requestRead(run.config, run.time, run.processed) });
}

describe('explicit workspace scope', () => {
  it('starts without a historical snapshot and preserves an explicit selection across reload', () => {
    let run = started();
    expect(run.frame).toBeNull();
    expect(parseRun(run)?.frame).toBeNull();
    run = updateRun(run, { type: 'frame', frame: 10 });
    expect(parseRun(run)?.frame).toBe(10);
    expect(parseRun({ ...run, frame: -1 })).toBeNull();
  });
  it('keeps draft groups unapplied across navigation and saved state, and applies atomically', () => {
    let run = ready();
    const config = run.config;
    run = updateRun(run, { type: 'stage', key: 'publication', value: 'complete' });
    run = updateRun(run, { type: 'stage', key: 'snapshot', value: false });
    run = updateRun(run, { type: 'stage', key: 'indexes', value: 'none' });
    run = updateRun(run, { type: 'workspace', workspace: 'SQL' });
    expect(run.config).toEqual(config);
    expect(pendingSettings(run, 'client')).toBe(true);
    expect(parseRun(run)).toEqual(run);
    const prior = run;
    run = updateRun(run, { type: 'apply-settings', group: 'client' });
    expect(run.config).toMatchObject({ publication: 'complete', snapshot: false, indexes: 'both' });
    expect(run.configurationRevision).toBe(prior.configurationRevision + 1);
    expect(run.deliveries).toBe(0);
    expect(run.read).toEqual(prior.read);
    expect(previewKey(run, 'repair')).toBe(previewKey(prior, 'repair'));
    expect(pendingSettings(run, 'client')).toBe(false);
    expect(pendingSettings(run, 'serving')).toBe(true);
    run = updateRun(run, { type: 'discard-settings', group: 'serving' });
    expect(run.settings.indexes).toBe('both');
    expect(run.configurationRevision).toBe(prior.configurationRevision + 1);
  });
  it('treats filters, historical time, and fallback authorization as view-only choices', () => {
    let run = ready(); const prior = run;
    for (const action of [{ type: 'frame', frame: 1 }, { type: 'inspect', key: 'data', value: 'messages' }, { type: 'inspect', key: 'order', value: '101' }, { type: 'inspect', key: 'fallback', value: true }, { type: 'inspect', key: 'comparison', value: 'application' }] satisfies RunAction[]) run = updateRun(run, action);
    expect(run).toMatchObject({ config: prior.config, time: prior.time, read: prior.read, deliveries: prior.deliveries, configurationRevision: prior.configurationRevision });
    expect(parseRun(run)).toEqual(run);
  });
  it('invalidates only dependencies of serving, source, client, and query changes', () => {
    const run = ready();
    let next = updateRun(run, { type: 'configure', key: 'indexes', value: 'none' });
    expect(next.read).toBeNull(); expect(next.deliveries).toBe(run.deliveries);
    expect(previewKey(next, 'repair')).toBe(previewKey(run, 'repair'));
    next = updateRun(run, { type: 'source', key: 'envelope', value: 'NONE' });
    expect(next.read).toBeNull(); expect(next.deliveries).toBe(0);
    expect(previewKey(next, 'repair')).not.toBe(previewKey(run, 'repair'));
    next = updateRun(run, { type: 'draft', value: repairedPredicate });
    next = updateRun(next, { type: 'deploy', runId: next.id, configuration: next.configurationRevision, predicate: repairedPredicate });
    expect(next.read).toBeNull(); expect(next.deliveries).toBe(0); expect(next.queryRevision).toBe(1);
    expect(updateRun(next, { type: 'undo' }).queryRevision).toBe(2);
  });
  it('separates incident events from processing and retains the previous complete snapshot', () => {
    let run = ready();
    run = updateRun(run, { type: 'advance' });
    expect(run.time).toBe(632000); expect(run.processed).toBe(false);
    expect(frontiers(run.config, run.time, run.processedTime).output).toBe(631001);
    expect(run.feedback).toContain('70 to 90');
    const deliveries = run.deliveries;
    run = updateRun(run, { type: 'process' });
    expect(run.time).toBe(632000); expect(run.processedTime).toBe(632000);
    expect(run.deliveries).toBe(deliveries);
    expect(frontiers(run.config, run.time, run.processedTime).output).toBe(632001);
    run = updateRun(run, { type: 'replay-client' });
    expect(run.time).toBe(632000);
    expect(parseRun(run)).toEqual(run);
  });
  it('migrates existing V2 saves with clean drafts without mutating their configuration', () => {
    const run = ready();
    const legacy = { ...run } as Partial<typeof run>;
    delete legacy.settings; delete legacy.inspection; delete legacy.feedback; delete legacy.queryRevision; delete legacy.processedTime;
    const restored = parseRun(legacy)!;
    expect(restored.config).toEqual(run.config); expect(restored.read).toEqual(run.read);
    expect(restored.settings).toEqual(run.config); expect(restored.processedTime).toBe(run.time);
    expect(restored.id).toBe(run.id); expect(restored.deliveries).toBe(run.deliveries);
    expect(parseRun({ ...run, settings: { source: { key: 'bad' } } })).toBeNull();
    expect(parseRun({ ...run, inspection: { ...run.inspection, comparison: 'bad' } })).toBeNull();
  });
});

it('preserves sealed output and received deliveries when a connection pauses, and preserves SQL drafts on unrelated undo', () => {
  let run = ready();
  run = updateRun(run, { type: 'draft', value: 'unfinished investigation query' });
  const prior = run;
  run = updateRun(run, { type: 'configure', key: 'connected', value: false });
  expect(run.processedTime).toBe(prior.time);
  expect(frontiers(run.config, run.time, run.processedTime).output).toBe(prior.time + 1);
  expect(run.deliveries).toBe(prior.deliveries);
  run = updateRun(run, { type: 'undo' });
  expect(run.draft).toBe('unfinished investigation query');
  expect(run.time).toBe(prior.time);
  expect(parseRun(run)).toEqual(run);
});
