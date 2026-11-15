import { segmentIntersection } from '../core/geometry';
import type {
  LineEntity,
  SketchEntity,
  SketchPoint,
} from '../core/types';
import { findClosestIntersectionSnap } from './closestSnap';

export type LineIntersectionSnapResult = {
  point: SketchPoint;
  entityIds: [string, string];
  distance: number;
};

const toSegment = (
  entity: LineEntity,
): [SketchPoint, SketchPoint] => [
  { x: entity.x1, y: entity.y1 },
  { x: entity.x2, y: entity.y2 },
];

export const getLineLineIntersectionPoints = (
  entities: SketchEntity[],
): Array<{
  point: SketchPoint;
  entityIds: [string, string];
}> => {
  const lines = entities.filter(
    (entity): entity is LineEntity => entity.type === 'line',
  );
  const intersections: Array<{
    point: SketchPoint;
    entityIds: [string, string];
  }> = [];

  for (let first = 0; first < lines.length; first += 1) {
    for (let second = first + 1; second < lines.length; second += 1) {
      const [a, b] = toSegment(lines[first]);
      const [c, d] = toSegment(lines[second]);
      const intersection = segmentIntersection(a, b, c, d, false);
      if (!intersection) continue;

      intersections.push({
        point: { ...intersection.point },
        entityIds: [lines[first].id, lines[second].id],
      });
    }
  }

  return intersections;
};

export const findLineLineIntersectionSnap = (
  point: SketchPoint,
  entities: SketchEntity[],
  threshold: number,
): LineIntersectionSnapResult | null =>
  findClosestIntersectionSnap(
    point,
    getLineLineIntersectionPoints(entities),
    threshold,
  );
