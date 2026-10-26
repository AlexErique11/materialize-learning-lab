import { describe, expect, it } from 'vitest';
import { getChapterPages } from '../chapterOutline';
import { findChapter } from '../chapterRegistry';
import { gradeSubscription, solutionFor, subscriptionExercises } from './exercise-scenarios';
import { subscriptionFrames, subscriptionLectures } from './lecture-scenarios';
import { applySubscriptions, createSubscription, duplicateStart, timestampGroups } from './simulation';
import { subscriptionSqlFor } from './resources';
import { subscriptionText } from './lessonText';

describe('SUBSCRIBE learning coverage', () => {
  it('preserves every authored explanation when adding colored references', () => {
    const prose = [
      ...subscriptionLectures.flatMap(lecture => lecture.lessons.flatMap(lesson => [lesson.before ?? '', lesson.explanation])),
      ...subscriptionExercises.flatMap(exercise => exercise.questions.flatMap(question => [question.prompt, question.hint, question.explanation])),
    ];
    for (const text of prose) expect(subscriptionText(text).map(part => typeof part === 'string' ? part : part.text).join('')).toBe(text);
  });
  it('distinguishes tuple fields, progress, and signed diffs without coloring unrelated numbers', () => {
    const text = subscriptionText('At timestamp 12, apply −1 and +1 to (EU, 2, 130). P(13) publishes 2 copies. There are 3 lessons.');
    expect(text).toContainEqual({ kind: 'term', text: 'EU', column: 'region' });
    expect(text).toContainEqual({ kind: 'count', text: '2', column: 'orders' });
    expect(text).toContainEqual({ kind: 'row', text: '130', column: 'total' });
    expect(text).toContainEqual({ kind: 'time', text: 'P(13)', column: 'time' });
    expect(text).toContainEqual({ kind: 'term', text: '2 copies', column: 'copies' });
    expect(text).toContainEqual({ kind: 'diff', text: '−1' });
    expect(text).toContainEqual({ kind: 'diff', text: '+1' });
    expect(text.some(part => typeof part !== 'string' && part.text === '3')).toBe(false);
    const publication = subscriptionText('The EU total becomes 130, US stays 50, and the published boundary advances to 13.');
    expect(publication).toContainEqual({ kind: 'row', text: '130', column: 'total' });
    expect(publication).toContainEqual({ kind: 'row', text: '50', column: 'total' });
    expect(publication).toContainEqual({ kind: 'time', text: '13', column: 'time' });
  });
  it('registers three lectures followed by three exercises', () => {
    const chapter = findChapter('live-applications-subscribe')!;
    expect(getChapterPages(chapter).map(page => `${page.sectionSlug}/${page.slug}`)).toEqual([
      'tutorial/lecture-1', 'tutorial/lecture-2', 'tutorial/lecture-3',
      'exercises/exercise-1', 'exercises/exercise-2', 'exercises/exercise-3',
    ]);
    expect(subscriptionExercises.map(exercise => exercise.questions.length)).toEqual([4, 5, 7]);
  });
  it('derives every guided snapshot from its actions and skips only explanatory playback', () => {
    for (const lecture of subscriptionLectures) {
      let state = lecture.initial;
      for (const lesson of lecture.lessons) {
        state = applySubscriptions(state, lesson.actions);
        expect(lesson.state).toEqual(state);
        expect(lesson.explanation.length).toBeGreaterThan(30);
      }
      const frames = subscriptionFrames(lecture);
      expect(frames.every(frame => frame.lesson.actions.some(action => action.type !== 'observe'))).toBe(true);
    }
  });
  it('accepts complete solutions but rejects missing answers and incorrect evidence', () => {
    for (const exercise of subscriptionExercises) for (const question of exercise.questions) {
      const answer = solutionFor(question);
      expect(gradeSubscription(question, answer).correct, question.title).toBe(true);
      expect(gradeSubscription(question, {}).correct, question.title).toBe(false);
      for (const group of question.groups) {
        const wrong = { ...answer, [group.id]: group.kind === 'integer' ? String(Number(group.solution) + 1) : 'invalid-choice' };
        expect(gradeSubscription(question, wrong).errors[group.id], question.title).toBeDefined();
      }
    }
  });
  it('shows SQL for the active relation and its actual snapshot setting', () => {
    expect(subscriptionSqlFor(createSubscription())).toContain('COUNT(*) AS orders');
    expect(subscriptionSqlFor(createSubscription(false))).toContain('SNAPSHOT = false, PROGRESS = true');
    const copies = subscriptionSqlFor(duplicateStart());
    expect(copies).toContain('CREATE TABLE row_copies');
    expect(copies).toContain("('EU', 2, 100), ('EU', 2, 100)");
    expect(copies).toContain('SUBSCRIBE row_copies');
    expect(copies).not.toContain('GROUP BY');
  });
  it('never hides authored data beyond the two displayed row slots', () => {
    const states = [
      ...subscriptionLectures.flatMap(lecture => [lecture.initial, ...lecture.lessons.map(lesson => lesson.state)]),
      ...subscriptionExercises.flatMap(exercise => exercise.questions.flatMap(question => [question.before, question.after])),
    ];
    for (const state of states) {
      for (const group of timestampGroups(state)) expect(group.records.length).toBeLessThanOrEqual(2);
      expect(state.published.length).toBeLessThanOrEqual(2);
      if (state.ready) expect(state.published.every(entry => entry.count > 0)).toBe(true);
    }
  });
});
