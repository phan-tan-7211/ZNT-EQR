import type {
  LineEntity,
  SketchConstraint,
  SketchEntity,
  SketchPoint,
} from '../core/types';

// Snapped points are copied exactly, so a tight tolerance only absorbs
// floating-point noise from typed length/angle input.
const AUTO_CONSTRAINT_EPS = 1e-6;

const samePoint = (a: SketchPoint, b: SketchPoint): boolean =>
  Math.abs(a.x - b.x) <= AUTO_CONSTRAINT_EPS && Math.abs(a.y - b.y) <= AUTO_CONSTRAINT_EPS;

const lineEnds = (line: LineEntity): [SketchPoint, SketchPoint] => [
  { x: line.x1, y: line.y1 },
  { x: line.x2, y: line.y2 },
];

/**
 * Inventor-style constraint inference for a freshly drawn line: a line that
 * came out exactly horizontal/vertical keeps that, and each endpoint that
 * landed on another line's endpoint stays glued to it. Only one coincident
 * per endpoint (the first match, normally the previous segment in a chain)
 * so a junction of several lines doesn't pile up redundant constraints for
 * the solver to fight over.
 */
export const inferLineConstraints = (
  entities: SketchEntity[],
  line: LineEntity,
  createId: (kind: SketchConstraint['kind']) => string,
): SketchConstraint[] => {
  const constraints: SketchConstraint[] = [];
  const [start, end] = lineEnds(line);
  const dx = Math.abs(end.x - start.x);
  const dy = Math.abs(end.y - start.y);
  if (dx <= AUTO_CONSTRAINT_EPS && dy <= AUTO_CONSTRAINT_EPS) return constraints;

  if (dy <= AUTO_CONSTRAINT_EPS) {
    constraints.push({ id: createId('horizontal'), kind: 'horizontal', entityIds: [line.id], enabled: true });
  } else if (dx <= AUTO_CONSTRAINT_EPS) {
    constraints.push({ id: createId('vertical'), kind: 'vertical', entityIds: [line.id], enabled: true });
  }

  const others = entities.filter(
    (entity): entity is LineEntity => entity.type === 'line' && entity.id !== line.id,
  );
  const glued = new Set<string>();
  ([['start', start], ['end', end]] as const).forEach(([ownPoint, point]) => {
    for (const other of others) {
      if (glued.has(other.id)) continue;
      const [otherStart, otherEnd] = lineEnds(other);
      const otherPoint = samePoint(point, otherStart) ? 'start' : samePoint(point, otherEnd) ? 'end' : null;
      if (!otherPoint) continue;
      glued.add(other.id);
      constraints.push({
        id: createId('coincident'),
        kind: 'coincident',
        entityIds: [other.id, line.id],
        pointRefs: [
          { entityId: other.id, point: otherPoint },
          { entityId: line.id, point: ownPoint },
        ],
        enabled: true,
      });
      return;
    }
  });

  return constraints;
};

/**
 * Drops constraints that reference an entity which no longer exists —
 * Trim/Break/Delete replace or remove entities by id, and without this the
 * orphaned constraints linger forever in the status readout and glyphs.
 */
export const pruneOrphanConstraints = (
  entities: SketchEntity[],
  constraints: SketchConstraint[],
): SketchConstraint[] => {
  if (!constraints.length) return constraints;
  const ids = new Set(entities.map((entity) => entity.id));
  const kept = constraints.filter((constraint) => constraint.entityIds.every((id) => ids.has(id)));
  return kept.length === constraints.length ? constraints : kept;
};
