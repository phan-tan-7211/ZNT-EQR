import {
  angleAround,
  circleCircleIntersections,
  distance,
  isAngleOnArc,
  lineCircleIntersections,
  normalizeAngle360,
  rectEdges,
  segmentIntersection,
} from '../core/geometry';
import type {
  ArcEntity,
  CircleEntity,
  LineEntity,
  SketchEntity,
  SketchPoint,
  SketchStyle,
} from '../core/types';

export type ModifyMode = 'trim' | 'extend';

export type ModifyPreview = {
  mode: ModifyMode;
  from: SketchPoint;
  to: SketchPoint;
  targetId: string;
};

type Segment = {
  a: SketchPoint;
  b: SketchPoint;
};

const pointToSegmentDistance = (
  point: SketchPoint,
  a: SketchPoint,
  b: SketchPoint,
): number => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= 1e-12) return distance(point, a);
  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared,
    ),
  );
  return distance(point, {
    x: a.x + dx * t,
    y: a.y + dy * t,
  });
};

const entitySegments = (entity: SketchEntity): Segment[] => {
  if (entity.type === 'line') {
    return [{
      a: { x: entity.x1, y: entity.y1 },
      b: { x: entity.x2, y: entity.y2 },
    }];
  }
  if (entity.type === 'rect') {
    return rectEdges(entity).map(([a, b]) => ({ a, b }));
  }
  if (entity.type === 'polyline') {
    const segments: Segment[] = [];
    for (let index = 0; index < entity.points.length - 1; index += 1) {
      segments.push({
        a: entity.points[index],
        b: entity.points[index + 1],
      });
    }
    if (entity.closed && entity.points.length > 2) {
      segments.push({
        a: entity.points[entity.points.length - 1],
        b: entity.points[0],
      });
    }
    return segments;
  }
  return [];
};

/**
 * Every other entity's `t` position along segment a→b where it crosses —
 * including circles and arcs, which `entitySegments` can't represent as
 * straight segments. Without this, a circle or arc crossing a line/rect/
 * polyline edge was invisible to Trim/Break: it never showed up as a
 * boundary, so the tool would trim past it as if it wasn't there.
 */
const boundaryParamsOnSegment = (
  a: SketchPoint,
  b: SketchPoint,
  entities: SketchEntity[],
  excludeId: string,
): number[] => {
  const params: number[] = [];
  for (const entity of entities) {
    if (entity.id === excludeId) continue;
    if (entity.type === 'circle') {
      lineCircleIntersections(a, b, entity).forEach((hit) => params.push(hit.t));
    } else if (entity.type === 'arc') {
      lineCircleIntersections(a, b, entity).forEach((hit) => {
        if (isAngleOnArc(angleAround({ x: entity.cx, y: entity.cy }, hit.point), entity)) {
          params.push(hit.t);
        }
      });
    } else {
      entitySegments(entity).forEach(({ a: c, b: d }) => {
        const hit = segmentIntersection(a, b, c, d, false);
        if (hit) params.push(hit.t);
      });
    }
  }
  return params;
};

/** Every other entity's crossing angle (degrees) around a circle/arc target. */
const boundaryAnglesOnCircle = (
  circle: CircleEntity | ArcEntity,
  entities: SketchEntity[],
  excludeId: string,
): number[] => {
  const center = { x: circle.cx, y: circle.cy };
  const angles: number[] = [];
  for (const entity of entities) {
    if (entity.id === excludeId) continue;
    if (entity.type === 'circle') {
      circleCircleIntersections(circle, entity).forEach((point) => {
        angles.push(angleAround(center, point));
      });
    } else if (entity.type === 'arc') {
      circleCircleIntersections(circle, entity).forEach((point) => {
        if (isAngleOnArc(angleAround({ x: entity.cx, y: entity.cy }, point), entity)) {
          angles.push(angleAround(center, point));
        }
      });
    } else {
      entitySegments(entity).forEach(({ a, b }) => {
        lineCircleIntersections(a, b, circle).forEach((hit) => {
          angles.push(angleAround(center, hit.point));
        });
      });
    }
  }
  return angles;
};

