import { distance } from '../core/geometry';
import type {
  LineEntity,
  SketchConstraint,
  SketchConstraintPointRef,
  SketchEntity,
  SketchPoint,
} from '../core/types';
import { applyCoincidentConstraint } from './basicConstraints';
import {
  applyConcentricConstraint,
  applyEqualConstraint,
  applyMidpointConstraint,
  applyParallelConstraint,
  applyPerpendicularConstraint,
} from './advancedConstraints';
import {
  applySymmetryConstraint,
  applyTangentConstraint,
} from './parametricConstraints';

export type ConstraintSolveStatus =
  | 'under-constrained'
  | 'fully-constrained'
  | 'over-constrained'
  | 'conflict';

export type ConstraintSolveResult = {
  entities: SketchEntity[];
  constraints: SketchConstraint[];
  iterations: number;
  converged: boolean;
  status: ConstraintSolveStatus;
};

const lineLength = (line: LineEntity): number =>
  distance(
    { x: line.x1, y: line.y1 },
    { x: line.x2, y: line.y2 },
  );

const entityDelta = (
  before: SketchEntity,
  after: SketchEntity,
): number => {
  if (before.type !== after.type || before.id !== after.id) return Infinity;

  if (before.type === 'line' && after.type === 'line') {
    return Math.max(
      Math.abs(before.x1 - after.x1),
      Math.abs(before.y1 - after.y1),
      Math.abs(before.x2 - after.x2),
      Math.abs(before.y2 - after.y2),
    );
  }
  if (before.type === 'rect' && after.type === 'rect') {
    return Math.max(
      Math.abs(before.x - after.x),
      Math.abs(before.y - after.y),
      Math.abs(before.w - after.w),
      Math.abs(before.h - after.h),
    );
  }
  if (before.type === 'circle' && after.type === 'circle') {
    return Math.max(
      Math.abs(before.cx - after.cx),
      Math.abs(before.cy - after.cy),
      Math.abs(before.r - after.r),
    );
  }
  if (before.type === 'arc' && after.type === 'arc') {
    return Math.max(
      Math.abs(before.cx - after.cx),
      Math.abs(before.cy - after.cy),
      Math.abs(before.r - after.r),
      Math.abs(before.startAngleDeg - after.startAngleDeg),
      Math.abs(before.endAngleDeg - after.endAngleDeg),
    );
  }
  if (before.type === 'polyline' && after.type === 'polyline') {
    if (before.points.length !== after.points.length) return Infinity;
    return before.points.reduce(
      (max, point, index) =>
        Math.max(
          max,
          Math.abs(point.x - after.points[index].x),
          Math.abs(point.y - after.points[index].y),
        ),
      0,
    );
  }
  return Infinity;
};

const detectConflicts = (
  entities: SketchEntity[],
  constraints: SketchConstraint[],
  tolerance: number,
): Set<string> => {
  const conflicts = new Set<string>();
  const byEntity = new Map<string, SketchConstraint[]>();
  const byPair = new Map<string, SketchConstraint[]>();

  constraints
    .filter((constraint) => constraint.enabled !== false)
    .forEach((constraint) => {
      constraint.entityIds.forEach((entityId) => {
        const list = byEntity.get(entityId) ?? [];
        list.push(constraint);
        byEntity.set(entityId, list);
      });

      const [first, second] = constraint.entityIds;
      if (
        second &&
        (constraint.kind === 'parallel' || constraint.kind === 'perpendicular')
      ) {
        const pairKey = [first, second].sort().join('|');
        const list = byPair.get(pairKey) ?? [];
        list.push(constraint);
        byPair.set(pairKey, list);
      }
    });

  byEntity.forEach((entityConstraints, entityId) => {
    const entity = entities.find((item) => item.id === entityId);
    if (!entity || entity.type !== 'line') return;

    const horizontal = entityConstraints.find(
      (constraint) => constraint.kind === 'horizontal',
    );
    const vertical = entityConstraints.find(
      (constraint) => constraint.kind === 'vertical',
    );

    if (
      horizontal &&
      vertical &&
      lineLength(entity) > tolerance
    ) {
      conflicts.add(horizontal.id);
      conflicts.add(vertical.id);
    }
  });

  // A pair of lines cannot be both parallel and perpendicular at once —
  // flag every parallel/perpendicular constraint sharing that pair as conflicting
  // instead of letting the later one in array order silently win.
  byPair.forEach((pairConstraints) => {
    const kinds = new Set(pairConstraints.map((constraint) => constraint.kind));
    if (kinds.has('parallel') && kinds.has('perpendicular')) {
      pairConstraints.forEach((constraint) => conflicts.add(constraint.id));
    }
  });

  return conflicts;
};

