import { describe, expect, it } from 'vitest';

import {
  inferLineConstraints,
  pruneOrphanConstraints,
} from '@/features/facility-map/sketch/constraints/autoConstraints';
import { solveSketchConstraints } from '@/features/facility-map/sketch/constraints/constraintSolver';
import type { LineEntity, SketchConstraint } from '@/features/facility-map/sketch/core/types';

const style = { color: '#000000', lineWidth: 1 };
const line = (id: string, x1: number, y1: number, x2: number, y2: number): LineEntity => ({
  ...style, id, type: 'line', x1, y1, x2, y2,
});
let n = 0;
const createId = (kind: string) => `${kind}-${(n += 1)}`;

describe('inferLineConstraints', () => {
  it('adds horizontal to an exactly horizontal line', () => {
    const result = inferLineConstraints([], line('a', 0, 5, 10, 5), createId);
    expect(result.map((c) => c.kind)).toEqual(['horizontal']);
    expect(result[0].entityIds).toEqual(['a']);
  });

  it('adds vertical to an exactly vertical line', () => {
    expect(inferLineConstraints([], line('a', 3, 0, 3, 9), createId).map((c) => c.kind)).toEqual(['vertical']);
  });

  it('adds nothing for a slanted, unconnected line', () => {
    expect(inferLineConstraints([], line('a', 0, 0, 10, 4), createId)).toEqual([]);
  });

  it('glues each endpoint that lands on another line endpoint', () => {
    const previous = line('prev', 0, 0, 10, 0);
    const next = line('next', 4, 8, 0, 0);
    const closing = line('closing', 10, 0, 4, 8);
    const result = inferLineConstraints([previous, next], closing, createId);
    const coincident = result.filter((c) => c.kind === 'coincident');
    expect(coincident).toHaveLength(2);
    expect(coincident[0]).toMatchObject({
      entityIds: ['prev', 'closing'],
      pointRefs: [{ entityId: 'prev', point: 'end' }, { entityId: 'closing', point: 'start' }],
    });
    expect(coincident[1]).toMatchObject({
      entityIds: ['next', 'closing'],
      pointRefs: [{ entityId: 'next', point: 'start' }, { entityId: 'closing', point: 'end' }],
    });
  });

  it('adds only one coincident per endpoint at a multi-line junction', () => {
    const a = line('a', 0, 0, 10, 0);
    const b = line('b', 10, 0, 10, 10);
    const result = inferLineConstraints([a, b], line('c', 10, 0, 20, 5), createId);
    expect(result.filter((c) => c.kind === 'coincident')).toHaveLength(1);
  });

  it('ignores a zero-length line', () => {
    expect(inferLineConstraints([], line('a', 1, 1, 1, 1), createId)).toEqual([]);
  });

  it('produces constraints the solver keeps satisfied when a chain is edited', () => {
    const first = line('first', 0, 0, 10, 0);
    const second = line('second', 10, 0, 10, 6);
    const constraints = [
      ...inferLineConstraints([], first, createId),
      ...inferLineConstraints([first], second, createId),
    ];
    // Drag the first line's end off the shared corner and off horizontal.
    const dragged = { ...first, x2: 12, y2: 3 };
    const solved = solveSketchConstraints([dragged, second], constraints);
    const [solvedFirst, solvedSecond] = solved.entities as LineEntity[];
    expect(solvedFirst.y2).toBeCloseTo(solvedFirst.y1, 6);
    expect(solvedSecond.x1).toBeCloseTo(solvedFirst.x2, 6);
    expect(solvedSecond.y1).toBeCloseTo(solvedFirst.y2, 6);
  });
});

describe('pruneOrphanConstraints', () => {
  const constraints: SketchConstraint[] = [
    { id: 'h', kind: 'horizontal', entityIds: ['a'] },
    { id: 'c', kind: 'coincident', entityIds: ['a', 'gone'] },
  ];

  it('drops constraints that reference a missing entity', () => {
    expect(pruneOrphanConstraints([line('a', 0, 0, 1, 0)], constraints).map((c) => c.id)).toEqual(['h']);
  });

  it('returns the same array when nothing is orphaned', () => {
    const kept = constraints.slice(0, 1);
    expect(pruneOrphanConstraints([line('a', 0, 0, 1, 0)], kept)).toBe(kept);
  });
});
