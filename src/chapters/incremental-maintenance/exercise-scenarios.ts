import { MINIMUM_AMOUNT, type Diff, type Order } from './scenario';
import { consolidate } from './simulation';
import type { Product } from './join-scenario';

export type ResultRow =
  | {
      orderId: number;
      name: string;
      amount: number;
    }
  | {
      region: string;
      count: number;
      total: number;
    };
export interface Customer {
  customerId: number;
  region: string;
  name: string;
}
export interface CustomerOrder {
  orderId: number;
  customerId: number;
  amount: number;
}
export interface ProductExerciseState {
  kind: 'join-filter';
  orders: Order[];
  products: Product[];
  customers: Customer[];
}
export interface RevenueExerciseState {
  kind: 'region';
  orders: CustomerOrder[];
  products: Product[];
  customers: Customer[];
}
export type ExerciseState = ProductExerciseState | RevenueExerciseState;
export interface ChoiceQuestion {
  label: string;
  options: readonly string[];
  expected: readonly string[];
}
export interface Checkpoint {
  title: string;
  question: string;
  hint: string;
  explanation: string;
  next: ExerciseState;

  choices: readonly ChoiceQuestion[];
}
export interface MaintenanceExercise {
  title: string;
  description: string;
  sql: string;
  initial: ExerciseState;
  checkpoints: readonly Checkpoint[];
  slug: string;
  kind: 'join-filter' | 'region';
}
const order = (orderId: number, productId: number, amount: number): Order => ({
  orderId,
  productId,
  amount,
  note: 'Standard',
});
const state = (orders: Order[], products: Product[]): ProductExerciseState => ({
  kind: 'join-filter',
  orders,
  products,
  customers: [],
});
const customerOrder = (orderId: number, customerId: number, amount: number): CustomerOrder => ({
  orderId,
  customerId,
  amount,
});
function patchAmount(s: ProductExerciseState, id: number, amount: number): ProductExerciseState;
function patchAmount(s: RevenueExerciseState, id: number, amount: number): RevenueExerciseState;
function patchAmount(s: ExerciseState, id: number, amount: number): ExerciseState {
  if (s.kind === 'region')
    return { ...s, orders: s.orders.map((row) => (row.orderId === id ? { ...row, amount } : row)) };
  return { ...s, orders: s.orders.map((row) => (row.orderId === id ? { ...row, amount } : row)) };
}
export function resultFor(kind: MaintenanceExercise['kind'], s: ExerciseState): ResultRow[] {
  if (kind !== s.kind) throw new Error('Exercise state does not match its scenario');
  if (s.kind === 'join-filter')
    return s.orders
      .filter((o) => o.amount >= MINIMUM_AMOUNT)
      .flatMap((o) =>
        s.products
          .filter((p) => p.productId === o.productId)
          .map((p) => ({ orderId: o.orderId, name: p.name, amount: o.amount }))
      );
  const groups = new Map<
    string,
    {
      count: number;
      total: number;
    }
  >();
  for (const o of s.orders) {
    const groupKeys = s.customers.filter((c) => c.customerId === o.customerId).map((c) => c.region);
    for (const key of groupKeys) {
      const old = groups.get(key) ?? { count: 0, total: 0 };
      groups.set(key, { count: old.count + 1, total: old.total + o.amount });
    }
  }
  return [...groups]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, values]) => ({ region: key, ...values }));
}
export function resultDiffs(
  kind: MaintenanceExercise['kind'],
  before: ExerciseState,
  after: ExerciseState
): Diff<ResultRow>[] {
  return consolidate([
    ...resultFor(kind, before).map((row) => ({ row, diff: -1 })),
    ...resultFor(kind, after).map((row) => ({ row, diff: 1 })),
  ]);
}
function joinFilterExercise(): MaintenanceExercise {
  const initial = state(
    [
      order(201, 11, 30),
      order(202, 12, 80),
      order(203, 11, 60),
      order(205, 11, 30),
      order(204, 13, 70),
    ],
    [
      { productId: 11, name: 'Lamp' },
      { productId: 12, name: 'Chair' },
    ]
  );
  const a = patchAmount(initial, 201, 50);
  const b = { ...a, products: [...a.products, { productId: 13, name: 'Plant' }] };
  const c = {
    ...b,
    products: b.products.map((p) => (p.productId === 11 ? { ...p, name: 'Light' } : p)),
  };
  const emitted = (options: string[], expected: string[]): ChoiceQuestion => ({
    label: 'Select every emitted result diff',
    options,
    expected,
  });
  const ids = ['201', '202', '203', '204', '205'];
  return {
    slug: 'exercise-1',
    kind: 'join-filter',
    title: 'Matches through the filter',
    description:
      'Three predictions covering the threshold, a late match and filtered fan-out. · 5–7 min',
    initial,
    sql: 'SELECT o.order_id, p.name, o.amount\nFROM orders AS o INNER JOIN products AS p\nON o.product_id = p.product_id\nWHERE o.amount >= 50;',
    checkpoints: [
      {
        title: 'Cross into the result',
        question: 'Order 201 changes from 30 to 50. Select every emitted result diff.',
        hint: 'A result row needs both a matching product and an amount of at least 50.',
        explanation:
          'Product 11 matches. The new amount qualifies exactly at the threshold; the old amount does not.',
        next: a,
        choices: [
          emitted(
            ['+1 (201, Lamp, 50)', '-1 (201, Lamp, 30)', '+1 (201, Lamp, 30)', 'No output change'],
            ['+1 (201, Lamp, 50)']
          ),
        ],
      },
      {
        title: 'The late match',
        question: 'Add product (13, Plant). Select every emitted result diff.',
        hint: 'Order 204 is already in Orders. Check its product key and amount.',
        explanation: 'Retained order 204 matches and qualifies.',
        next: b,
        choices: [
          emitted(
            [
              '+1 (204, Plant, 70)',
              '-1 (204, Plant, 70)',
              '+1 (204, Plant, 0)',
              'No output change',
            ],
            ['+1 (204, Plant, 70)']
          ),
        ],
      },
      {
        title: 'Fan-out meets WHERE',
        question:
          'Rename product 11 from Lamp to Light. Select affected result order IDs and every emitted diff.',
        hint: 'Three orders match product 11, but only two pass WHERE.',
        explanation: '201 and 203 replace their rows. Order 205 remains filtered out.',
        next: c,
        choices: [
          { label: 'Affected result order IDs', options: ids, expected: ['201', '203'] },
          emitted(
            [
              '-1 (201, Lamp, 50)',
              '+1 (201, Light, 50)',
              '-1 (203, Lamp, 60)',
              '+1 (203, Light, 60)',
              '-1 (205, Lamp, 30)',
              '+1 (205, Light, 30)',
            ],
            [
              '-1 (201, Lamp, 50)',
              '+1 (201, Light, 50)',
              '-1 (203, Lamp, 60)',
              '+1 (203, Light, 60)',
            ]
          ),
        ],
      },
    ],
  };
}
function groupedRevenueExercise(): MaintenanceExercise {
  const initial: RevenueExerciseState = {
    kind: 'region',
    orders: [
      customerOrder(101, 7, 30),
      customerOrder(102, 7, 50),
      customerOrder(103, 8, 40),
      customerOrder(104, 9, 0),
    ],
    products: [],
    customers: [
      { customerId: 7, region: 'North', name: 'Ada' },
      { customerId: 8, region: 'South', name: 'Ben' },
      { customerId: 9, region: 'East', name: 'Cy' },
    ],
  };
  const a = patchAmount(initial, 101, 60);
  const b = {
    ...a,
    customers: a.customers.map((c) => (c.customerId === 7 ? { ...c, region: 'South' } : c)),
  };
  const c = { ...b, orders: b.orders.filter((o) => o.orderId !== 104) };
  const affected = (expected: string[]): ChoiceQuestion => ({
    label: 'Groups updated incrementally',
    options: ['North', 'South', 'East'],
    expected,
  });
  const emitted = (options: string[], expected: string[]): ChoiceQuestion => ({
    label: 'Select every emitted result diff (region, count, revenue)',
    options,
    expected,
  });
  return {
    slug: 'exercise-3',
    kind: 'region',
    title: 'Maintain revenue by region',
    description:
      'Three predictions combining grouped revenue, retained joins and incremental maintenance. · 6–8 min',
    initial,
    sql: 'SELECT c.region, COUNT(*) AS order_count,\nSUM(o.amount) AS revenue\nFROM orders AS o INNER JOIN customers AS c\nON o.customer_id = c.customer_id\nGROUP BY c.region;',
    checkpoints: [
      {
        title: 'Correct an amount',
        question:
          'Order 101 changes from 30 to 60. Select the updated groups and every result diff.',
        hint: 'North still has two orders. Replace its complete count and revenue row.',
        explanation:
          'North changes from (North, 2, 80) to (North, 2, 110). Recompute rebuilds all groups; maintenance updates only North.',
        next: a,
        choices: [
          affected(['North']),
          emitted(
            ['-1 (North, 2, 80)', '+1 (North, 2, 110)', '+1 (North, 3, 110)', 'No output change'],
            ['-1 (North, 2, 80)', '+1 (North, 2, 110)']
          ),
        ],
      },
      {
        title: 'Revenue moves between regions',
        question:
          'Customer 7 moves from North to South. Select the updated groups and every result diff.',
        hint: 'Both retained orders move. South already has one order worth 40.',
        explanation:
          'North loses both members and disappears. South becomes (South, 3, 150). East stays (East, 1, 0).',
        next: b,
        choices: [
          affected(['North', 'South']),
          emitted(
            [
              '-1 (North, 2, 110)',
              '-1 (South, 1, 40)',
              '+1 (South, 3, 150)',
              '+1 (North, 0, 0)',
              '+1 (South, 2, 110)',
            ],
            ['-1 (North, 2, 110)', '-1 (South, 1, 40)', '+1 (South, 3, 150)']
          ),
        ],
      },
      {
        title: 'Zero revenue versus an empty group',
        question:
          'Cancel order 104, East’s only order, worth 0. Select the updated groups and every result diff.',
        hint: 'A present order counts even at zero revenue. An empty group has no result row.',
        explanation:
          'Retract (East, 1, 0). Do not insert (East, 0, 0): the group is now absent. South is unchanged.',
        next: c,
        choices: [
          affected(['East']),
          emitted(
            ['-1 (East, 1, 0)', '+1 (East, 0, 0)', '-1 (South, 3, 150)', 'No output change'],
            ['-1 (East, 1, 0)']
          ),
        ],
      },
    ],
  };
}
export const maintenanceExercises = [joinFilterExercise(), groupedRevenueExercise()];
export interface Prediction {
  selections: readonly string[][];
}
export function solutionFor(exercise: MaintenanceExercise, index: number): Prediction {
  return { selections: exercise.checkpoints[index]!.choices.map((c) => [...c.expected]) };
}
const selectionKey = (values: readonly string[]) => [...values].sort().join('|');
export function gradePrediction(exercise: MaintenanceExercise, index: number, answer: Prediction) {
  const checkpoint = exercise.checkpoints[index]!,
    errors: Record<string, string> = {};
  checkpoint.choices.forEach((choice, i) => {
    if (selectionKey(answer.selections[i] ?? []) !== selectionKey(choice.expected))
      errors[`choice${i}`] = `Recheck ${choice.label.toLowerCase()}. ${checkpoint.hint}`;
  });
  const correct = Object.keys(errors).length === 0;
  return {
    correct,
    title: [correct ? 'Batch accepted' : 'Recheck your prediction'],
    explanation: [correct ? checkpoint.explanation : Object.values(errors)[0]!],
    errors,
  };
}