const detectOverConstraints = (
  constraints: SketchConstraint[],
): Set<string> => {
  const byKey = new Map<string, string[]>();

  constraints
    .filter((constraint) => constraint.enabled !== false)
    .forEach((constraint) => {
      const refs = [...(constraint.pointRefs ?? [])]
        .map((ref) => `${ref.entityId}:${ref.point}`)
        .sort()
        .join(',');
      const key = [
        constraint.kind,
        [...constraint.entityIds].sort().join(','),
        refs,
      ].join('|');
      const ids = byKey.get(key) ?? [];
      ids.push(constraint.id);
      byKey.set(key, ids);
    });

  const duplicateIds = new Set<string>();
  byKey.forEach((ids) => {
    if (ids.length > 1) ids.forEach((id) => duplicateIds.add(id));
  });
  return duplicateIds;
};

/**
 * Edit-aware solving context. The projection solver is sequential, so for a
 * two-sided constraint one side has to give way. Without knowing what the
 * user just edited it always moved the *second* entity, which made a
 * chain-drawn profile rigid (dragging a later segment snapped straight back)
 * and let a closed loop end up violating its own H/V constraints. With this
 * context the entity the user edited — and anything the solver has already
 * moved to follow it — stays put, and the untouched side follows, the way an
 * Inventor sketch behaves.
 */
type SolveContext = {
  previousById: Map<string, SketchEntity> | null;
  moved: Set<string>;
  fixedIds: Set<string>;
  tolerance: number;
};

const findLine = (entities: SketchEntity[], id: string): LineEntity | null => {
  const entity = entities.find((item) => item.id === id);
  return entity && entity.type === 'line' ? entity : null;
};

const lineEndpoint = (line: LineEntity, point: SketchConstraintPointRef['point']): SketchPoint | null =>
  point === 'start' ? { x: line.x1, y: line.y1 } : point === 'end' ? { x: line.x2, y: line.y2 } : null;

const withLineEndpoint = (line: LineEntity, point: 'start' | 'end', target: SketchPoint): LineEntity =>
  point === 'start'
    ? { ...line, x1: target.x, y1: target.y }
    : { ...line, x2: target.x, y2: target.y };

const replaceEntity = (entities: SketchEntity[], next: SketchEntity): SketchEntity[] =>
  entities.map((entity) => (entity.id === next.id ? next : entity));

/** Which endpoint of an H/V line should stay put: the one the edit moved. */
const axisAnchor = (line: LineEntity, ctx: SolveContext): 'start' | 'end' => {
  const previous = ctx.previousById?.get(line.id);
  if (!previous || previous.type !== 'line') return 'start';
  const startMoved = Math.hypot(line.x1 - previous.x1, line.y1 - previous.y1) > ctx.tolerance;
  const endMoved = Math.hypot(line.x2 - previous.x2, line.y2 - previous.y2) > ctx.tolerance;
  return endMoved && !startMoved ? 'end' : 'start';
};

const applyAxisConstraint = (
  entities: SketchEntity[],
  constraint: SketchConstraint,
  ctx: SolveContext,
): SketchEntity[] | null => {
  const line = findLine(entities, constraint.entityIds[0]);
  if (!line) return null;
  const anchorEnd = axisAnchor(line, ctx) === 'end';
  const next: LineEntity = constraint.kind === 'horizontal'
    ? anchorEnd ? { ...line, y1: line.y2 } : { ...line, y2: line.y1 }
    : anchorEnd ? { ...line, x1: line.x2 } : { ...line, x2: line.x1 };
  return replaceEntity(entities, next);
};