const anglePointOnCircle = (circle: CircleEntity | ArcEntity, angleDegValue: number): SketchPoint => {
  const radians = (angleDegValue * Math.PI) / 180;
  return {
    x: circle.cx + Math.cos(radians) * circle.r,
    y: circle.cy + Math.sin(radians) * circle.r,
  };
};

type CircleTrimResult = {
  /** The arc being removed, as [start, end) going counterclockwise — used for the preview chord. */
  removed: { startDeg: number; endDeg: number };
  /** The arc(s) left behind, each going counterclockwise from start to end. */
  remaining: Array<{ startDeg: number; endDeg: number }>;
};

/**
 * Angle-space equivalent of `trimInterval` for a full circle: find the two
 * boundary crossings nearest the click (going around the circle) and mark
 * the piece between them, on the click's side, for removal.
 */
const circleTrimInterval = (
  circle: CircleEntity,
  click: SketchPoint,
  boundaryAngles: number[],
): CircleTrimResult | null => {
  const uniqueAngles = Array.from(
    new Set(boundaryAngles.map((angleDegValue) => Math.round(angleDegValue * 1e4) / 1e4)),
  ).sort((x, y) => x - y);
  if (uniqueAngles.length < 2) return null;

  const clickAngle = angleAround({ x: circle.cx, y: circle.cy }, click);

  for (let index = 0; index < uniqueAngles.length; index += 1) {
    const start = uniqueAngles[index];
    const end = uniqueAngles[(index + 1) % uniqueAngles.length];
    const sweep = normalizeAngle360(end - start) || 360;
    const offset = normalizeAngle360(clickAngle - start);
    if (offset <= sweep + 1e-6) {
      return {
        removed: { startDeg: start, endDeg: end },
        remaining: [{ startDeg: end, endDeg: start }],
      };
    }
  }
  return null;
};

/**
 * Angle-space equivalent of `trimInterval` for an existing arc target: only
 * crossings that fall within the arc's own visible sweep count as
 * boundaries, and the arc's own two endpoints act as the outer bounds (the
 * same role `0` and `1` play for a line).
 */
const arcTrimInterval = (
  arc: ArcEntity,
  click: SketchPoint,
  boundaryAngles: number[],
): CircleTrimResult | null => {
  const sweepDeg = arc.clockwise
    ? normalizeAngle360(arc.startAngleDeg - arc.endAngleDeg)
    : normalizeAngle360(arc.endAngleDeg - arc.startAngleDeg);
  if (sweepDeg <= 1e-6) return null;

  const paramOf = (angleDegValue: number): number =>
    arc.clockwise
      ? normalizeAngle360(arc.startAngleDeg - angleDegValue) / sweepDeg
      : normalizeAngle360(angleDegValue - arc.startAngleDeg) / sweepDeg;

  const angleOf = (param: number): number =>
    normalizeAngle360(
      arc.clockwise
        ? arc.startAngleDeg - param * sweepDeg
        : arc.startAngleDeg + param * sweepDeg,
    );

  const innerParams = boundaryAngles
    .filter((angleDegValue) => isAngleOnArc(angleDegValue, arc))
    .map(paramOf)
    .filter((param) => param > 1e-4 && param < 1 - 1e-4)
    .sort((x, y) => x - y);

  const clickParam = paramOf(angleAround({ x: arc.cx, y: arc.cy }, click));
  const params = [0, ...innerParams, 1];

  for (let index = 0; index < params.length - 1; index += 1) {
    if (clickParam >= params[index] && clickParam <= params[index + 1]) {
      const remaining: Array<{ startDeg: number; endDeg: number }> = [];
      if (params[index] > 1e-6) {
        remaining.push({ startDeg: arc.startAngleDeg, endDeg: angleOf(params[index]) });
      }
      if (params[index + 1] < 1 - 1e-6) {
        remaining.push({ startDeg: angleOf(params[index + 1]), endDeg: arc.endAngleDeg });
      }
      return {
        removed: { startDeg: angleOf(params[index]), endDeg: angleOf(params[index + 1]) },
        remaining,
      };
    }
  }
  return null;
};

