import { describe, expect, it } from 'vitest';
import { acceptanceChecks, gradeRepair, parseSeconds } from './grading';
import { stages, type StageId } from './scenario';
import { assistedRun, createRun, parseRun, updateRun, type ChallengeRun } from './run';

const answers = {
  feed: { envelope: 'UPSERT', key: 'order_id', evidence: 'replacement' },
  objects: { helper: 'view', final: 'materialized', indexes: 'both' },
  query: { status: 'paid', lower: 'event', upper: 'exclusive', diff: 'replace', late: '17', expired: 'absent', future: 'wait', result: 'correct' },
  progress: { dependency: 'customers', evidence: 'stalled', action: 'resume', catchup: 'no' },
  reads: { policy: 'bounded', failure: 'fallback', timestamp: '622.999', external: 'no' },
  client: { snapshot: 'on', apply: 'signed', publish: 'later', result: 'correct' },
} as const;
function fill(run: ChallengeRun, id: StageId) {
  for (const [field, value] of Object.entries(answers[id])) run = updateRun(run, { type: 'edit', field, value });
  return run;
}
function finish() {
  let run = updateRun(createRun('test'), { type: 'start' });
  for (const stage of stages) {
    run = fill(run, stage.id);
    if (stage.id === 'reads') for (let i = 0; i < 3; i++) run = updateRun(run, { type: 'read-next' });
    if (stage.id === 'client') for (let i = 0; i < 8; i++) run = updateRun(run, { type: 'delivery-next' });
    run = updateRun(run, { type: 'apply' });
  }
  return run;
}

describe('repair assessment', () => {
  it('accepts authored repairs and either honest operational fallback', () => {
    for (const stage of stages) expect(gradeRepair(stage.id, answers[stage.id]).correct).toBe(true);
    expect(gradeRepair('reads', { ...answers.reads, failure: 'unavailable' }).correct).toBe(true);
    expect(gradeRepair('reads', { ...answers.reads, timestamp: '0622.999' }).correct).toBe(true);
  });
  it('identifies every missing or wrong required decision with evidence-specific feedback', () => {
    for (const stage of stages) {
      expect(Object.keys(gradeRepair(stage.id, {}).errors)).toHaveLength(stage.fields.length);
      for (const field of stage.fields) {
        const wrong = field.options?.find(([value]) => value !== answers[stage.id][field.id as keyof typeof answers[typeof stage.id]] && !(stage.id === 'reads' && field.id === 'failure' && value === 'unavailable'))?.[0] ?? '623.000';
        expect(gradeRepair(stage.id, { ...answers[stage.id], [field.id]: wrong }).errors[field.id]).toBeTruthy();
      }
    }
    expect(gradeRepair('objects', { ...answers.objects, helper: 'materialized' }).errors.helper).toContain('12 units');
  });
  it('parses seconds strictly without accepting exponent, partial, or excessive precision', () => {
    expect(parseSeconds(' 622.999 ')).toBe(622999);
    for (const value of ['6.22999e2', '622.9999', '622s', '-1', 'Infinity', '']) expect(parseSeconds(value)).toBeNull();
  });
});

describe('challenge run transitions and validation', () => {
  it('requires repairs and evidence interactions, then passes all acceptance checks', () => {
    const initial = updateRun(createRun('test'), { type: 'start' });
    expect(updateRun(initial, { type: 'apply' })).toBe(initial);
    const run = finish();
    expect(run.phase).toBe('handover');
    expect(run.commits).toHaveLength(6);
    expect(acceptanceChecks(run.commits).every(check => check.passed)).toBe(true);
    expect(updateRun(run, { type: 'complete' }).phase).toBe('completed');
    expect(parseRun(run)).toEqual(run);
  });
  it('does not accept a read repair without a new request after catch-up or an uninitialized client', () => {
    const handover = finish();
    const read = { ...handover, phase: 'active' as const, stage: 4, commits: handover.commits.slice(0, 4), exploration: { ...handover.exploration, readStep: 2 } };
    expect(updateRun(read, { type: 'apply' })).toBe(read);
    const client = { ...handover, phase: 'active' as const, stage: 5, commits: handover.commits.slice(0, 5), exploration: { ...handover.exploration, deliveries: 7 } };
    expect(updateRun(client, { type: 'apply' })).toBe(client);
  });
  it('invalidates later repairs when an earlier accepted decision changes', () => {
    const handover = finish();
    const review = updateRun(handover, { type: 'review', stage: 1 });
    const changed = updateRun(review, { type: 'edit', field: 'indexes', value: 'operations' });
    expect(changed.commits).toHaveLength(1);
    expect(handover.commits).toHaveLength(6);
    expect(acceptanceChecks(changed.commits).filter(check => check.passed)).toHaveLength(1);
  });
  it('keeps retries and hints distinct from worked-repair assistance', () => {
    let run = updateRun(createRun('test'), { type: 'start' });
    run = updateRun(run, { type: 'hint' });
    expect(assistedRun(run)).toBe(false);
    run = updateRun(run, { type: 'worked' });
    expect(assistedRun(run)).toBe(true);
    expect(run.commits).toHaveLength(0);
    run = updateRun(run, { type: 'retry' });
    expect(assistedRun(run)).toBe(true);
    expect(run.drafts.feed).toEqual({});
  });
  it('rejects malformed, out-of-order, impossible and incompatible persisted runs', () => {
    const run = finish();
    for (const value of [null, {}, { ...run, scenarioVersion: 99 }, { ...run, stage: 6 }, { ...run, commits: [...run.commits].reverse() }, { ...run, drafts: {} }, { ...run, exploration: { ...run.exploration, deliveries: 9 } }, { ...run, phase: 'briefing' }]) expect(parseRun(value)).toBeNull();
    expect(acceptanceChecks([]).every(check => !check.passed)).toBe(true);
  });
});
