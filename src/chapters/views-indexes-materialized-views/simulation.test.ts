import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { objectLectures, revenueSql, stackedRevenueSql } from './scenario';
import { gradeObjectPrediction, objectExercises } from './exercise-scenarios';
import { initialOrders, makeSnapshot, querySnapshot, revenueFor, updatedOrders } from './simulation';

describe('Chapter 3 object and query semantics', () => {
  it('matches the displayed SQL independently for every lecture and exercise fixture', () => {
    const db = new DatabaseSync(':memory:');
    try {
      db.exec('CREATE TABLE orders (order_id INT, region TEXT, amount INT)');
      db.exec('CREATE VIEW order_base AS SELECT order_id, region, amount FROM orders; CREATE VIEW order_enriched AS SELECT * FROM order_base WHERE amount >= 0;');
      const fixtures = objectLectures.flatMap(lecture => [lecture.initial, ...lecture.lessons.map(step => step.snapshot)])
        .concat(objectExercises.flatMap(exercise => exercise.checkpoints.flatMap(step => [step.before, step.after])));
      // Exercise the filter, empty groups, zero values and duplicate input rows,
      // rather than relying only on the positive amounts in the teaching fixture.
      const edgeOrders = [
        { orderId: 1, region: 'North', amount: 100 },
        { orderId: 1, region: 'North', amount: 100 },
        { orderId: 2, region: 'North', amount: -30 },
        { orderId: 3, region: 'South', amount: -80 },
        { orderId: 4, region: 'West', amount: 0 },
      ];
      for (const orders of [edgeOrders, [], [edgeOrders[3]!]]) for (const stacked of [false, true]) {
        fixtures.push(makeSnapshot({ view: true, materialized: true, stacked }, orders));
      }
      for (const snapshot of fixtures) {
        db.exec('DELETE FROM orders');
        for (const row of snapshot.orders) db.prepare('INSERT INTO orders VALUES (?, ?, ?)').run(row.orderId, row.region, row.amount);
        const expected = db.prepare((snapshot.setup.stacked ? stackedRevenueSql : revenueSql) + ' ORDER BY region').all();
        expect(revenueFor(snapshot.orders, snapshot.setup.stacked)).toEqual(expected);
        for (const object of ['revenue_v', 'revenue_mv'] as const) for (const cluster of ['a', 'b'] as const) {
          const query = querySnapshot(snapshot, object, cluster);
          expect(query.rows).toEqual(query.path === 'unavailable' ? [] : expected);
        }
      }
    } finally { db.close(); }
  });

  it('restricts index access to the owning cluster while keeping definitions and durable output shared', () => {
    const state = makeSnapshot({ view: true, materialized: true, viewIndexes: ['a'], materializedIndexes: ['b'] });
    expect(querySnapshot(state, 'revenue_v', 'a').path).toBe('memory');
    expect(querySnapshot(state, 'revenue_v', 'b').path).toBe('compute');
    expect(querySnapshot(state, 'revenue_mv', 'a').path).toBe('storage');
    expect(querySnapshot(state, 'revenue_mv', 'b').path).toBe('memory');
    expect(querySnapshot(makeSnapshot(), 'revenue_mv', 'a')).toMatchObject({ path: 'unavailable', rows: [] });
  });

  it('keeps an old query observation separate from automatically maintained current state', () => {
    const beforeUpdate = objectLectures[0]!.lessons[2]!.snapshot;
    const afterUpdate = objectLectures[0]!.lessons[3]!.snapshot;
    expect(beforeUpdate.orders).toEqual(initialOrders);
    expect(afterUpdate.orders).toEqual(updatedOrders);
    expect(afterUpdate.query?.rows).toContainEqual({ region: 'North', revenue: 150 });
    expect(querySnapshot(afterUpdate, 'revenue_v', 'a').rows).toContainEqual({ region: 'North', revenue: 170 });
  });

  it('drops only serving index state and preserves the durable result and query availability', () => {
    const lecture = objectLectures[1]!;
    const before = lecture.lessons[3]!.snapshot;
    const after = lecture.lessons[4]!.snapshot;
    expect(before.setup.materializedIndexes).toEqual(['b']);
    expect(after.setup.materializedIndexes).toEqual([]);
    expect(after.setup.materialized).toBe(true);
    expect(after.setup.viewIndexes).toEqual(before.setup.viewIndexes);
    expect(after.orders).toEqual(before.orders);
    expect(after.query?.path).toBe('storage');
    expect(after.query?.rows).toEqual(before.query?.rows);
  });

  it('ends with one durable output, two local indexes and updated regional revenue', () => {
    const final = objectExercises[1]!.checkpoints[3]!.after;
    expect(final.setup).toMatchObject({ stacked: true, view: false, materialized: true, materializedIndexes: ['a', 'b'], viewIndexes: [] });
    expect(querySnapshot(final, 'revenue_v', 'a').path).toBe('unavailable');
    const intermediatesOnly = objectExercises[1]!.checkpoints[0]!.after;
    expect(intermediatesOnly.setup).toMatchObject({ stacked: true, view: false, materialized: false });
    expect(final.query).toMatchObject({ cluster: 'b', path: 'memory' });
    expect(final.query?.rows).toEqual([{ region: 'North', revenue: 170 }, { region: 'South', revenue: 80 }]);
  });
});

it('grades every prediction as a set and rejects blank, partial and extra answers', () => {
  for (const exercise of objectExercises) for (const checkpoint of exercise.checkpoints) {
    expect(gradeObjectPrediction(checkpoint, [...checkpoint.solution].reverse()).correct).toBe(true);
    expect(gradeObjectPrediction(checkpoint, []).correct).toBe(false);
    expect(gradeObjectPrediction(checkpoint, checkpoint.solution.slice(1)).correct).toBe(false);
    const distractor = checkpoint.choices.find(item => !checkpoint.solution.includes(item.id))!;
    expect(gradeObjectPrediction(checkpoint, [...checkpoint.solution, distractor.id]).correct).toBe(false);
    expect(checkpoint.before).not.toBe(checkpoint.after);
  }
});