const selectedSegment = (
  entity: SketchEntity,
  click: SketchPoint,
): Segment | null => {
  const segments = entitySegments(entity);
  if (!segments.length) return null;
  return segments.reduce((best, segment) =>
    pointToSegmentDistance(click, segment.a, segment.b) <
    pointToSegmentDistance(click, best.a, best.b)
      ? segment
      : best,
  );
};

const pointAt = (
  a: SketchPoint,
  b: SketchPoint,
  t: number,
): SketchPoint => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

const trimInterval = (
  a: SketchPoint,
  b: SketchPoint,
  click: SketchPoint,
  boundaryParams: number[],
): { leftT: number; rightT: number } | null => {
  const intersections = boundaryParams
    .filter((t) => t > 1e-4 && t < 1 - 1e-4)
    .sort((x, y) => x - y);

  if (!intersections.length) return null;

  const lengthSquared = Math.max(
    (b.x - a.x) ** 2 + (b.y - a.y) ** 2,
    1e-9,
  );
  const clickT =
    ((click.x - a.x) * (b.x - a.x) +
      (click.y - a.y) * (b.y - a.y)) /
    lengthSquared;
  const params = [0, ...intersections, 1];

  for (let index = 0; index < params.length - 1; index += 1) {
    if (clickT >= params[index] && clickT <= params[index + 1]) {
      return {
        leftT: params[index],
        rightT: params[index + 1],
      };
    }
  }

  return null;
};

const styleOf = (entity: SketchEntity): SketchStyle => ({
  color: entity.color,
  lineWidth: entity.lineWidth,
  construction: entity.construction,
  visible: entity.visible,
  locked: entity.locked,
});

const segmentToLine = (
  segment: Segment,
  style: SketchStyle,
  createId: () => string,
): LineEntity => ({
  ...style,
  id: createId(),
  type: 'line',
  x1: segment.a.x,
  y1: segment.a.y,
  x2: segment.b.x,
  y2: segment.b.y,
});

const sameSegment = (a: Segment, b: Segment): boolean =>
  (
    distance(a.a, b.a) < 1e-9 &&
    distance(a.b, b.b) < 1e-9
  ) || (
    distance(a.a, b.b) < 1e-9 &&
    distance(a.b, b.a) < 1e-9
  );

export const getTrimPreview = (
  entities: SketchEntity[],
  target: SketchEntity,
  click: SketchPoint,
): ModifyPreview | null => {
  if (target.type === 'circle' || target.type === 'arc') {
    const boundaryAngles = boundaryAnglesOnCircle(target, entities, target.id);
    const result = target.type === 'circle'
      ? circleTrimInterval(target, click, boundaryAngles)
      : arcTrimInterval(target, click, boundaryAngles);
    if (!result) return null;
    return {
      mode: 'trim',
      targetId: target.id,
      from: anglePointOnCircle(target, result.removed.startDeg),
      to: anglePointOnCircle(target, result.removed.endDeg),
    };
  }

  const segment = selectedSegment(target, click);
  if (!segment) return null;
  const interval = trimInterval(
    segment.a,
    segment.b,
    click,
    boundaryParamsOnSegment(segment.a, segment.b, entities, target.id),
  );
  if (!interval) return null;

  return {
    mode: 'trim',
    targetId: target.id,
    from: pointAt(segment.a, segment.b, interval.leftT),
    to: pointAt(segment.a, segment.b, interval.rightT),
  };
};

