import {
  arcPoint,
  distance,
  rectEdges,
} from '../core/geometry';
import type {
  ArcEntity,
  SketchEntity,
  SketchPoint,
} from '../core/types';
import { findClosestEntitySnap } from './closestSnap';

export type NearestSnapResult = {
  point: SketchPoint;
  entityId: string;
  distance: number;
};

const closestPointOnSegment = (
  point: SketchPoint,
  start: SketchPoint,
  end: SketchPoint,
): SketchPoint => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= 1e-12) return { ...start };

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * dx + (point.y - start.y) * dy) /
        lengthSquared,
    ),
  );

  return {
    x: start.x + dx * t,
    y: start.y + dy * t,
  };
};

const normalizeAngle = (angle: number): number =>
  ((angle % 360) + 360) % 360;

const angleWithinArc = (
  angle: number,
  arc: ArcEntity,
): boolean => {
  const start = normalizeAngle(arc.startAngleDeg);
  const end = normalizeAngle(arc.endAngleDeg);
  const current = normalizeAngle(angle);

  if (arc.clockwise) {
    const sweep = normalizeAngle(start - end);
    const offset = normalizeAngle(start - current);
    return offset <= sweep;
  }

  const sweep = normalizeAngle(end - start);
  const offset = normalizeAngle(current - start);
  return offset <= sweep;
};

const closestPointOnCircle = (
  point: SketchPoint,
  center: SketchPoint,
  radius: number,
): SketchPoint => {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const length = Math.hypot(dx, dy);
  if (length <= 1e-12) {
    return { x: center.x + radius, y: center.y };
  }

  return {
    x: center.x + (dx / length) * radius,
    y: center.y + (dy / length) * radius,
  };
};

const closestPointOnArc = (
  point: SketchPoint,
  arc: ArcEntity,
): SketchPoint => {
  const center = { x: arc.cx, y: arc.cy };
  const radial = closestPointOnCircle(point, center, arc.r);
  const angle =
    (Math.atan2(radial.y - arc.cy, radial.x - arc.cx) * 180) / Math.PI;

  if (angleWithinArc(angle, arc)) return radial;

  const start = arcPoint(arc, arc.startAngleDeg);
  const end = arcPoint(arc, arc.endAngleDeg);
  return distance(point, start) <= distance(point, end) ? start : end;
};

export const getNearestPointOnEntity = (
  point: SketchPoint,
  entity: SketchEntity,
): SketchPoint | null => {
  if (entity.type === 'line') {
    return closestPointOnSegment(
      point,
      { x: entity.x1, y: entity.y1 },
      { x: entity.x2, y: entity.y2 },
    );
  }

  if (entity.type === 'polyline') {
    const segments: Array<[SketchPoint, SketchPoint]> = [];
    for (let index = 0; index < entity.points.length - 1; index += 1) {
      segments.push([entity.points[index], entity.points[index + 1]]);
    }
    if (entity.closed && entity.points.length > 2) {
      segments.push([
        entity.points[entity.points.length - 1],
        entity.points[0],
      ]);
    }
    if (!segments.length) return entity.points[0]
      ? { ...entity.points[0] }
      : null;

    return segments
      .map(([start, end]) => closestPointOnSegment(point, start, end))
      .reduce((best, candidate) =>
        distance(point, candidate) < distance(point, best)
          ? candidate
          : best,
      );
  }

  if (entity.type === 'rect') {
    return rectEdges(entity)
      .map(([start, end]) => closestPointOnSegment(point, start, end))
      .reduce((best, candidate) =>
        distance(point, candidate) < distance(point, best)
          ? candidate
          : best,
      );
  }

  if (entity.type === 'circle') {
    return closestPointOnCircle(
      point,
      { x: entity.cx, y: entity.cy },
      entity.r,
    );
  }

  return closestPointOnArc(point, entity);
};

export const findNearestSnap = (
  point: SketchPoint,
  entities: SketchEntity[],
  threshold: number,
): NearestSnapResult | null =>
  findClosestEntitySnap(
    point,
    entities,
    threshold,
    (entity) => getNearestPointOnEntity(point, entity),
  );
