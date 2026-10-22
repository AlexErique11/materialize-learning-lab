import { describe, expect, it } from 'vitest';
import { applyRead, applyReads, classifyTimestamp, clockFixture, orderingFixture, sharedWindow, windowFixture, type ReadSnapshot } from './simulation';
import { readLectures, readPlaybackFrames } from './lecture-scenarios';
import { gradeRead, readExercises, solutionFor } from './exercise-scenarios';

const read = (snapshot: ReadSnapshot, timestamp: number) => applyRead(snapshot, { type: 'request', request: { policy: 'timestamp', timestamp } });
describe('consistent read windows', () => {
  it('intersects inclusive retained and exclusive write frontiers', () => {
    const snapshot = windowFixture();
    expect(sharedWindow(snapshot)).toEqual({ retained: 5, write: 8 });
    expect([4, 5, 7, 8, 10].map(t => classifyTimestamp(snapshot, t))).toEqual(['too-old', 'available', 'available', 'waiting', 'waiting']);
  });
  it('distinguishes empty overlap, ties, and discarded history from waiting', () => {
    const empty = windowFixture(9, 13, 5, 9);
    expect(classifyTimestamp(empty, 8)).toBe('too-old');
    expect(classifyTimestamp(empty, 9)).toBe('waiting');
    expect(sharedWindow(windowFixture(3, 8, 3, 8))).toEqual({ retained: 3, write: 8 });
    expect(() => windowFixture(8, 7)).toThrow('Invalid');
  });
  it('completes a waiting request without moving its target and seals its result', () => {
    const pending = read(windowFixture(), 8);
    const open = applyRead(pending, { type: 'frontier', input: 0, write: 12 });
    expect(open.attempt?.status).toBe('waiting');
    const done = applyRead(open, { type: 'frontier', input: 1, write: 9 });
    expect(done.attempt).toMatchObject({ timestamp: 8, status: 'available' });
    expect(applyRead(done, { type: 'frontier', input: 1, write: 10 }).attempt).toBe(done.attempt);
  });
  it('holds pending history and constrains compaction without deleting current rows', () => {
    const pending = read(windowFixture(), 8);
    expect(() => applyRead(pending, { type: 'frontier', input: 1, retained: 9, write: 10 })).toThrow('holds');
    expect(() => applyRead(pending, { type: 'frontier', input: 1, write: 7 })).toThrow('monotonically');
    const initial = orderingFixture();
    const compacted = applyReads(initial, [{ type: 'release' }, { type: 'frontier', input: 0, retained: 8 }]);
    expect(compacted.row).toBe(initial.row);
    expect(read(compacted, 7).attempt?.status).toBe('too-old');
  });
});
describe('read policies and external ingestion', () => {
  it('allows an older serializable observation and makes the strict replay wait', () => {
    const initial = orderingFixture();
    const serial = applyRead(initial, { type: 'request', request: { policy: 'serializable' } });
    expect(serial.attempt).toMatchObject({ timestamp: 7, status: 'available', rowVisible: false });
    const strict = applyRead(initial, { type: 'request', request: { policy: 'strict', timestamp: 7 } });
    expect(strict.attempt).toMatchObject({ timestamp: 10, status: 'waiting' });
    const done = applyRead(strict, { type: 'frontier', input: 1, write: 11 });
    expect(done.attempt).toMatchObject({ timestamp: 10, status: 'available', rowVisible: true });
  });
  it('allows serializable to wait when no shared complete snapshot exists', () => {
    const pending = applyRead(windowFixture(9, 13, 5, 9), { type: 'request', request: { policy: 'serializable' } });
    expect(pending.attempt).toMatchObject({ timestamp: 9, status: 'waiting' });
    expect(applyRead(pending, { type: 'frontier', input: 1, write: 13 }).attempt).toMatchObject({ timestamp: 9, status: 'available' });
  });
  it('compares epoch-millisecond snapshot age to an inclusive positive bound', () => {
    for (const [now, status] of [[100000, 'available'], [103000, 'available'], [106000, 'stale']] as const) {
      const snapshot = applyRead(clockFixture(now), { type: 'request', request: { policy: 'bounded', bound: 5000 } });
      expect(snapshot.attempt).toMatchObject({ timestamp: 98000, status, age: now - 98000 });
    }
    expect(() => applyRead(clockFixture(), { type: 'request', request: { policy: 'bounded', bound: 0 } })).toThrow('positive');
    expect(applyRead(clockFixture(), { type: 'duration', milliseconds: 1200 }).queryMs).toBe(1200);
  });
  it('errors without a shared window and keeps failed requests failed after recovery', () => {
    const request = { type: 'request', request: { policy: 'bounded', bound: 5000 } } as const;
    const failed = applyRead(clockFixture(106000), request);
    const recovered = applyReads(failed, [{ type: 'frontier', input: 0, write: 107001 }, { type: 'frontier', input: 1, write: 107001 }, { type: 'clock', to: 108000 }]);
    expect(recovered.attempt).toBe(failed.attempt);
    expect(applyRead(recovered, request).attempt).toMatchObject({ status: 'available', age: 1000 });
    expect(applyRead(windowFixture(99000, 100001, 90000, 98001, { clock: 100000 }), request).attempt?.status).toBe('stale');
  });
  it('keeps upstream commit, ingestion, processing and snapshot visibility separate', () => {
    const committed = applyReads(clockFixture(100000, 100000), [{ type: 'pause-ingestion' }, { type: 'upstream', id: 84 }]);
    const request = { type: 'request', request: { policy: 'strict', timestamp: 100000 } } as const;
    expect(applyRead(committed, request).attempt).toMatchObject({ status: 'available', rowVisible: false });
    expect(() => applyRead(committed, { type: 'ingest', timestamp: 101000 })).toThrow('Ingest');
    const ingested = applyReads(committed, [{ type: 'resume-ingestion' }, { type: 'ingest', timestamp: 101000 }]);
    expect(ingested.row).toMatchObject({ ingested: true, processed: false, logicalTime: 101000 });
    const processed = applyReads(ingested, [{ type: 'process' }, { type: 'frontier', input: 0, write: 102001 }, { type: 'frontier', input: 1, write: 102001 }]);
    expect(read(processed, 100000).attempt?.rowVisible).toBe(false);
    expect(read(processed, 102000).attempt?.rowVisible).toBe(true);
  });
});
describe('chapter content and assessment', () => {
  it('keeps explanation-only checkpoints in guidance and out of playback', () => {
    expect(readLectures.map(lecture => readPlaybackFrames(lecture).map(frame => frame.time))).toEqual([
      [4, 5, 6, 7, 8, 9], [3, 5, 6, 7, 8], [2, 3, 4, 5, 6, 7, 8, 9],
    ]);
    expect(readLectures.map(lecture => lecture.lessons.length)).toEqual([9, 9, 10]);
  });
  it('replays every lecture deterministically from immutable initial state', () => {
    for (const lecture of readLectures) {
      const initial = JSON.stringify(lecture.initial);
      let snapshot = lecture.initial;
      for (const lesson of lecture.lessons) {
        snapshot = applyReads(snapshot, lesson.actions);
        expect(snapshot).toEqual(lesson.snapshot);
      }
      expect(JSON.stringify(lecture.initial)).toBe(initial);
      expect(lecture.lessons.some(lesson => lesson.before)).toBe(true);
    }
  });
  it('accepts every valid shared timestamp and rejects malformed or out-of-range input', () => {
    const question = readExercises[0]!.questions[0]!;
    for (const value of ['7', '8', '9', '10']) expect(gradeRead(question, { time: [value] }).correct).toBe(true);
    for (const value of ['', '6', '11', '7.1', '7x', 'NaN']) expect(gradeRead(question, { time: [value] }).correct).toBe(false);
  });
  it('requires complete answers and exact evidence sets without changing fixtures', () => {
    for (const exercise of readExercises) for (const question of exercise.questions) {
      const before = JSON.stringify(question.before);
      expect(gradeRead(question, solutionFor(question)).correct).toBe(true);
      expect(gradeRead(question, {}).correct).toBe(false);
      expect(JSON.stringify(question.before)).toBe(before);
    }
    const evidence = readExercises[1]!.questions[3]!;
    expect(gradeRead(evidence, { evidence: ['ingestion'] }).correct).toBe(false);
    expect(gradeRead(evidence, { evidence: ['ingestion', 'separate', 'dirty'] }).correct).toBe(false);
    expect(gradeRead(evidence, { evidence: ['ingestion', 'ingestion'] }).correct).toBe(false);
  });
});