export const commitTrim = (
  entities: SketchEntity[],
  target: SketchEntity,
  click: SketchPoint,
  createId: () => string,
): SketchEntity[] | null => {
  if (target.type === 'circle' || target.type === 'arc') {
    const boundaryAngles = boundaryAnglesOnCircle(target, entities, target.id);
    const result = target.type === 'circle'
      ? circleTrimInterval(target, click, boundaryAngles)
      : arcTrimInterval(target, click, boundaryAngles);
    if (!result) return null;

    const style = styleOf(target);
    const replacement: ArcEntity[] = result.remaining.map((piece) => ({
      ...style,
      id: createId(),
      type: 'arc',
      cx: target.cx,
      cy: target.cy,
      r: target.r,
      startAngleDeg: piece.startDeg,
      endAngleDeg: piece.endDeg,
      clockwise: target.type === 'arc' ? target.clockwise : false,
    }));
    return [
      ...entities.filter((entity) => entity.id !== target.id),
      ...replacement,
    ];
  }

  const segment = selectedSegment(target, click);
  if (!segment) return null;
  const interval = trimInterval(
    segment.a,
    segment.b,
    click,
    boundaryParamsOnSegment(segment.a, segment.b, entities, target.id),
  );
  if (!interval) return null;

  if (target.type === 'line') {
    const before = pointAt(segment.a, segment.b, interval.leftT);
    const after = pointAt(segment.a, segment.b, interval.rightT);
    const replacement: LineEntity[] = [];
    if (interval.leftT > 1e-6) {
      replacement.push({
        ...target,
        id: createId(),
        x2: before.x,
        y2: before.y,
      });
    }
    if (interval.rightT < 1 - 1e-6) {
      replacement.push({
        ...target,
        id: createId(),
        x1: after.x,
        y1: after.y,
      });
    }
    return [
      ...entities.filter((entity) => entity.id !== target.id),
      ...replacement,
    ];
  }

  const style = styleOf(target);
  const remainingSegments: Segment[] = [];
  for (const current of entitySegments(target)) {
    if (!sameSegment(current, segment)) {
      remainingSegments.push(current);
      continue;
    }
    if (interval.leftT > 1e-6) {
      remainingSegments.push({
        a: current.a,
        b: pointAt(current.a, current.b, interval.leftT),
      });
    }
    if (interval.rightT < 1 - 1e-6) {
      remainingSegments.push({
        a: pointAt(current.a, current.b, interval.rightT),
        b: current.b,
      });
    }
  }

  return [
    ...entities.filter((entity) => entity.id !== target.id),
    ...remainingSegments.map((remaining) =>
      segmentToLine(remaining, style, createId),
    ),
  ];
};

/** Every other entity's crossing `t` along the INFINITE line through a→b. */
const extendBoundaryParamsOnLine = (
  a: SketchPoint,
  b: SketchPoint,
  entities: SketchEntity[],
  excludeId: string,
): number[] => {
  const params: number[] = [];
  for (const entity of entities) {
    if (entity.id === excludeId) continue;
    if (entity.type === 'circle') {
      lineCircleIntersections(a, b, entity, true).forEach((hit) => params.push(hit.t));
    } else if (entity.type === 'arc') {
      lineCircleIntersections(a, b, entity, true).forEach((hit) => {
        if (isAngleOnArc(angleAround({ x: entity.cx, y: entity.cy }, hit.point), entity)) {
          params.push(hit.t);
        }
      });
    } else {
      entitySegments(entity).forEach(({ a: c, b: d }) => {
        const hit = segmentIntersection(a, b, c, d, true);
        if (hit) params.push(hit.t);
      });
    }
  }
  return params;
};

const getLineExtendPreview = (
  entities: SketchEntity[],
  target: LineEntity,
  click: SketchPoint,
): ModifyPreview | null => {
  const a = { x: target.x1, y: target.y1 };
  const b = { x: target.x2, y: target.y2 };
  const extendStart = distance(click, a) < distance(click, b);

  const candidates = extendBoundaryParamsOnLine(a, b, entities, target.id)
    .filter((t) => (extendStart ? t < -1e-4 : t > 1 + 1e-4))
    .sort((x, y) => (extendStart ? y - x : x - y));

  const bestT = candidates[0];
  if (bestT === undefined) return null;
  const bestPoint = pointAt(a, b, bestT);

  return {
    mode: 'extend',
    targetId: target.id,
    from: extendStart ? bestPoint : b,
    to: extendStart ? a : bestPoint,
  };
};

