import { describe, expect, it } from 'vitest';
import { aggregateSql, parsePredicate } from './predicate';
import { initialPredicate, repairedPredicate, expectedAt, initialConfiguration, traceTimes, requestRead } from './incident';
import { queryCheck, systemChecks } from './grading';
import { assistedRun, createRun, parseRun, readyForHandover, updateRun } from './run';
const trace = traceTimes.map(time => ({ time, rows: [...expectedAt(time)] }));
describe('free investigation and validation', () => {
  it('accepts equivalent predicates by grammar, without an answer-key comparison', () => {
    for (const text of [initialPredicate, repairedPredicate, "(mz_now() < (event_at + INTERVAL '300 seconds')) AND (status = 'paid' AND mz_now() >= event_at)", "TRUE", "o.amount > 50 AND o.status <> 'cancelled'"]) expect(() => aggregateSql(text)).not.toThrow();
  });
  it.each(["mz_now() - INTERVAL '5 minutes' < event_at", "mz_now() + INTERVAL '5 minutes' > event_at", "status='paid'; DROP TABLE orders", "status='paid' OR TRUE", 'mz_now() >= mz_now()', 'random() > 0', 'not_a_column = 4', '('.repeat(1000)])('rejects unsupported or ambiguous maintained expressions: %s', text => { expect(() => parsePredicate(text)).toThrow(); });
  it('allows every workspace immediately and preserves drafts between them', () => {
    let run = updateRun(createRun('open'), { type: 'start' });
    run = updateRun(run, { type: 'workspace', workspace: 'Client' });
    run = updateRun(run, { type: 'draft', value: 'unfinished SQL' });
    run = updateRun(run, { type: 'workspace', workspace: 'System' });
    expect(run).toMatchObject({ workspace: 'System', draft: 'unfinished SQL', configurationRevision: 0 });
    expect(parseRun(run)).toEqual(run);
  });
  it('keeps preview/draft separate from deployment and rebaselines dependent state', () => {
    let run = updateRun(createRun('repair'), { type: 'start' });
    run = updateRun(run, { type: 'draft', value: repairedPredicate });
    expect(run.config.predicate).toBe(initialPredicate);
    run = updateRun(run, { type: 'deploy', runId: run.id, configuration: run.configurationRevision, predicate: repairedPredicate });
    expect(run).toMatchObject({ config: { predicate: repairedPredicate }, configurationRevision: 1, deliveries: 0, validation: null });
    run = updateRun(run, { type: 'undo' }); expect(run.config.predicate).toBe(initialPredicate);
  });
  it('does not treat a permitted frontier or fallback as restored service', () => {
    let run = updateRun(createRun('progress'), { type: 'start' });
    run = updateRun(run, { type: 'configure', key: 'connected', value: true });
    expect(systemChecks(run, trace).find(c => c.id === 'service')?.passed).toBe(false);
    run = updateRun(run, { type: 'process' });
    run = updateRun(run, { type: 'read', attempt: requestRead(run.config, run.time, run.processed, true) });
    expect(systemChecks(run, trace).find(c => c.id === 'service')?.passed).toBe(false);
    run = updateRun(run, { type: 'read', attempt: requestRead(run.config, run.time, run.processed) });
    expect(systemChecks(run, trace).find(c => c.id === 'service')?.passed).toBe(true);
  });
  it('judges query behavior and client intermediate states independently', () => {
    expect(queryCheck(trace).passed).toBe(true);
    expect(queryCheck([{ time: 620000, rows: [] }]).passed).toBe(false);
    const run = createRun('client');
    expect(systemChecks(run, trace).find(c => c.id === 'client')?.passed).toBe(false);
    run.config.publication = 'complete'; expect(systemChecks(run, trace).find(c => c.id === 'client')?.passed).toBe(true);
    run.config.snapshot = false; expect(systemChecks(run, trace).find(c => c.id === 'client')?.passed).toBe(false);
  });
  it('completes without pinned observations, invalidates stale checks, and preserves assistance on undo', () => {
    let run = updateRun(createRun('checks'), { type: 'start' });
    run = updateRun(run, { type: 'worked', workspace: 'Client' });
    expect(assistedRun(run)).toBe(true);
    const repaired = { ...run.config, source: { envelope: 'UPSERT' as const, key: 'order_id' as const }, helper: 'view' as const, indexes: 'both' as const, connected: true };
    const checks = [queryCheck(trace), ...systemChecks({ ...run, config: repaired, processed: true, read: requestRead(repaired, 630000, true) }, trace)];
    run = updateRun(run, { type: 'validation', runId: run.id, configuration: 0, checks }); expect(run.validation).toBeNull();
    run = updateRun(run, { type: 'validation', runId: run.id, configuration: run.configurationRevision, checks }); expect(readyForHandover(run)).toBe(true);
    run = updateRun(run, { type: 'handover' });
    run = updateRun(run, { type: 'complete' }); expect(run.phase).toBe('completed'); expect(parseRun(run)).toEqual(run);
    expect(parseRun({ ...run, note: 'Old required explanation' })).toEqual(run);
    run = updateRun(run, { type: 'undo' }); expect(run.validation).toBeNull(); expect(run.phase).toBe('investigating'); expect(assistedRun(run)).toBe(true);
  });
  it('rejects malformed persisted state without migrating a first-version run', () => {
    for (const patch of [{ scenarioVersion: 1 }, { deliveries: 99 }, { draft: null }, { hints: { SQL: 4 } }, { config: { ...initialConfiguration(), predicate: 'DROP TABLE orders' } }, { validation: { configuration: 0, checks: [] } }, { phase: 'completed' }]) expect(parseRun({ ...createRun('invalid'), ...patch })).toBeNull();
  });
  it('discards old notes and notebook snapshots while preserving a saved investigation', () => {
    let run = updateRun(createRun('existing'), { type: 'start' });
    run = updateRun(run, { type: 'draft', value: repairedPredicate });
    const saved = { ...run, note: 'Legacy handover explanation', observations: [{ id: 'old-pin', label: 'Before', detail: 'Old snapshot', time: 630000, configuration: 0, workspace: 'Dashboard' }] };
    expect(parseRun(saved)).toEqual(run);
    expect(saved.observations).toHaveLength(1);
  });
});

