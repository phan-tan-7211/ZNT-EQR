import type {
  SketchEntity,
  SketchPoint,
} from '../core/types';
import { findClosestEntityPointsSnap } from './closestSnap';

export type MidpointSnapResult = {
  point: SketchPoint;
  entityId: string;
  distance: number;
};

const midpoint = (
  a: SketchPoint,
  b: SketchPoint,
): SketchPoint => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});

export const getEntityMidpointSnapPoints = (
  entity: SketchEntity,
): SketchPoint[] => {
  switch (entity.type) {
    case 'line':
      return [
        midpoint(
          { x: entity.x1, y: entity.y1 },
          { x: entity.x2, y: entity.y2 },
        ),
      ];
    case 'polyline': {
      const points: SketchPoint[] = [];
      for (let index = 0; index < entity.points.length - 1; index += 1) {
        points.push(midpoint(entity.points[index], entity.points[index + 1]));
      }
      if (entity.closed && entity.points.length > 2) {
        points.push(
          midpoint(
            entity.points[entity.points.length - 1],
            entity.points[0],
          ),
        );
      }
      return points;
    }
    case 'rect': {
      const topLeft = { x: entity.x, y: entity.y };
      const topRight = { x: entity.x + entity.w, y: entity.y };
      const bottomRight = {
        x: entity.x + entity.w,
        y: entity.y + entity.h,
      };
      const bottomLeft = { x: entity.x, y: entity.y + entity.h };
      return [
        midpoint(topLeft, topRight),
        midpoint(topRight, bottomRight),
        midpoint(bottomRight, bottomLeft),
        midpoint(bottomLeft, topLeft),
      ];
    }
    case 'circle':
    case 'arc':
      return [];
  }
};

export const findMidpointSnap = (
  point: SketchPoint,
  entities: SketchEntity[],
  threshold: number,
): MidpointSnapResult | null =>
  findClosestEntityPointsSnap(
    point,
    entities,
    threshold,
    getEntityMidpointSnapPoints,
  );
