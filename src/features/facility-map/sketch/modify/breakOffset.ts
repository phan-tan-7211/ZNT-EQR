import {
  arcPoint,
  circleCircleIntersections,
  infiniteLineIntersection,
  lineCircleIntersections,
  angleAround,
} from '../core/geometry';
import type {
  ArcEntity,
  CircleEntity,
  LineEntity,
  PolylineEntity,
  RectEntity,
  SketchEntity,
  SketchPoint,
} from '../core/types';

const projectToSegment = (
  point: SketchPoint,
  a: SketchPoint,
  b: SketchPoint,
): { point: SketchPoint; t: number; distance: number } => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= 1e-12) {
    const distance = Math.hypot(point.x - a.x, point.y - a.y);
    return { point: { ...a }, t: 0, distance };
  }

  const rawT =
    ((point.x - a.x) * dx + (point.y - a.y) * dy) /
    lengthSquared;
  const t = Math.max(0, Math.min(1, rawT));
  const projected = {
    x: a.x + dx * t,
    y: a.y + dy * t,
  };

  return {
    point: projected,
    t,
    distance: Math.hypot(
      point.x - projected.x,
      point.y - projected.y,
    ),
  };
};

export const breakLineAtPoint = (
  entities: SketchEntity[],
  target: LineEntity,
  click: SketchPoint,
  createId: () => string,
): SketchEntity[] | null => {
  const start = { x: target.x1, y: target.y1 };
  const end = { x: target.x2, y: target.y2 };
  const projected = projectToSegment(click, start, end);

  if (projected.t <= 1e-4 || projected.t >= 1 - 1e-4) {
    return null;
  }

  const first: LineEntity = {
    ...target,
    id: createId(),
    x2: projected.point.x,
    y2: projected.point.y,
  };
  const second: LineEntity = {
    ...target,
    id: createId(),
    x1: projected.point.x,
    y1: projected.point.y,
  };

  return [
    ...entities.filter((entity) => entity.id !== target.id),
    first,
    second,
  ];
};

type Normal = {
  x: number;
  y: number;
};

const segmentNormal = (
  a: SketchPoint,
  b: SketchPoint,
): Normal => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  if (length <= 1e-12) return { x: 0, y: 0 };
  return {
    x: -dy / length,
    y: dx / length,
  };
};

const normalize = (vector: Normal, fallback: Normal): Normal => {
  const length = Math.hypot(vector.x, vector.y);
  if (length <= 1e-12) return fallback;
  return {
    x: vector.x / length,
    y: vector.y / length,
  };
};

const lineSideFromClick = (
  a: SketchPoint,
  b: SketchPoint,
  click: SketchPoint,
): number => {
  const cross =
    (b.x - a.x) * (click.y - a.y) -
    (b.y - a.y) * (click.x - a.x);
  return cross < 0 ? -1 : 1;
};

export const offsetLine = (
  line: LineEntity,
  distance: number,
  click: SketchPoint,
  id: string,
): LineEntity | null => {
  if (!Number.isFinite(distance) || distance <= 0) return null;
  const a = { x: line.x1, y: line.y1 };
  const b = { x: line.x2, y: line.y2 };
  const normal = segmentNormal(a, b);
  if (normal.x === 0 && normal.y === 0) return null;
  const side = lineSideFromClick(a, b, click);
  const dx = normal.x * distance * side;
  const dy = normal.y * distance * side;

  return {
    ...line,
    id,
    x1: line.x1 + dx,
    y1: line.y1 + dy,
    x2: line.x2 + dx,
    y2: line.y2 + dy,
  };
};

const closestSegmentIndex = (
  polyline: PolylineEntity,
  click: SketchPoint,
): number => {
  let bestIndex = 0;
  let bestDistance = Infinity;
  const count = polyline.closed
    ? polyline.points.length
    : Math.max(0, polyline.points.length - 1);

  for (let index = 0; index < count; index += 1) {
    const a = polyline.points[index];
    const b = polyline.points[(index + 1) % polyline.points.length];
    const candidate = projectToSegment(click, a, b).distance;
    if (candidate < bestDistance) {
      bestDistance = candidate;
      bestIndex = index;
    }
  }

  return bestIndex;
};