it('blocks completion for absent, failed, or stale acceptance checks', () => {
  const run = updateRun(updateRun(createRun('incomplete'), { type: 'start' }), { type: 'handover' });
  expect(updateRun(run, { type: 'complete' })).toBe(run);
  const checks = ['query', 'source', 'service', 'client', 'objects'].map(id => ({ id, label: id, passed: true, detail: '' }));
  for (const validation of [
    { configuration: 0, checks: checks.map(check => ({ ...check, passed: check.id !== 'source' })) },
    { configuration: 1, checks },
    { configuration: 0, checks: checks.slice(1) },
  ]) {
    const unready = { ...run, validation };
    expect(updateRun(unready, { type: 'complete' })).toBe(unready);
  }
});

it('requires source replacement semantics and both serving repairs independently', () => {
  let run = updateRun(createRun('repairs'), { type: 'start' });
  const passes = (id: string) => systemChecks(run, trace).find(check => check.id === id)!.passed;
  expect(passes('source')).toBe(false);
  expect(passes('objects')).toBe(false);
  run = updateRun(run, { type: 'stage', key: 'source', value: { envelope: 'UPSERT', key: 'order_id' } });
  expect(passes('source')).toBe(false);
  run = updateRun(run, { type: 'apply-settings', group: 'source' });
  expect(passes('source')).toBe(true);
  run = updateRun(run, { type: 'configure', key: 'indexes', value: 'both' });
  expect(passes('objects')).toBe(false);
  run = updateRun(run, { type: 'configure', key: 'helper', value: 'view' });
  expect(passes('objects')).toBe(true);
});

it('offers complete worked repairs for Data and System and records their assistance', () => {
  let run = updateRun(createRun('assisted'), { type: 'start' });
  run = updateRun(run, { type: 'worked', workspace: 'Data' });
  run = updateRun(run, { type: 'worked', workspace: 'System' });
  expect(systemChecks(run, trace).filter(check => ['source', 'objects'].includes(check.id)).every(check => check.passed)).toBe(true);
  expect(run.config.connected).toBe(true);
  expect(run.worked).toEqual(['Data', 'System']);
  expect(parseRun(run)).toEqual(run);
});

it('guards deployment and validation against a replaced run or a changed configuration', () => {
  let run = updateRun(createRun('current'), { type: 'start' });
  run = updateRun(run, { type: 'draft', value: repairedPredicate });
  expect(updateRun(run, { type: 'deploy', predicate: repairedPredicate, runId: 'obsolete', configuration: 0 })).toBe(run);
  expect(updateRun(run, { type: 'validation', runId: 'obsolete', configuration: 0, checks: [] })).toBe(run);
  run = updateRun(run, { type: 'configure', key: 'publication', value: 'complete' });
  expect(updateRun(run, { type: 'deploy', predicate: repairedPredicate, runId: run.id, configuration: 0 })).toBe(run);
});

it('advances a shared clock for deliveries, preserves recent sealed reads and never rewinds on replay', () => {
  let run = updateRun(createRun('time'), { type: 'start' });
  run = updateRun(run, { type: 'configure', key: 'connected', value: true });
  run = updateRun(run, { type: 'configure', key: 'publication', value: 'complete' });
  run = updateRun(run, { type: 'process' });
  run = updateRun(run, { type: 'read', attempt: requestRead(run.config, run.time, run.processed) });
  for (const timestamp of [631000, 631000, 631000, 631001, 632000, 632000, 632000, 632001]) run = updateRun(run, { type: 'delivery', timestamp });
  expect(run.time).toBe(632001); expect(parseRun(run)).toEqual(run);
  expect(systemChecks(run, trace).find(c => c.id === 'service')?.passed).toBe(true);
  run = updateRun(run, { type: 'replay-client' }); run = updateRun(run, { type: 'delivery', timestamp: 631000 });
  expect(run.time).toBe(632001);
  run = updateRun(run, { type: 'frame', frame: 1 }); expect(run.time).toBe(632001);
});
