import { describe, expect, it, vi } from 'vitest';

import {
  findClosestEntityPointsSnap,
  findClosestEntitySnap,
  findClosestIntersectionSnap,
} from '@/features/facility-map/sketch/snapping/closestSnap';
import type {
  SketchEntity,
  SketchPoint,
} from '@/features/facility-map/sketch/core/types';

const style = {
  color: '#000000',
  lineWidth: 1,
};

const circle = (id: string, cx: number, cy: number): SketchEntity => ({
  id,
  type: 'circle',
  cx,
  cy,
  r: 1,
  ...style,
});

const circleCenter = (entity: SketchEntity): SketchPoint | null =>
  entity.type === 'circle' ? { x: entity.cx, y: entity.cy } : null;

const origin: SketchPoint = { x: 0, y: 0 };

/**
 * Candidate i at `distances[i]` from the origin, each on its own axis
 * direction so candidates at equal distance stay distinguishable.
 */
const candidatesAt = (distances: number[]): SketchPoint[] =>
  distances.map((d, i) => [{ x: d, y: 0 }, { x: 0, y: d }, { x: -d, y: 0 }][i]);

type SnapWinner = { index: number; distance: number } | null;

const winnerOf = (
  candidates: SketchPoint[],
  result: { point: SketchPoint; distance: number } | null,
): SnapWinner =>
  result && {
    index: candidates.findIndex(
      (candidate) => candidate.x === result.point.x && candidate.y === result.point.y,
    ),
    distance: result.distance,
  };

const closestSnapHelpers: [
  string,
  (candidates: SketchPoint[], threshold: number) => SnapWinner,
][] = [
  [
    'findClosestEntitySnap',
    (candidates, threshold) =>
      winnerOf(
        candidates,
        findClosestEntitySnap(
          origin,
          candidates.map((candidate, i) => circle(`c${i}`, candidate.x, candidate.y)),
          threshold,
          circleCenter,
        ),
      ),
  ],
  [
    'findClosestEntityPointsSnap',
    (candidates, threshold) =>
      winnerOf(
        candidates,
        findClosestEntityPointsSnap(origin, [circle('c', 0, 0)], threshold, () => candidates),
      ),
  ],
  [
    'findClosestIntersectionSnap',
    (candidates, threshold) =>
      winnerOf(
        candidates,
        findClosestIntersectionSnap(
          origin,
          candidates.map((point, i) => ({ point, entityIds: [`a${i}`, `b${i}`] })),
          threshold,
        ),
      ),
  ],
];

describe.each(closestSnapHelpers)('%s acceptance rule', (_name, closest) => {
  it('accepts a candidate strictly inside the threshold when there is no best yet', () => {
    expect(closest(candidatesAt([2.9]), 3)).toEqual({ index: 0, distance: 2.9 });
    expect(closest(candidatesAt([0]), 3)).toEqual({ index: 0, distance: 0 });
  });

  it('rejects a candidate at or outside the threshold', () => {
    expect(closest(candidatesAt([3]), 3)).toBeNull();
    expect(closest(candidatesAt([3.1]), 3)).toBeNull();
  });

  it('only replaces the best when strictly closer, so ties keep the earlier one', () => {
    expect(closest(candidatesAt([2, 1]), 3)).toEqual({ index: 1, distance: 1 });
    expect(closest(candidatesAt([2, 2]), 3)).toEqual({ index: 0, distance: 2 });
    expect(closest(candidatesAt([2, 2.5]), 3)).toEqual({ index: 0, distance: 2 });
  });
});