export const offsetPolyline = (
  polyline: PolylineEntity,
  distance: number,
  click: SketchPoint,
  id: string,
): PolylineEntity | null => {
  if (
    !Number.isFinite(distance) ||
    distance <= 0 ||
    polyline.points.length < 2
  ) {
    return null;
  }

  const segmentCount = polyline.closed
    ? polyline.points.length
    : polyline.points.length - 1;
  const normals = Array.from({ length: segmentCount }, (_, index) =>
    segmentNormal(
      polyline.points[index],
      polyline.points[(index + 1) % polyline.points.length],
    ),
  );

  const selectedIndex = closestSegmentIndex(polyline, click);
  const selectedA = polyline.points[selectedIndex];
  const selectedB =
    polyline.points[(selectedIndex + 1) % polyline.points.length];
  const side = lineSideFromClick(selectedA, selectedB, click);

  // A corner's offset vertex sits on the bisector of its two adjacent edge
  // normals, but it must travel *further* than `distance` along that
  // bisector — by a factor of 1 / cos(half the angle between the edges) —
  // so the offset edges stay exactly `distance` away from the originals
  // (the standard CAD/SVG "miter join"). Moving by `distance` directly (the
  // previous behavior) under-shoots on every non-collinear corner.
  const MITER_LIMIT = 8;

  const points = polyline.points.map((point, index) => {
    let normal: Normal;
    let scale = distance;

    if (!polyline.closed && index === 0) {
      normal = normals[0];
    } else if (!polyline.closed && index === polyline.points.length - 1) {
      normal = normals[normals.length - 1];
    } else {
      const previousIndex =
        (index - 1 + normals.length) % normals.length;
      const nextIndex = index % normals.length;
      const previousNormal = normals[previousIndex];
      const nextNormal = normals[nextIndex];
      const bisector = normalize(
        {
          x: previousNormal.x + nextNormal.x,
          y: previousNormal.y + nextNormal.y,
        },
        nextNormal,
      );
      const alignment = Math.abs(
        bisector.x * previousNormal.x + bisector.y * previousNormal.y,
      );
      scale = alignment > 1e-6
        ? Math.min(distance / alignment, distance * MITER_LIMIT)
        : distance;
      normal = bisector;
    }

    return {
      x: point.x + normal.x * scale * side,
      y: point.y + normal.y * scale * side,
    };
  });

  return {
    ...polyline,
    id,
    points,
  };
};

/**
 * A circle/arc's offset is just its own radius grown or shrunk by
 * `distance` — outward if the click landed outside the curve, inward if it
 * landed inside, mirroring how `offsetLine`'s `lineSideFromClick` picks a
 * direction from which side of the line was clicked.
 */
export const offsetCircle = (
  circle: CircleEntity,
  distance: number,
  click: SketchPoint,
  id: string,
): CircleEntity | null => {
  if (!Number.isFinite(distance) || distance <= 0) return null;
  const clickDistance = Math.hypot(click.x - circle.cx, click.y - circle.cy);
  const outward = clickDistance >= circle.r;
  const nextRadius = outward ? circle.r + distance : circle.r - distance;
  if (nextRadius <= 0) return null;
  return { ...circle, id, r: nextRadius };
};

// A rectangle offsets as a whole, like a circle: a click inside shrinks it
// by the distance on every side, a click on or outside the border grows it.
export const offsetRect = (
  rect: RectEntity,
  distance: number,
  click: SketchPoint,
  id: string,
): RectEntity | null => {
  if (!Number.isFinite(distance) || distance <= 0) return null;
  const left = Math.min(rect.x, rect.x + rect.w);
  const top = Math.min(rect.y, rect.y + rect.h);
  const width = Math.abs(rect.w);
  const height = Math.abs(rect.h);
  const inside =
    click.x > left && click.x < left + width && click.y > top && click.y < top + height;
  const delta = inside ? -distance : distance;
  const nextWidth = width + 2 * delta;
  const nextHeight = height + 2 * delta;
  if (nextWidth <= 0 || nextHeight <= 0) return null;
  return { ...rect, id, x: left - delta, y: top - delta, w: nextWidth, h: nextHeight };
};

