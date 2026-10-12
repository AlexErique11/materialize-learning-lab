import { describe, expect, it } from 'vitest';
import { exerciseProducts as p, ingestionExercises, stateForQuestion } from './exercise-scenarios';
import { gradeIngestionPrediction, solutionForQuestion } from './exercise-grading';

describe('Chapter 4 exercise fixtures', () => {
  it('keeps the snapshot unavailable until its complete atomic commitment', () => {
    const questions = ingestionExercises[0]!.questions;
    const read = stateForQuestion(questions[0]!, true);
    const commit = stateForQuestion(questions[1]!, true);
    expect(read.state.relation).toBeNull();
    expect(commit.state.relation).toEqual([p.notebook, p.pen, p.lamp]);
    if (read.kind !== 'snapshot' || commit.kind !== 'snapshot') throw new Error('Expected snapshot fixture');
    expect(read.state.snapshotRowsRead).toBe(3);
    expect(commit.state.phase).toBe('Catch-up');
    expect(commit.state.pendingCount).toBe(2);
    expect(commit.state.upstream).toEqual([p.notebookEight, p.pen]);
  });
  it('applies catch-up to the original rows and processes a live insert without resnapshotting', () => {
    const questions = ingestionExercises[0]!.questions;
    const caught = stateForQuestion(questions[2]!, true);
    const live = stateForQuestion(questions[3]!, true);
    if (caught.kind !== 'snapshot' || live.kind !== 'snapshot') throw new Error('Expected snapshot fixture');
    expect(caught.state.relation).toEqual([p.notebookEight, p.pen]);
    expect(caught.state.pendingCount).toBe(0);
    expect(caught.state.phase).toBe('Live');
    expect(live.state.relation).toEqual([p.notebookEight, p.pen, p.ruler]);
    expect(live.state.snapshotRowsRead).toBe(3);
    expect(live.state.relationDiffs).toEqual([{ row: p.ruler, diff: 1 }]);
  });
  it('retains identical event copies but replaces keyed current values', () => {
    const questions = ingestionExercises[1]!.questions;
    expect(stateForQuestion(questions[0]!, true).state.relation).toEqual([p.notebook, p.notebook]);
    const replacement = stateForQuestion(questions[1]!, true);
    if (replacement.kind !== 'record') throw new Error('Expected record fixture');
    expect(replacement.state.relation).toEqual([p.notebookEight, p.pen]);
    expect(replacement.state.diffs).toEqual([{ row: p.notebook, diff: -1 }, { row: p.notebookEight, diff: 1 }]);
  });
  it('interprets all three valid Debezium operations', () => {
    const questions = ingestionExercises[1]!.questions;
    expect(stateForQuestion(questions[2]!, true).state.relation).toEqual([p.notebookEight, p.pen]);
    expect(stateForQuestion(questions[3]!, true).state.relation).toEqual([p.notebookNine, p.pen]);
    const deleted = stateForQuestion(questions[4]!, true);
    if (deleted.kind !== 'record') throw new Error('Expected record fixture');
    expect(deleted.state.relation).toEqual([p.notebookNine]);
    expect(deleted.state.diffs).toEqual([{ row: p.pen, diff: -1 }]);
  });
  it('repairs the catalog by fresh replay, not conversion of the broken event rows', () => {
    const question = ingestionExercises[2]!.questions[0]!;
    expect(stateForQuestion(question, false).state.relation).toEqual([p.notebook, p.notebookEight, p.notebookEight, p.pen]);
    expect(stateForQuestion(question, true).state.relation).toEqual([p.notebookEight, p.pen]);
  });
  it('retains both name keys after the legacy rename', () => {
    const result = stateForQuestion(ingestionExercises[2]!.questions[1]!, true);
    if (result.kind !== 'record') throw new Error('Expected record fixture');
    expect(result.state.entries.map((entry) => entry.identity)).toEqual(['Notebook', 'Journal']);
    expect(result.state.relation).toEqual([p.notebookEight, p.journal]);
  });
  it('distinguishes a nullable field, an exact-key tombstone, and a decoding error', () => {
    const questions = ingestionExercises[2]!.questions;
    expect(stateForQuestion(questions[2]!, true).state.relation).toEqual([p.journalNull, p.pen]);
    expect(stateForQuestion(questions[3]!, true).state.relation).toEqual([p.pen]);
    const error = stateForQuestion(questions[4]!, true);
    if (error.kind !== 'record') throw new Error('Expected record fixture');
    expect(error.state.relation).toBeNull();
    expect(error.state.entries).toEqual([{ identity: '302', row: p.pen }]);
    expect(error.state.errors).toHaveLength(1);
  });
});

describe('Chapter 4 exercise grading', () => {
  for (const exercise of ingestionExercises) {
    it(`accepts complete solutions for ${exercise.title} and rejects unanswered groups`, () => {
      for (const question of exercise.questions) {
        expect(gradeIngestionPrediction(question, solutionForQuestion(question)).correct).toBe(true);
        expect(gradeIngestionPrediction(question, {}).correct).toBe(false);
      }
    });
  }
  it('requires an exact set of signed changes, independent of selection order', () => {
    const question = ingestionExercises[1]!.questions[1]!;
    expect(gradeIngestionPrediction(question, { envelope: 'UPSERT', diffs: ['add-new', 'retract-old'] }).correct).toBe(true);
    for (const diffs of [['add-new'], ['add-new', 'retract-old', 'add-old'], ['add-new', 'add-new']]) {
      expect(gradeIngestionPrediction(question, { envelope: 'UPSERT', diffs }).correct).toBe(false);
    }
    expect(gradeIngestionPrediction(question, { envelope: 'NONE', diffs: ['add-new', 'retract-old'] }).errors).toHaveProperty('envelope');
  });
  it('rejects invalid counts and grades all answer groups together', () => {
    const question = ingestionExercises[1]!.questions[0]!;
    for (const copies of ['', '2.0', '-2', '2x', '9007199254740992']) {
      expect(gradeIngestionPrediction(question, { envelope: 'NONE', copies }).correct).toBe(false);
    }
    expect(gradeIngestionPrediction(question, { envelope: 'NONE', copies: ' 2 ' }).correct).toBe(true);
    expect(gradeIngestionPrediction(question, { envelope: 'UPSERT', copies: '2' }).correct).toBe(false);
  });
});
