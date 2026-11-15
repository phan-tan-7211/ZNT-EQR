import type {
  SketchEntity,
  SketchPoint,
} from '../core/types';
import { findClosestEntitySnap } from './closestSnap';

export type ArcCenterSnapResult = {
  point: SketchPoint;
  entityId: string;
  distance: number;
};

export const getArcCenterSnapPoint = (
  entity: SketchEntity,
): SketchPoint | null =>
  entity.type === 'arc'
    ? { x: entity.cx, y: entity.cy }
    : null;

export const findArcCenterSnap = (
  point: SketchPoint,
  entities: SketchEntity[],
  threshold: number,
): ArcCenterSnapResult | null =>
  findClosestEntitySnap(point, entities, threshold, getArcCenterSnapPoint);