export const offsetArc = (
  arc: ArcEntity,
  distance: number,
  click: SketchPoint,
  id: string,
): ArcEntity | null => {
  if (!Number.isFinite(distance) || distance <= 0) return null;
  const clickDistance = Math.hypot(click.x - arc.cx, click.y - arc.cy);
  const outward = clickDistance >= arc.r;
  const nextRadius = outward ? arc.r + distance : arc.r - distance;
  if (nextRadius <= 0) return null;
  return { ...arc, id, r: nextRadius };
};

const CHAIN_JOIN_EPS = 1e-6;

const pointsCoincide = (a: SketchPoint, b: SketchPoint): boolean =>
  Math.hypot(a.x - b.x, a.y - b.y) < CHAIN_JOIN_EPS;

type ChainMember = LineEntity | ArcEntity;

export type ChainSegment =
  | { type: 'line'; entityId: string; a: SketchPoint; b: SketchPoint }
  | {
      type: 'arc';
      entityId: string;
      cx: number;
      cy: number;
      r: number;
      clockwise: boolean;
      a: SketchPoint;
      b: SketchPoint;
    };

export type Chain = {
  segments: ChainSegment[];
  closed: boolean;
};

const memberEndpoints = (entity: ChainMember): [SketchPoint, SketchPoint] =>
  entity.type === 'line'
    ? [{ x: entity.x1, y: entity.y1 }, { x: entity.x2, y: entity.y2 }]
    : [arcPoint(entity, entity.startAngleDeg), arcPoint(entity, entity.endAngleDeg)];

const toChainSegment = (entity: ChainMember, a: SketchPoint, b: SketchPoint): ChainSegment => {
  if (entity.type === 'line') return { type: 'line', entityId: entity.id, a, b };
  // `clockwise` here means "rotational sense when travelling a→b in the
  // chain's own walk direction" — not necessarily the entity's own stored
  // flag, which describes start→end and may have been walked backwards.
  // Everything downstream (the offset-normal direction) depends on this
  // being walk-relative, the same way a line's `a,b` already is.
  const walkedForward = pointsCoincide(a, arcPoint(entity, entity.startAngleDeg));
  const clockwise = walkedForward ? !!entity.clockwise : !entity.clockwise;
  return { type: 'arc', entityId: entity.id, cx: entity.cx, cy: entity.cy, r: entity.r, clockwise, a, b };
};

/**
 * Walks the run of Line/Arc entities whose endpoints are coincident with
 * `startId`'s — the connected loop or open chain it belongs to. Trim
 * doesn't leave a rectangle as one object; it leaves separate curves that
 * merely happen to still touch at their corners, the same way Inventor's
 * own sketches never remember "this was a rectangle" either — and a
 * rounded corner is exactly as often an Arc as it is another Line.
 * Inventor's Offset still treats that touching chain as one profile by
 * default (Ctrl forces just the picked edge) — this is that same lookup,
 * so ours can too.
 *
 * Stops extending at a joint where more than one *other* curve shares that
 * endpoint (an ambiguous branch/T-junction), rather than guessing which way
 * to continue.
 */
export const findConnectedChain = (
  entities: SketchEntity[],
  startId: string,
): Chain | null => {
  const members = new Map<string, ChainMember>();
  for (const entity of entities) {
    if (entity.type === 'line' || entity.type === 'arc') members.set(entity.id, entity);
  }
  const start = members.get(startId);
  if (!start) return null;

  const neighborsAt = (point: SketchPoint, usedIds: Set<string>) => {
    const found: Array<{ entity: ChainMember; touch: SketchPoint; far: SketchPoint }> = [];
    for (const [id, entity] of members) {
      if (usedIds.has(id)) continue;
      const [a, b] = memberEndpoints(entity);
      if (pointsCoincide(point, a)) found.push({ entity, touch: a, far: b });
      else if (pointsCoincide(point, b)) found.push({ entity, touch: b, far: a });
    }
    return found;
  };

  const used = new Set<string>([startId]);
  const [startA, startB] = memberEndpoints(start);
  const segments: ChainSegment[] = [toChainSegment(start, startA, startB)];
  let closed = false;

  // The closing segment is a real segment and still gets pushed like any
  // other — closure only means "stop extending further", not "drop this
  // step". What must never happen is treating the wraparound as *another*
  // segment beyond it (checked via `closed` guarding every later loop).
  for (let guard = 0; guard < members.size && !closed; guard += 1) {
    const tail = segments[segments.length - 1].b;
    const candidates = neighborsAt(tail, used);
    if (candidates.length !== 1) break;
    const next = candidates[0];
    used.add(next.entity.id);
    segments.push(toChainSegment(next.entity, next.touch, next.far));
    if (pointsCoincide(next.far, segments[0].a)) closed = true;
  }

  if (!closed) {
    for (let guard = 0; guard < members.size && !closed; guard += 1) {
      const head = segments[0].a;
      const candidates = neighborsAt(head, used);
      if (candidates.length !== 1) break;
      const next = candidates[0];
      used.add(next.entity.id);
      segments.unshift(toChainSegment(next.entity, next.far, next.touch));
      if (pointsCoincide(next.far, segments[segments.length - 1].b)) closed = true;
    }
  }

  // Reports the chain honestly, even a trivial one-entity "chain" (an
  // isolated curve, or one boxed in by a T-junction on every side) — it's
  // `offsetChain` below that decides a chain shorter than 2 entities isn't
  // worth treating differently from a plain single-curve offset.
  return { segments, closed };
};

