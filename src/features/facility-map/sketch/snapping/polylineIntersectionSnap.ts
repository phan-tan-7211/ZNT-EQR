import { distance, segmentIntersection } from '../core/geometry';
import type {
  LineEntity,
  PolylineEntity,
  SketchEntity,
  SketchPoint,
} from '../core/types';
import { findClosestIntersectionSnap } from './closestSnap';

type SegmentSource = {
  entityId: string;
  points: [SketchPoint, SketchPoint];
  kind: 'line' | 'polyline';
};

export type PolylineIntersectionSnapResult = {
  point: SketchPoint;
  entityIds: [string, string];
  distance: number;
};

const lineSegment = (entity: LineEntity): SegmentSource => ({
  entityId: entity.id,
  points: [
    { x: entity.x1, y: entity.y1 },
    { x: entity.x2, y: entity.y2 },
  ],
  kind: 'line',
});

const polylineSegments = (
  entity: PolylineEntity,
): SegmentSource[] => {
  const segments: SegmentSource[] = [];

  for (let index = 0; index < entity.points.length - 1; index += 1) {
    segments.push({
      entityId: entity.id,
      points: [
        { ...entity.points[index] },
        { ...entity.points[index + 1] },
      ],
      kind: 'polyline',
    });
  }

  if (entity.closed && entity.points.length > 2) {
    segments.push({
      entityId: entity.id,
      points: [
        { ...entity.points[entity.points.length - 1] },
        { ...entity.points[0] },
      ],
      kind: 'polyline',
    });
  }

  return segments;
};

const toSegments = (entities: SketchEntity[]): SegmentSource[] =>
  entities.flatMap((entity) => {
    if (entity.type === 'line') return [lineSegment(entity)];
    if (entity.type === 'polyline') return polylineSegments(entity);
    return [];
  });

export const getPolylineIntersectionPoints = (
  entities: SketchEntity[],
): Array<{
  point: SketchPoint;
  entityIds: [string, string];
}> => {
  const segments = toSegments(entities);
  const intersections: Array<{
    point: SketchPoint;
    entityIds: [string, string];
  }> = [];

  for (let first = 0; first < segments.length; first += 1) {
    for (let second = first + 1; second < segments.length; second += 1) {
      const a = segments[first];
      const b = segments[second];

      if (a.entityId === b.entityId) continue;
      if (a.kind !== 'polyline' && b.kind !== 'polyline') continue;

      const intersection = segmentIntersection(
        a.points[0],
        a.points[1],
        b.points[0],
        b.points[1],
        false,
      );
      if (!intersection) continue;

      const duplicate = intersections.some(
        (existing) =>
          existing.entityIds.includes(a.entityId) &&
          existing.entityIds.includes(b.entityId) &&
          distance(existing.point, intersection.point) < 1e-9,
      );
      if (duplicate) continue;

      intersections.push({
        point: { ...intersection.point },
        entityIds: [a.entityId, b.entityId],
      });
    }
  }

  return intersections;
};

export const findPolylineIntersectionSnap = (
  point: SketchPoint,
  entities: SketchEntity[],
  threshold: number,
): PolylineIntersectionSnapResult | null =>
  findClosestIntersectionSnap(
    point,
    getPolylineIntersectionPoints(entities),
    threshold,
  );
