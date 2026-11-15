import type {
  SketchEntity,
  SketchPoint,
} from '../core/types';
import { findClosestEntitySnap } from './closestSnap';

export type CircleCenterSnapResult = {
  point: SketchPoint;
  entityId: string;
  distance: number;
};

export const getCircleCenterSnapPoint = (
  entity: SketchEntity,
): SketchPoint | null =>
  entity.type === 'circle'
    ? { x: entity.cx, y: entity.cy }
    : null;

export const findCircleCenterSnap = (
  point: SketchPoint,
  entities: SketchEntity[],
  threshold: number,
): CircleCenterSnapResult | null =>
  findClosestEntitySnap(point, entities, threshold, getCircleCenterSnapPoint);
