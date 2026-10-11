import { describe, expect, it } from 'vitest';

import {
  inferLineConstraints,
  pruneOrphanConstraints,
} from '@/features/facility-map/sketch/constraints/autoConstraints';
import { solveSketchConstraints } from '@/features/facility-map/sketch/constraints/constraintSolver';
import type { LineEntity, SketchConstraint, SketchEntity } from '@/features/facility-map/sketch/core/types';

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

describe('edit-aware solving of auto-constrained chains', () => {
  // A rectangle drawn as one Line chain: (0,0)->(100,0)->(100,50)->(0,50)->(0,0).
  const chainRectangle = () => {
    let id = 0;
    const nextId = (kind: string) => `${kind}-${(id += 1)}`;
    const segments = [
      line('l1', 0, 0, 100, 0),
      line('l2', 100, 0, 100, 50),
      line('l3', 100, 50, 0, 50),
      line('l4', 0, 50, 0, 0),
    ];
    const drawn: LineEntity[] = [];
    const constraints: SketchConstraint[] = [];
    for (const segment of segments) {
      constraints.push(...inferLineConstraints(drawn, segment, nextId));
      drawn.push(segment);
    }
    return { entities: drawn, constraints };
  };
  const byId = (entities: SketchEntity[]) => new Map(entities.map((e) => [e.id, e as LineEntity]));
  const expectAllSatisfied = (entities: SketchEntity[]) => {
    const m = byId(entities);
    const [l1, l2, l3, l4] = ['l1', 'l2', 'l3', 'l4'].map((k) => m.get(k)!);
    expect(l1.y2).toBeCloseTo(l1.y1, 6);
    expect(l3.y2).toBeCloseTo(l3.y1, 6);
    expect(l2.x2).toBeCloseTo(l2.x1, 6);
    expect(l4.x2).toBeCloseTo(l4.x1, 6);
    expect([l2.x1, l2.y1]).toEqual([expect.closeTo(l1.x2, 6), expect.closeTo(l1.y2, 6)]);
    expect([l3.x1, l3.y1]).toEqual([expect.closeTo(l2.x2, 6), expect.closeTo(l2.y2, 6)]);
    expect([l4.x1, l4.y1]).toEqual([expect.closeTo(l3.x2, 6), expect.closeTo(l3.y2, 6)]);
    expect([l4.x2, l4.y2]).toEqual([expect.closeTo(l1.x1, 6), expect.closeTo(l1.y1, 6)]);
  };

  it('dragging a later segment moves it and its neighbours follow (no snap-back)', () => {
    const { entities, constraints } = chainRectangle();
    const edited = entities.map((e) => (e.id === 'l2' ? { ...e, x1: 130, x2: 130 } : e));
    const solved = solveSketchConstraints(edited, constraints, { previousEntities: entities });
    const m = byId(solved.entities);
    expect(m.get('l2')!.x1).toBeCloseTo(130, 6);
    expect(m.get('l1')!.x2).toBeCloseTo(130, 6);
    expect(m.get('l3')!.x1).toBeCloseTo(130, 6);
    expectAllSatisfied(solved.entities);
    expect(solved.converged).toBe(true);
  });

  it('moving the top edge resizes the rectangle and keeps every H/V and corner', () => {
    const { entities, constraints } = chainRectangle();
    const edited = entities.map((e) => (e.id === 'l3' ? { ...e, y1: 80, y2: 80 } : e));
    const solved = solveSketchConstraints(edited, constraints, { previousEntities: entities });
    expect(byId(solved.entities).get('l2')!.y2).toBeCloseTo(80, 6);
    expect(byId(solved.entities).get('l4')!.y1).toBeCloseTo(80, 6);
    expectAllSatisfied(solved.entities);
  });

  it('a grip drag on a corner closes the loop correctly instead of slanting a vertical side', () => {
    const { entities, constraints } = chainRectangle();
    const edited = entities.map((e) => (e.id === 'l3' ? { ...e, x2: -30 } : e));
    const solved = solveSketchConstraints(edited, constraints, { previousEntities: entities });
    const m = byId(solved.entities);
    expect(m.get('l4')!.x1).toBeCloseTo(-30, 6);
    expect(m.get('l4')!.x2).toBeCloseTo(-30, 6);
    expect(m.get('l1')!.x1).toBeCloseTo(-30, 6);
    expectAllSatisfied(solved.entities);
    expect(solved.converged).toBe(true);
  });

  it('a dimension edit on the closing segment sticks', () => {
    const { entities, constraints } = chainRectangle();
    // Length of l4 (0,50)->(0,0) changed to 80: its end moves to (0,-30).
    const edited = entities.map((e) => (e.id === 'l4' ? { ...e, y2: -30 } : e));
    const solved = solveSketchConstraints(edited, constraints, { previousEntities: entities });
    const m = byId(solved.entities);
    expect(Math.abs(m.get('l4')!.y1 - m.get('l4')!.y2)).toBeCloseTo(80, 6);
    expectAllSatisfied(solved.entities);
  });

  it('keeps a chained segment on the endpoint it started from even after a large move', () => {
    const first = line('l1', 0, 0, 10, 0);
    const second = line('l2', 10, 0, 10, 100);
    const constraints = [
      ...inferLineConstraints([], first, createId),
      ...inferLineConstraints([first], second, createId),
    ];
    const moved = { ...first, x1: 6, x2: 16 };
    const solved = solveSketchConstraints([moved, second], constraints, { previousEntities: [first, second] });
    const m = byId(solved.entities);
    expect(m.get('l2')!.x1).toBeCloseTo(16, 6);
    expect(m.get('l2')!.x2).toBeCloseTo(16, 6);
  });

  it('does not report convergence while a constraint is still violated', () => {
    // Two fixed lines joined by a coincident constraint can never meet: each
    // iteration moves one end and Fix puts it straight back, so nothing changes
    // between iterations even though the corner is still 10 units apart.
    const a = line('a', 0, 0, 10, 0);
    const b = line('b', 20, 0, 30, 0);
    const solved = solveSketchConstraints([a, b], [
      { id: 'fa', kind: 'fix', entityIds: ['a'], fixedGeometry: a },
      { id: 'fb', kind: 'fix', entityIds: ['b'], fixedGeometry: b },
      { id: 'c', kind: 'coincident', entityIds: ['a', 'b'], pointRefs: [{ entityId: 'a', point: 'end' }, { entityId: 'b', point: 'start' }] },
    ]);
    expect(solved.converged).toBe(false);
  });
});