describe('findClosestEntitySnap', () => {
  it('returns the closest snap point inside the threshold with its entity and distance', () => {
    const entities = [circle('far', 10, 0), circle('near', 4, 0)];

    expect(
      findClosestEntitySnap({ x: 5, y: 0 }, entities, 3, circleCenter),
    ).toEqual({
      point: { x: 4, y: 0 },
      entityId: 'near',
      distance: 1,
    });
  });

  it('skips entities without a snap point', () => {
    const line: SketchEntity = {
      id: 'line',
      type: 'line',
      x1: 5,
      y1: 0,
      x2: 6,
      y2: 0,
      ...style,
    };

    expect(
      findClosestEntitySnap({ x: 5, y: 0 }, [line], 3, circleCenter),
    ).toBeNull();
    expect(
      findClosestEntitySnap(
        { x: 5, y: 0 },
        [line, circle('center', 6, 0)],
        3,
        circleCenter,
      ),
    ).toMatchObject({ entityId: 'center' });
  });

  it('keeps the first entity on equal distance', () => {
    const entities = [circle('first', 4, 0), circle('second', 6, 0)];

    expect(
      findClosestEntitySnap({ x: 5, y: 0 }, entities, 3, circleCenter),
    ).toMatchObject({ entityId: 'first', point: { x: 4, y: 0 } });
  });

  it('does not snap at or outside the threshold, or with no entities', () => {
    expect(
      findClosestEntitySnap(
        { x: 0, y: 0 },
        [circle('edge', 3, 0)],
        3,
        circleCenter,
      ),
    ).toBeNull();
    expect(
      findClosestEntitySnap({ x: 0, y: 0 }, [], 3, circleCenter),
    ).toBeNull();
  });

  it('returns a copy of the snap point, not the object the callback produced', () => {
    const shared = { x: 1, y: 1 };
    const result = findClosestEntitySnap(
      { x: 0, y: 0 },
      [circle('c', 0, 0)],
      3,
      () => shared,
    );

    expect(result?.point).toEqual(shared);
    expect(result?.point).not.toBe(shared);
  });

  it('asks for the snap point of every entity once, in order', () => {
    const entities = [circle('a', 0, 0), circle('b', 1, 0), circle('c', 2, 0)];
    const getSnapPoint = vi.fn(circleCenter);

    findClosestEntitySnap({ x: 0, y: 0 }, entities, 3, getSnapPoint);

    expect(getSnapPoint.mock.calls.map(([entity]) => entity.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });
});

describe('findClosestEntityPointsSnap', () => {
  const twoPoints = (entity: SketchEntity): SketchPoint[] =>
    entity.type === 'circle'
      ? [
          { x: entity.cx - 1, y: entity.cy },
          { x: entity.cx + 1, y: entity.cy },
        ]
      : [];

  it('returns the closest point across every entity point list', () => {
    const entities = [circle('a', 0, 0), circle('b', 10, 0)];

    expect(
      findClosestEntityPointsSnap({ x: 8.5, y: 0 }, entities, 3, twoPoints),
    ).toEqual({
      point: { x: 9, y: 0 },
      entityId: 'b',
      distance: 0.5,
    });
  });

  it('keeps the earlier point on equal distance, within and across entities', () => {
    expect(
      findClosestEntityPointsSnap(
        { x: 0, y: 0 },
        [circle('only', 0, 0)],
        3,
        twoPoints,
      ),
    ).toMatchObject({ point: { x: -1, y: 0 }, entityId: 'only' });

    expect(
      findClosestEntityPointsSnap(
        { x: 2, y: 0 },
        [circle('first', 0, 0), circle('second', 4, 0)],
        3,
        twoPoints,
      ),
    ).toMatchObject({ point: { x: 1, y: 0 }, entityId: 'first' });
  });

  it('does not snap at or outside the threshold, or when no entity has points', () => {
    expect(
      findClosestEntityPointsSnap(
        { x: 4, y: 0 },
        [circle('edge', 0, 0)],
        3,
        twoPoints,
      ),
    ).toBeNull();
    expect(
      findClosestEntityPointsSnap(
        { x: 0, y: 0 },
        [circle('none', 0, 0)],
        3,
        () => [],
      ),
    ).toBeNull();
  });

  it('returns a copy of the snap point', () => {
    const shared = { x: 1, y: 0 };
    const result = findClosestEntityPointsSnap(
      { x: 0, y: 0 },
      [circle('c', 0, 0)],
      3,
      () => [shared],
    );

    expect(result?.point).toEqual(shared);
    expect(result?.point).not.toBe(shared);
  });
});

describe('findClosestIntersectionSnap', () => {
  it('returns the closest intersection inside the threshold with both entity ids', () => {
    expect(
      findClosestIntersectionSnap(
        { x: 14, y: 0 },
        [
          { point: { x: 5, y: 0 }, entityIds: ['h', 'v1'] },
          { point: { x: 15, y: 0 }, entityIds: ['h', 'v2'] },
        ],
        3,
      ),
    ).toEqual({
      point: { x: 15, y: 0 },
      entityIds: ['h', 'v2'],
      distance: 1,
    });
  });

  it('keeps the earlier intersection on equal distance', () => {
    expect(
      findClosestIntersectionSnap(
        { x: 0, y: 0 },
        [
          { point: { x: 1, y: 0 }, entityIds: ['a', 'b'] },
          { point: { x: -1, y: 0 }, entityIds: ['c', 'd'] },
        ],
        3,
      ),
    ).toMatchObject({ entityIds: ['a', 'b'] });
  });

  it('does not snap at or outside the threshold, or without intersections', () => {
    expect(
      findClosestIntersectionSnap(
        { x: 0, y: 0 },
        [{ point: { x: 0, y: 3 }, entityIds: ['a', 'b'] }],
        3,
      ),
    ).toBeNull();
    expect(findClosestIntersectionSnap({ x: 0, y: 0 }, [], 3)).toBeNull();
  });

  it('copies the point but keeps the entity id pair of the winning candidate', () => {
    const candidate = {
      point: { x: 1, y: 1 },
      entityIds: ['a', 'b'] as [string, string],
    };
    const result = findClosestIntersectionSnap({ x: 0, y: 0 }, [candidate], 3);

    expect(result?.point).toEqual(candidate.point);
    expect(result?.point).not.toBe(candidate.point);
    expect(result?.entityIds).toBe(candidate.entityIds);
  });
});
