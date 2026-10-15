import { describe, expect, it } from 'vitest';
import { flowEdges } from './flowGraphModel';
import { objectLectures } from './scenario';
import { makeSnapshot, querySnapshot } from './simulation';

describe('Chapter 3 graph routes', () => {
  const setup = makeSnapshot({ view: true, materialized: true, viewIndexes: ['a'], materializedIndexes: ['b'] });
  it('maintains view indexes from input and materialized-view indexes from durable output', () => {
    const edges = flowEdges(setup, null, true, false);
    expect(edges).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'input', target: 'a-compute', kind: 'maintenance' }),
      expect.objectContaining({ source: 'a-compute', target: 'a-view-index', kind: 'maintenance' }),
      expect.objectContaining({ source: 'input', target: 'transform', kind: 'maintenance' }),
      expect.objectContaining({ source: 'transform', target: 'durable', kind: 'maintenance' }),
      expect.objectContaining({ source: 'durable', target: 'b-mv-index', kind: 'maintenance' }),
    ]));
    expect(edges.some(edge => edge.source === 'transform' && edge.target === 'b-mv-index')).toBe(false);
  });
  it('uses the requested cluster’s memory, its own compute, or external storage', () => {
    for (const [object, cluster, source] of [
      ['revenue_v', 'a', 'a-view-index'], ['revenue_v', 'b', 'b-compute'],
      ['revenue_mv', 'a', 'durable'], ['revenue_mv', 'b', 'b-mv-index'],
    ] as const) {
      const edges = flowEdges(setup, querySnapshot(setup, object, cluster), true, false);
      expect(edges).toContainEqual(expect.objectContaining({ source, target: `${cluster}-query`, kind: 'query' }));
      expect(edges.some(edge => edge.kind === 'query' && edge.source.startsWith(cluster === 'a' ? 'b-' : 'a-'))).toBe(false);
    }
  });
  it('removes only the local index path when a serving index is dropped', () => {
    const lecture = objectLectures[1]!;
    const before = lecture.lessons[3]!.snapshot, after = lecture.lessons[4]!.snapshot;
    expect(flowEdges(before, before.query, true, false)).toContainEqual(expect.objectContaining({ source: 'b-mv-index', target: 'b-query' }));
    const edges = flowEdges(after, after.query, true, false);
    expect(edges).toContainEqual(expect.objectContaining({ source: 'durable', target: 'b-query' }));
    expect(edges).toContainEqual(expect.objectContaining({ source: 'transform', target: 'durable' }));
    expect(edges.some(edge => edge.source === 'b-mv-index' || edge.target === 'b-mv-index')).toBe(false);
  });
  it('does not reveal a query path during a prediction, or invent a path for a missing object', () => {
    expect(flowEdges(setup, querySnapshot(setup, 'revenue_v', 'a'), true, true).filter(edge => edge.kind === 'query')).toEqual([]);
    const empty = makeSnapshot();
    expect(flowEdges(empty, querySnapshot(empty, 'revenue_v', 'b'), true, false)).toEqual([]);
  });
  it('keeps SQL definitions separate from result storage', () => {
    const definitionsOnly = makeSnapshot({ view: true, stacked: true });
    expect(flowEdges(definitionsOnly, null, true, false)).toEqual([]);
    expect(flowEdges(setup, null, true, false).filter(edge => edge.source === 'definitions').every(edge => edge.kind === 'definition')).toBe(true);
  });
});