const applyCoincidentByRefs = (
  entities: SketchEntity[],
  constraint: SketchConstraint,
  ctx: SolveContext,
): SketchEntity[] | null => {
  const [firstRef, secondRef] = constraint.pointRefs ?? [];
  if (!firstRef || !secondRef) return null;
  if ((firstRef.point !== 'start' && firstRef.point !== 'end') || (secondRef.point !== 'start' && secondRef.point !== 'end')) {
    return null;
  }
  const first = findLine(entities, firstRef.entityId);
  const second = findLine(entities, secondRef.entityId);
  if (!first || !second || first.id === second.id) return null;

  const firstFixed = ctx.fixedIds.has(first.id);
  const secondFixed = ctx.fixedIds.has(second.id);
  const secondLeads = secondFixed !== firstFixed
    ? secondFixed
    : ctx.moved.has(second.id) && !ctx.moved.has(first.id);

  const [master, masterRef, slave, slaveRef] = secondLeads
    ? [second, secondRef, first, firstRef]
    : [first, firstRef, second, secondRef];
  const target = lineEndpoint(master, masterRef.point);
  if (!target) return null;
  return replaceEntity(entities, withLineEndpoint(slave, slaveRef.point as 'start' | 'end', target));
};

/** Residual (distance from satisfied) for the constraint kinds auto-inference creates. */
const constraintResidual = (entities: SketchEntity[], constraint: SketchConstraint): number => {
  if (constraint.kind === 'horizontal' || constraint.kind === 'vertical') {
    const line = findLine(entities, constraint.entityIds[0]);
    if (!line) return 0;
    return constraint.kind === 'horizontal' ? Math.abs(line.y2 - line.y1) : Math.abs(line.x2 - line.x1);
  }
  if (constraint.kind === 'coincident') {
    const [firstRef, secondRef] = constraint.pointRefs ?? [];
    if (!firstRef || !secondRef) return 0;
    const first = findLine(entities, firstRef.entityId);
    const second = findLine(entities, secondRef.entityId);
    const a = first && lineEndpoint(first, firstRef.point);
    const b = second && lineEndpoint(second, secondRef.point);
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }
  return 0;
};

const applyConstraint = (
  entities: SketchEntity[],
  constraint: SketchConstraint,
  ctx: SolveContext,
): SketchEntity[] => {
  if (constraint.enabled === false || constraint.conflict) return entities;

  if (constraint.kind === 'horizontal' || constraint.kind === 'vertical') {
    return applyAxisConstraint(entities, constraint, ctx) ?? entities;
  }
  if (constraint.kind === 'coincident') {
    const byRefs = applyCoincidentByRefs(entities, constraint, ctx);
    if (byRefs) return byRefs;
  }

  const [firstId, secondId] = constraint.entityIds;
  const result =
    constraint.kind === 'coincident' && secondId
          ? applyCoincidentConstraint(entities, firstId, secondId, constraint.id)
          : constraint.kind === 'parallel' && secondId
            ? applyParallelConstraint(entities, firstId, secondId, constraint.id)
            : constraint.kind === 'perpendicular' && secondId
              ? applyPerpendicularConstraint(entities, firstId, secondId, constraint.id)
              : constraint.kind === 'equal' && secondId
                ? applyEqualConstraint(entities, firstId, secondId, constraint.id)
                : constraint.kind === 'midpoint' && secondId
                  ? applyMidpointConstraint(entities, firstId, secondId, constraint.id)
                  : constraint.kind === 'concentric' && secondId
                    ? applyConcentricConstraint(entities, firstId, secondId, constraint.id)
                    : constraint.kind === 'tangent' && secondId
                      ? applyTangentConstraint(entities, firstId, secondId, constraint.id)
                      : constraint.kind === 'symmetry' && secondId && constraint.entityIds[2]
                        ? applySymmetryConstraint(
                            entities,
                            firstId,
                            secondId,
                            constraint.entityIds[2],
                            constraint.id,
                          )
                        : null;

  return result?.entities ?? entities;
};