/**
 * Angle-space equivalent of the line extend above: grow the arc's sweep
 * back past its start (or forward past its end, whichever end is nearer the
 * click) until it reaches the nearest crossing of another entity's actual
 * geometry with this arc's own circle.
 */
const getArcExtendPreview = (
  entities: SketchEntity[],
  target: ArcEntity,
  click: SketchPoint,
): ModifyPreview | null => {
  const sweepDeg = target.clockwise
    ? normalizeAngle360(target.startAngleDeg - target.endAngleDeg)
    : normalizeAngle360(target.endAngleDeg - target.startAngleDeg);
  if (sweepDeg <= 1e-6) return null;

  const start = anglePointOnCircle(target, target.startAngleDeg);
  const end = anglePointOnCircle(target, target.endAngleDeg);
  const extendStart = distance(click, start) < distance(click, end);

  // The arc's own forward-offset-from-start (the same quantity
  // `isAngleOnArc` compares against `sweepDeg`) doubles as a coordinate for
  // the single (360 - sweepDeg)-wide gap where the arc *isn't* drawn: a
  // point there is `offset - sweepDeg` degrees past the end (going
  // forward), or equivalently `360 - offset` degrees before the start
  // (going backward) — whichever is smaller tells us which end it's
  // actually closest to.
  const forwardOffset = (angleDegValue: number): number =>
    target.clockwise
      ? normalizeAngle360(target.startAngleDeg - angleDegValue)
      : normalizeAngle360(angleDegValue - target.startAngleDeg);

  const candidates = boundaryAnglesOnCircle(target, entities, target.id)
    .map((angleDegValue) => ({ angleDegValue, offset: forwardOffset(angleDegValue) }))
    .filter(({ offset }) => offset > sweepDeg + 1e-4 && offset < 360 - 1e-4)
    .map(({ angleDegValue, offset }) => ({
      angleDegValue,
      gap: extendStart ? 360 - offset : offset - sweepDeg,
    }))
    .sort((x, y) => x.gap - y.gap);

  const best = candidates[0];
  if (!best) return null;
  const bestPoint = anglePointOnCircle(target, best.angleDegValue);

  return {
    mode: 'extend',
    targetId: target.id,
    from: extendStart ? bestPoint : end,
    to: extendStart ? start : bestPoint,
  };
};

export const getExtendPreview = (
  entities: SketchEntity[],
  target: LineEntity | ArcEntity,
  click: SketchPoint,
): ModifyPreview | null =>
  target.type === 'arc'
    ? getArcExtendPreview(entities, target, click)
    : getLineExtendPreview(entities, target, click);

export const commitExtend = (
  entities: SketchEntity[],
  target: LineEntity | ArcEntity,
  click: SketchPoint,
): SketchEntity[] | null => {
  const preview = getExtendPreview(entities, target, click);
  if (!preview) return null;

  if (target.type === 'arc') {
    const start = anglePointOnCircle(target, target.startAngleDeg);
    const extendStart = distance(preview.to, start) < 1e-6;
    const newAngle = angleAround(
      { x: target.cx, y: target.cy },
      extendStart ? preview.from : preview.to,
    );
    return entities.map((entity) =>
      entity.id === target.id
        ? {
            ...target,
            startAngleDeg: extendStart ? newAngle : target.startAngleDeg,
            endAngleDeg: extendStart ? target.endAngleDeg : newAngle,
          }
        : entity,
    );
  }

  const a = { x: target.x1, y: target.y1 };
  const extendStart = distance(preview.to, a) < 1e-9;

  return entities.map((entity) => {
    if (entity.id !== target.id) return entity;
    return extendStart
      ? {
          ...target,
          x1: preview.from.x,
          y1: preview.from.y,
        }
      : {
          ...target,
          x2: preview.to.x,
          y2: preview.to.y,
        };
  });
};

export const effectiveModifyMode = (
  tool: ModifyMode,
  shiftKey: boolean,
): ModifyMode =>
  shiftKey
    ? tool === 'trim' ? 'extend' : 'trim'
    : tool;