type OffsetSegment =
  | { type: 'line'; entityId: string; a: SketchPoint; b: SketchPoint }
  | { type: 'arc'; entityId: string; cx: number; cy: number; r: number; clockwise: boolean };

/**
 * A line's `segmentNormal(a,b)` is a fixed perpendicular; an arc doesn't
 * have one constant direction, but at any point along it, rotating its
 * forward tangent the same "+90°" way `segmentNormal` does works out to:
 * chain-relative clockwise → outward (away from center), counterclockwise
 * → inward. Growing/shrinking the whole arc by `signedDistance` along that
 * direction is exactly a radius change, sized and signed the same way a
 * line's endpoints move along its own normal.
 */
const arcRadiusDelta = (clockwise: boolean, signedDistance: number): number =>
  clockwise ? signedDistance : -signedDistance;

/**
 * One scalar, derived once from whichever segment was actually clicked,
 * applied to every segment in the chain — exactly how `offsetPolyline`'s
 * single `side` already works for a plain closed/open polyline. It's valid
 * across the whole chain only because `findConnectedChain` walks every
 * segment in one consistent direction (a line's `a,b` and an arc's
 * chain-relative `clockwise` both already encode that same walk).
 */
const deriveGlobalSide = (segment: ChainSegment, click: SketchPoint): number => {
  if (segment.type === 'line') return lineSideFromClick(segment.a, segment.b, click);
  const outside = Math.hypot(click.x - segment.cx, click.y - segment.cy) >= segment.r;
  return (outside ? 1 : -1) * (segment.clockwise ? 1 : -1);
};

/**
 * Offsets the whole connected chain/loop `clickedEntity` belongs to as one
 * profile. Every segment is grown or shrunk independently along its own
 * direction, then each shared joint is re-cut to the actual intersection
 * of its two now-independently-moved neighbors — the same "offset each
 * edge, then re-trim the corners" approach any CAD kernel uses, which is
 * what lets a corner stay an Arc offset into a same-center Arc, or a
 * Line/Arc corner resolve correctly, not just Line/Line miters.
 *
 * The source curves are untouched — this adds new entities, the same
 * "leave the original, add the offset copy" contract every other offset*
 * function here follows.
 */
