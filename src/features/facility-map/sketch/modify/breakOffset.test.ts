import { describe, expect, it } from 'vitest';

import {
  breakLineAtPoint,
  createOffsetEntity,
  findConnectedChain,
  offsetArc,
  offsetChain,
  offsetCircle,
  offsetLine,
  offsetPolyline,
} from '@/features/facility-map/sketch/modify/breakOffset';
import type {
  ArcEntity,
  CircleEntity,
  LineEntity,
  PolylineEntity,
  SketchEntity,
} from '@/features/facility-map/sketch/core/types';

const style = { color: '#000000', lineWidth: 1 };

const line: LineEntity = {
  ...style,
  id: 'line',
  type: 'line',
  x1: 0,
  y1: 0,
  x2: 10,
  y2: 0,
};

describe('break/offset modify', () => {
  it('breaks a line into two entities at the projected click point', () => {
    let nextId = 0;
    const result = breakLineAtPoint(
      [line],
      line,
      { x: 4, y: 3 },
      () => `part-${nextId += 1}`,
    )!;

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: 'part-1',
      x1: 0,
      y1: 0,
      x2: 4,
      y2: 0,
    });
    expect(result[1]).toMatchObject({
      id: 'part-2',
      x1: 4,
      y1: 0,
      x2: 10,
      y2: 0,
    });
  });

  it('rejects break points at line endpoints', () => {
    expect(
      breakLineAtPoint([line], line, { x: 0, y: 0 }, () => 'part'),
    ).toBeNull();
  });

  it('offsets a line toward the click side', () => {
    const above = offsetLine(
      line,
      5,
      { x: 5, y: 10 },
      'offset-above',
    )!;
    const below = offsetLine(
      line,
      5,
      { x: 5, y: -10 },
      'offset-below',
    )!;

    expect(above).toMatchObject({ y1: 5, y2: 5 });
    expect(below).toMatchObject({ y1: -5, y2: -5 });
  });

  it('offsets an open polyline while preserving point count', () => {
    const polyline: PolylineEntity = {
      ...style,
      id: 'polyline',
      type: 'polyline',
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
      ],
    };

    const offset = offsetPolyline(
      polyline,
      2,
      { x: 5, y: 4 },
      'offset-polyline',
    )!;

    expect(offset.id).toBe('offset-polyline');
    expect(offset.points).toHaveLength(3);
    expect(offset.points[0]).toEqual({ x: 0, y: 2 });
    // The 90° corner at (10, 0) is the miter join: the offset edges are the
    // lines y = 2 and x = 8, so the corner vertex must land exactly at
    // their intersection (8, 2) — not merely `distance` away from (10, 0)
    // along the un-scaled bisector, which would under-shoot to (8.59, 1.41).
    expect(offset.points[1].x).toBeCloseTo(8, 9);
    expect(offset.points[1].y).toBeCloseTo(2, 9);
  });

  it('miters a closed rectangle so every offset edge stays a uniform distance away', () => {
    const rectangle: PolylineEntity = {
      ...style,
      id: 'rectangle',
      type: 'polyline',
      closed: true,
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ],
    };

    const offset = offsetPolyline(
      rectangle,
      2,
      { x: 5, y: 5 },
      'offset-rect',
    )!;

    expect(offset.points).toEqual([
      { x: 2, y: 2 },
      { x: 8, y: 2 },
      { x: 8, y: 8 },
      { x: 2, y: 8 },
    ]);
  });

  it('grows a rectangle when the click lands on or outside its border, shrinks it when inside', () => {
    const rect: SketchEntity = {
      ...style,
      id: 'rect',
      type: 'rect',
      x: 0,
      y: 0,
      w: 40,
      h: 20,
    };
    expect(createOffsetEntity(rect, 5, { x: 0, y: 10 }, 'grown')).toMatchObject({
      id: 'grown', type: 'rect', x: -5, y: -5, w: 50, h: 30,
    });
    expect(createOffsetEntity(rect, 5, { x: 20, y: 10 }, 'shrunk')).toMatchObject({
      id: 'shrunk', type: 'rect', x: 5, y: 5, w: 30, h: 10,
    });
    // Shrinking past the short side would invert the rectangle.
    expect(createOffsetEntity(rect, 10, { x: 20, y: 10 }, 'gone')).toBeNull();
  });

  it('normalises a rectangle drawn right-to-left before offsetting it', () => {
    const rect: SketchEntity = {
      ...style,
      id: 'rect',
      type: 'rect',
      x: 40,
      y: 20,
      w: -40,
      h: -20,
    };
    expect(createOffsetEntity(rect, 5, { x: 60, y: 10 }, 'grown')).toMatchObject({
      x: -5, y: -5, w: 50, h: 30,
    });
  });

  it('grows a circle when the click lands outside it, shrinks it when inside', () => {
    const circle: CircleEntity = {
      ...style,
      id: 'circle',
      type: 'circle',
      cx: 0,
      cy: 0,
      r: 10,
    };

    const grown = offsetCircle(circle, 5, { x: 20, y: 0 }, 'grown')!;
    expect(grown).toMatchObject({ id: 'grown', r: 15, cx: 0, cy: 0 });

    const shrunk = offsetCircle(circle, 5, { x: 2, y: 0 }, 'shrunk')!;
    expect(shrunk).toMatchObject({ id: 'shrunk', r: 5, cx: 0, cy: 0 });

    expect(offsetCircle(circle, 15, { x: 2, y: 0 }, 'invalid')).toBeNull();
  });

  it('grows or shrinks an arc the same way, keeping its angular sweep', () => {
    const arc: ArcEntity = {
      ...style,
      id: 'arc',
      type: 'arc',
      cx: 0,
      cy: 0,
      r: 10,
      startAngleDeg: 0,
      endAngleDeg: 90,
      clockwise: false,
    };

    const grown = offsetArc(arc, 5, { x: 20, y: 0 }, 'grown')!;
    expect(grown).toMatchObject({
      id: 'grown',
      r: 15,
      startAngleDeg: 0,
      endAngleDeg: 90,
    });

    const shrunk = offsetArc(arc, 5, { x: 2, y: 0 }, 'shrunk')!;
    expect(shrunk).toMatchObject({ r: 5, startAngleDeg: 0, endAngleDeg: 90 });
  });

  it('walks a closed loop of separate lines back to its start (a trimmed rectangle)', () => {
    const bottom: LineEntity = { ...style, id: 'bottom', type: 'line', x1: 0, y1: 0, x2: 10, y2: 0 };
    const right: LineEntity = { ...style, id: 'right', type: 'line', x1: 10, y1: 0, x2: 10, y2: 10 };
    const top: LineEntity = { ...style, id: 'top', type: 'line', x1: 10, y1: 10, x2: 0, y2: 10 };
    const left: LineEntity = { ...style, id: 'left', type: 'line', x1: 0, y1: 10, x2: 0, y2: 0 };
    const entities = [bottom, right, top, left];

    const chain = findConnectedChain(entities, 'bottom')!;
    expect(chain.closed).toBe(true);
    expect(new Set(chain.segments.map((segment) => segment.entityId))).toEqual(
      new Set(['bottom', 'right', 'top', 'left']),
    );
    expect(chain.segments.map((segment) => segment.a)).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ]);
  });

  it('stops an open chain at a free end instead of closing it', () => {
    const a: LineEntity = { ...style, id: 'a', type: 'line', x1: 0, y1: 0, x2: 10, y2: 0 };
    const b: LineEntity = { ...style, id: 'b', type: 'line', x1: 10, y1: 0, x2: 10, y2: 10 };
    const chain = findConnectedChain([a, b], 'a')!;
    expect(chain.closed).toBe(false);
    expect(chain.segments.map((segment) => segment.a)).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ]);
    expect(chain.segments[chain.segments.length - 1].b).toEqual({ x: 10, y: 10 });
  });

  it('stops extending at an ambiguous T-junction rather than guessing', () => {
    const a: LineEntity = { ...style, id: 'a', type: 'line', x1: 0, y1: 0, x2: 10, y2: 0 };
    const branch1: LineEntity = { ...style, id: 'branch1', type: 'line', x1: 10, y1: 0, x2: 10, y2: 10 };
    const branch2: LineEntity = { ...style, id: 'branch2', type: 'line', x1: 10, y1: 0, x2: 20, y2: 0 };
    const chain = findConnectedChain([a, branch1, branch2], 'a')!;
    expect(chain.closed).toBe(false);
    expect(chain.segments.map((segment) => segment.entityId)).toEqual(['a']);
  });

  it('reports a trivial one-entity chain for a line with no connected neighbors', () => {
    expect(findConnectedChain([line], 'line')).toMatchObject({
      closed: false,
      segments: [{ entityId: 'line' }],
    });
  });

  it('offsets a whole trimmed-rectangle chain as one loop, like Inventor offsetting a closed profile from one picked edge', () => {
    const bottom: LineEntity = { ...style, id: 'bottom', type: 'line', x1: 0, y1: 0, x2: 10, y2: 0 };
    const right: LineEntity = { ...style, id: 'right', type: 'line', x1: 10, y1: 0, x2: 10, y2: 10 };
    const top: LineEntity = { ...style, id: 'top', type: 'line', x1: 10, y1: 10, x2: 0, y2: 10 };
    const left: LineEntity = { ...style, id: 'left', type: 'line', x1: 0, y1: 10, x2: 0, y2: 0 };
    const entities = [bottom, right, top, left];
    let nextId = 0;

    const result = offsetChain(entities, bottom, 2, { x: 5, y: 5 }, () => `chain-${nextId += 1}`)!;
    expect(result.chain.segments).toHaveLength(4);
    expect(result.offsetEntities).toHaveLength(4);
    expect(result.offsetEntities.every((created) => created.type === 'line')).toBe(true);

    const corners = new Set(
      result.offsetEntities.flatMap((created) =>
        created.type === 'line' ? [`${created.x1},${created.y1}`, `${created.x2},${created.y2}`] : [],
      ),
    );
    expect(corners).toEqual(new Set(['2,2', '8,2', '8,8', '2,8']));

    // Original lines are untouched — offset adds new entities, it doesn't
    // rewrite the source geometry.
    expect(entities).toEqual([bottom, right, top, left]);
  });

  it('offsets a closed loop mixing Line and Arc segments (a rounded corner) as one profile', () => {
    // A "D" shape: flat bottom and sides, a semicircular arc bulging
    // outward on top — the realistic case of a Trim'd/Filleted rectangle
    // where one corner is an Arc instead of two Lines meeting at a point.
    const bottom: LineEntity = { ...style, id: 'bottom', type: 'line', x1: 0, y1: 0, x2: 10, y2: 0 };
    const right: LineEntity = { ...style, id: 'right', type: 'line', x1: 10, y1: 0, x2: 10, y2: 5 };
    const bulge: ArcEntity = {
      ...style,
      id: 'bulge',
      type: 'arc',
      cx: 5,
      cy: 5,
      r: 5,
      startAngleDeg: 0,
      endAngleDeg: 180,
      clockwise: false,
    };
    const left: LineEntity = { ...style, id: 'left', type: 'line', x1: 0, y1: 5, x2: 0, y2: 0 };
    const entities = [bottom, right, bulge, left];

    const chain = findConnectedChain(entities, 'bottom')!;
    expect(chain.closed).toBe(true);
    expect(chain.segments.map((segment) => segment.entityId)).toEqual(['bottom', 'right', 'bulge', 'left']);

    let nextId = 0;
    // Clicking well below the flat bottom edge is unambiguously outside
    // the whole shape — offsetting should grow it on every side, arc
    // included.
    const result = offsetChain(entities, bottom, 1, { x: 5, y: -5 }, () => `chain-${nextId += 1}`)!;
    expect(result.offsetEntities).toHaveLength(4);

    const arcResult = result.offsetEntities[result.chain.segments.findIndex((segment) => segment.entityId === 'bulge')];
    expect(arcResult).toMatchObject({ type: 'arc', cx: 5, cy: 5 });
    if (arcResult.type === 'arc') {
      // Growing the loop outward must grow the outward bulge's radius too.
      expect(arcResult.r).toBeCloseTo(6, 6);
    }

    const bottomResult = result.offsetEntities[result.chain.segments.findIndex((segment) => segment.entityId === 'bottom')];
    if (bottomResult.type === 'line') {
      // Growing outward moves the flat bottom edge further down (away from
      // the shape's body, which sits above y=0).
      expect(bottomResult.y1).toBeCloseTo(-1, 6);
      expect(bottomResult.y2).toBeCloseTo(-1, 6);
    }
  });

  it('routes circle/arc through createOffsetEntity', () => {
    const circle: SketchEntity = {
      ...style,
      id: 'circle',
      type: 'circle',
      cx: 0,
      cy: 0,
      r: 10,
    };
    const offset = createOffsetEntity(circle, 5, { x: 20, y: 0 }, 'offset')!;
    expect(offset).toMatchObject({ type: 'circle', r: 15 });
  });
});
