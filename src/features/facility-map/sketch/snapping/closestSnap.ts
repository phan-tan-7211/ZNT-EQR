import { distance } from '../core/geometry';
import type {
  SketchEntity,
  SketchPoint,
} from '../core/types';

export type ClosestEntitySnap = {
  point: SketchPoint;
  entityId: string;
  distance: number;
};

export type IntersectionSnapCandidate = {
  point: SketchPoint;
  entityIds: [string, string];
};

export type ClosestIntersectionSnap = IntersectionSnapCandidate & {
  distance: number;
};

/**
 * Acceptance rule shared by every distance-based snap: a candidate must be
 * strictly inside the threshold and strictly closer than the current best,
 * so on a tie the earlier candidate is kept.
 */
const isCloserSnapCandidate = (
  candidateDistance: number,
  threshold: number,
  best: { distance: number } | null,
): boolean =>
  candidateDistance < threshold &&
  (!best || candidateDistance < best.distance);

const keepCloserEntitySnap = (
  best: ClosestEntitySnap | null,
  point: SketchPoint,
  candidate: SketchPoint,
  entityId: string,
  threshold: number,
): ClosestEntitySnap | null => {
  const candidateDistance = distance(point, candidate);
  if (!isCloserSnapCandidate(candidateDistance, threshold, best)) return best;

  return {
    point: { ...candidate },
    entityId,
    distance: candidateDistance,
  };
};

/**
 * Closest snap inside `threshold` when each entity offers at most one snap
 * point (entities are visited in order).
 */
export const findClosestEntitySnap = (
  point: SketchPoint,
  entities: SketchEntity[],
  threshold: number,
  getSnapPoint: (entity: SketchEntity) => SketchPoint | null,
): ClosestEntitySnap | null => {
  let best: ClosestEntitySnap | null = null;

  entities.forEach((entity) => {
    const candidate = getSnapPoint(entity);
    if (!candidate) return;

    best = keepCloserEntitySnap(best, point, candidate, entity.id, threshold);
  });

  return best;
};

/**
 * Closest snap inside `threshold` when each entity offers a list of snap
 * points (entities, then their points, are visited in order).
 */
export const findClosestEntityPointsSnap = (
  point: SketchPoint,
  entities: SketchEntity[],
  threshold: number,
  getSnapPoints: (entity: SketchEntity) => SketchPoint[],
): ClosestEntitySnap | null => {
  let best: ClosestEntitySnap | null = null;

  entities.forEach((entity) => {
    getSnapPoints(entity).forEach((candidate) => {
      best = keepCloserEntitySnap(best, point, candidate, entity.id, threshold);
    });
  });

  return best;
};

/**
 * Closest of the given intersection points inside `threshold` (candidates are
 * visited in order).
 */
export const findClosestIntersectionSnap = (
  point: SketchPoint,
  intersections: IntersectionSnapCandidate[],
  threshold: number,
): ClosestIntersectionSnap | null => {
  let best: ClosestIntersectionSnap | null = null;

  intersections.forEach((candidate) => {
    const candidateDistance = distance(point, candidate.point);
    if (isCloserSnapCandidate(candidateDistance, threshold, best)) {
      best = {
        point: { ...candidate.point },
        entityIds: candidate.entityIds,
        distance: candidateDistance,
      };
    }
  });

  return best;
};