export const offsetChain = (
  entities: SketchEntity[],
  clickedEntity: LineEntity | ArcEntity,
  distance: number,
  click: SketchPoint,
  createId: () => string,
): { chain: Chain; offsetEntities: SketchEntity[] } | null => {
  if (!Number.isFinite(distance) || distance <= 0) return null;
  const chain = findConnectedChain(entities, clickedEntity.id);
  if (!chain || chain.segments.length < 2) return null;

  const clickedSegment = chain.segments.find((segment) => segment.entityId === clickedEntity.id);
  if (!clickedSegment) return null;
  const signedDistance = distance * deriveGlobalSide(clickedSegment, click);

  const offsets: OffsetSegment[] = chain.segments.map((segment) => {
    if (segment.type === 'line') {
      const normal = segmentNormal(segment.a, segment.b);
      return {
        type: 'line',
        entityId: segment.entityId,
        a: { x: segment.a.x + normal.x * signedDistance, y: segment.a.y + normal.y * signedDistance },
        b: { x: segment.b.x + normal.x * signedDistance, y: segment.b.y + normal.y * signedDistance },
      };
    }
    const nextRadius = segment.r + arcRadiusDelta(segment.clockwise, signedDistance);
    return { type: 'arc', entityId: segment.entityId, cx: segment.cx, cy: segment.cy, r: nextRadius, clockwise: segment.clockwise };
  });

  if (offsets.some((segment) => segment.type === 'arc' && segment.r <= 0)) return null;

  const jointCount = chain.closed ? offsets.length : offsets.length - 1;
  const joints: SketchPoint[] = [];
  for (let index = 0; index < jointCount; index += 1) {
    const left = offsets[index];
    const right = offsets[(index + 1) % offsets.length];
    const original = chain.segments[(index + 1) % chain.segments.length].a;
    let candidates: SketchPoint[];
    if (left.type === 'line' && right.type === 'line') {
      const point = infiniteLineIntersection(left.a, left.b, right.a, right.b);
      candidates = point ? [point] : [];
    } else if (left.type === 'arc' && right.type === 'arc') {
      candidates = circleCircleIntersections(left, right);
    } else if (left.type === 'line' && right.type === 'arc') {
      candidates = lineCircleIntersections(left.a, left.b, right, true).map((hit) => hit.point);
    } else if (left.type === 'arc' && right.type === 'line') {
      candidates = lineCircleIntersections(right.a, right.b, left, true).map((hit) => hit.point);
    } else {
      candidates = [];
    }
    if (!candidates.length) return null;
    const joint = candidates.reduce((best, candidate) =>
      Math.hypot(candidate.x - original.x, candidate.y - original.y) <
      Math.hypot(best.x - original.x, best.y - original.y)
        ? candidate
        : best,
    );
    joints.push(joint);
  }

  const offsetEntities: SketchEntity[] = offsets.map((segment, index) => {
    const originalSegment = chain.segments[index];
    const before = chain.closed ? joints[(index - 1 + joints.length) % joints.length] : joints[index - 1];
    const after = chain.closed ? joints[index] : joints[index];
    const source = entities.find((entity) => entity.id === segment.entityId)!;
    const style = styleOfEntity(source);
    if (segment.type === 'line') {
      const a = before ?? segment.a;
      const b = after ?? segment.b;
      return { ...style, id: createId(), type: 'line', x1: a.x, y1: a.y, x2: b.x, y2: b.y };
    }
    const center = { x: segment.cx, y: segment.cy };
    // An open chain's un-jointed end has no intersection to re-cut against
    // — it keeps the *original* segment's own angle, just carried over to
    // the new radius, the same way a line's un-jointed end keeps its own
    // original endpoint translated rather than being computed some other way.
    const naturalPoint = (originalPoint: SketchPoint): SketchPoint => {
      const angleDeg = angleAround(center, originalPoint);
      const radians = (angleDeg * Math.PI) / 180;
      return { x: segment.cx + Math.cos(radians) * segment.r, y: segment.cy + Math.sin(radians) * segment.r };
    };
    const a = before ?? naturalPoint(originalSegment.a);
    const b = after ?? naturalPoint(originalSegment.b);
    return {
      ...style,
      id: createId(),
      type: 'arc',
      cx: segment.cx,
      cy: segment.cy,
      r: segment.r,
      startAngleDeg: angleAround(center, a),
      endAngleDeg: angleAround(center, b),
      clockwise: segment.clockwise,
    };
  });

  return { chain, offsetEntities };
};

const styleOfEntity = (entity: SketchEntity) => ({
  color: entity.color,
  lineWidth: entity.lineWidth,
  construction: entity.construction,
});

export const createOffsetEntity = (
  entity: SketchEntity,
  distance: number,
  click: SketchPoint,
  id: string,
): SketchEntity | null => {
  if (entity.type === 'line') {
    return offsetLine(entity, distance, click, id);
  }
  if (entity.type === 'polyline') {
    return offsetPolyline(entity, distance, click, id);
  }
  if (entity.type === 'circle') {
    return offsetCircle(entity, distance, click, id);
  }
  if (entity.type === 'arc') {
    return offsetArc(entity, distance, click, id);
  }
  if (entity.type === 'rect') {
    return offsetRect(entity, distance, click, id);
  }
  return null;
};