export const solveSketchConstraints = (
  entities: SketchEntity[],
  constraints: SketchConstraint[],
  options: {
    maxIterations?: number;
    tolerance?: number;
    /**
     * The entities as they were before the edit being solved. Entities that
     * differ from (or are new compared to) this snapshot are treated as the
     * user's edit and lead two-sided constraints; omit it for a neutral
     * solve (e.g. a status readout).
     */
    previousEntities?: SketchEntity[];
  } = {},
): ConstraintSolveResult => {
  const maxIterations = Math.max(1, options.maxIterations ?? 24);
  const tolerance = Math.max(1e-9, options.tolerance ?? 1e-6);
  const conflictIds = detectConflicts(
    entities,
    constraints,
    tolerance,
  );
  const overConstraintIds = detectOverConstraints(constraints);
  const markedConstraints = constraints.map((constraint) => ({
    ...constraint,
    conflict: conflictIds.has(constraint.id),
    overConstrained: overConstraintIds.has(constraint.id),
  }));

  if (conflictIds.size) {
    return {
      entities: structuredClone(entities),
      constraints: markedConstraints,
      iterations: 0,
      converged: false,
      status: 'conflict',
    };
  }

  const fixConstraints = markedConstraints.filter(
    (constraint) => constraint.enabled !== false && constraint.kind === 'fix',
  );
  const fixedIds = new Set(fixConstraints.flatMap((constraint) => constraint.entityIds));
  // Fix pins an entity to its geometry AT THE MOMENT Fix was applied
  // (`constraint.fixedGeometry`) — not to whatever the entity looks like
  // when solve happens to run. The production pipeline is
  // "user edit/drag -> postProcess -> solve", so by the time solve runs the
  // passed-in `entities` already reflect the edit; anchoring to that would
  // let a direct drag on a fixed entity stick, which defeats Fix entirely.
  // Constraints created before this snapshot existed fall back to the old
  // pre-solve-entities behavior so older saved sketches don't break.
  const preSolveEntities = new Map(entities.map((entity) => [entity.id, entity]));
  const fixedSnapshots = new Map<string, SketchEntity>();
  fixConstraints.forEach((constraint) => {
    const entityId = constraint.entityIds[0];
    if (!entityId) return;
    const snapshot = constraint.fixedGeometry ?? preSolveEntities.get(entityId);
    if (snapshot) fixedSnapshots.set(entityId, snapshot);
  });
  const restoreFixed = (list: SketchEntity[]): SketchEntity[] =>
    fixedSnapshots.size === 0
      ? list
      : list.map((entity) =>
          fixedSnapshots.has(entity.id)
            ? structuredClone(fixedSnapshots.get(entity.id)!)
            : entity,
        );

  let current = restoreFixed(structuredClone(entities));
  let converged = false;
  let iterations = 0;

  const previousById = options.previousEntities
    ? new Map(options.previousEntities.map((entity) => [entity.id, entity]))
    : null;
  const moved = new Set<string>();
  if (previousById) {
    current.forEach((entity) => {
      const previous = previousById.get(entity.id);
      if (!previous || entityDelta(previous, entity) > tolerance) moved.add(entity.id);
    });
  }
  const ctx: SolveContext = { previousById, moved, fixedIds, tolerance };

  for (let index = 0; index < maxIterations; index += 1) {
    const before = structuredClone(current);
    markedConstraints.forEach((constraint) => {
      const next = applyConstraint(current, constraint, ctx);
      if (next !== current && previousById) {
        // Anything a constraint just moved now follows the edit too, so the
        // change keeps propagating outward instead of being pulled back.
        next.forEach((entity, entityIndex) => {
          const prior = current[entityIndex];
          if (prior && entityDelta(prior, entity) > tolerance) moved.add(entity.id);
        });
      }
      current = next;
    });
    current = restoreFixed(current);
    iterations = index + 1;

    const maxDelta = current.reduce((max, entity, entityIndex) => {
      const previous = before[entityIndex];
      return previous
        ? Math.max(max, entityDelta(previous, entity))
        : Infinity;
    }, 0);

    if (maxDelta <= tolerance) {
      converged = true;
      break;
    }
  }

  // An iteration that stops changing is not proof every constraint holds
  // (two constraints can keep undoing each other to the same state), so
  // only report convergence when the residuals are actually satisfied.
  if (converged) {
    const residualTolerance = Math.max(tolerance * 1000, 1e-6);
    converged = markedConstraints
      .filter((constraint) => constraint.enabled !== false && !constraint.conflict)
      .every((constraint) => constraintResidual(current, constraint) <= residualTolerance);
  }

  const fullyConstrained =
    current.length > 0 &&
    current.every((entity) => fixedIds.has(entity.id));

  return {
    entities: current,
    constraints: markedConstraints,
    iterations,
    converged,
    status: overConstraintIds.size
      ? 'over-constrained'
      : fullyConstrained
        ? 'fully-constrained'
        : 'under-constrained',
  };
};
