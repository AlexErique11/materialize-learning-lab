import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { gradePrediction, maintenanceExercises, resultDiffs, resultFor, solutionFor, type ExerciseState, type MaintenanceExercise } from './exercise-scenarios';

function sqlResult(exercise: MaintenanceExercise, state: ExerciseState) {
 const db = new DatabaseSync(':memory:');
 try {
  db.exec('CREATE TABLE orders(order_id INTEGER, product_id INTEGER, customer_id INTEGER, amount INTEGER, note TEXT); CREATE TABLE products(product_id INTEGER, name TEXT); CREATE TABLE customers(customer_id INTEGER, region TEXT, name TEXT);');
  for (const o of state.orders) db.prepare('INSERT INTO orders VALUES (?, ?, ?, ?, ?)').run(o.orderId, o.productId, o.productId, o.amount, o.note);
  for (const p of state.products) db.prepare('INSERT INTO products VALUES (?, ?)').run(p.productId, p.name);
  for (const c of state.customers) db.prepare('INSERT INTO customers VALUES (?, ?, ?)').run(c.customerId, c.region, c.name);
  return db.prepare(exercise.sql).all().map(row => Object.values(row));
 } finally { db.close(); }
}
const keys = (rows: readonly unknown[]) => rows.map(row => JSON.stringify(row)).sort();
const diffsAt = (exercise: MaintenanceExercise, index: number) => resultDiffs(exercise.kind, index ? exercise.checkpoints[index - 1]!.next : exercise.initial, exercise.checkpoints[index]!.next);
describe('Chapter 2 authored exercises', () => {
 it('contains two scenarios and six checkpoints', () => expect(maintenanceExercises.map(e => e.checkpoints.length)).toEqual([3, 3]));
 for (const exercise of maintenanceExercises) it(`${exercise.title}: every snapshot matches independent SQL and emitted diffs reconstruct it`, () => {
  let before = exercise.initial;
  expect(keys(resultFor(exercise.kind, before).map(Object.values))).toEqual(keys(sqlResult(exercise, before)));
  for (const checkpoint of exercise.checkpoints) {
   const after = checkpoint.next;
   expect(keys(resultFor(exercise.kind, after).map(Object.values))).toEqual(keys(sqlResult(exercise, after)));
   const reconstructed = new Map(resultFor(exercise.kind, before).map(row => [JSON.stringify(row), 1]));
   for (const { row, diff } of resultDiffs(exercise.kind, before, after)) { const key = JSON.stringify(row); reconstructed.set(key, (reconstructed.get(key) ?? 0) + diff); }
   expect([...reconstructed.values()].every(count => count === 0 || count === 1)).toBe(true);
   expect([...reconstructed].filter(([, count]) => count).map(([row]) => row).sort()).toEqual(keys(resultFor(exercise.kind, after)));
   before = after;
  }
 });
 it('accepts choices in any order and rejects missing or extra result rows', () => {
  for (const exercise of maintenanceExercises) for (let index = 0; index < exercise.checkpoints.length; index++) {
   const solution = solutionFor(exercise, index);
   expect(gradePrediction(exercise, index, { selections: solution.selections.map(s => [...s].reverse()) }).correct).toBe(true);
   expect(gradePrediction(exercise, index, { selections: solution.selections.map(s => s.slice(1)) }).correct).toBe(false);
   const wrong = solution.selections.map((selected, i) => [...selected, exercise.checkpoints[index]!.choices[i]!.options.find(option => !selected.includes(option))!]);
   expect(gradePrediction(exercise, index, { selections: wrong }).correct).toBe(false);
   const before = index ? exercise.checkpoints[index - 1]!.next : exercise.initial;
   const choice = exercise.checkpoints[index]!.choices.find(c => c.label.startsWith('Select every emitted result diff'))!;
   expect([...choice.expected].sort()).toEqual(resultDiffs(exercise.kind, before, exercise.checkpoints[index]!.next).map(({ row, diff }) => `${diff > 0 ? '+' : ''}${diff} (${Object.values(row).join(', ')})`).sort());
  }
 });
 it('covers threshold equality, an initially unmatched order and filtered fan-out', () => {
  const exercise = maintenanceExercises[0]!;
  expect(diffsAt(exercise, 0)).toEqual([{ row: { orderId: 201, name: 'Lamp', amount: 50 }, diff: 1 }]);
  expect(exercise.initial.orders.some(o => o.orderId === 204)).toBe(true);
  expect(resultFor(exercise.kind, exercise.initial).some(row => 'orderId' in row && row.orderId === 204)).toBe(false);
  expect(diffsAt(exercise, 1)).toEqual([{ row: { orderId: 204, name: 'Plant', amount: 70 }, diff: 1 }]);
  expect(diffsAt(exercise, 2)).toHaveLength(4);
  expect(exercise.checkpoints[2]!.choices![0]!.expected).toEqual(['201', '203']);
 });
 it('combines amount corrections, retained join fan-out and empty versus zero-valued groups', () => {
  const exercise = maintenanceExercises[1]!;
  expect(diffsAt(exercise, 0)).toHaveLength(2);
  expect(resultFor('region', exercise.checkpoints[0]!.next)).toEqual([{ region: 'East', count: 1, total: 0 }, { region: 'North', count: 2, total: 110 }, { region: 'South', count: 1, total: 40 }]);
  expect(diffsAt(exercise, 1)).toHaveLength(3);
  expect(resultFor('region', exercise.checkpoints[1]!.next)).toEqual([{ region: 'East', count: 1, total: 0 }, { region: 'South', count: 3, total: 150 }]);
  expect(diffsAt(exercise, 2)).toEqual([{ row: { region: 'East', count: 1, total: 0 }, diff: -1 }]);
  expect(resultFor('region', exercise.checkpoints[2]!.next)).toEqual([{ region: 'South', count: 3, total: 150 }]);
 });
});
