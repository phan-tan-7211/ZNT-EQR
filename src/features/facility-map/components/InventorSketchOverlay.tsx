import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  Circle as CircleIcon,
  Copy,
  ArrowUpRight,
  Eye,
  EyeOff,
  Minus,
  MousePointer2,
  Rows3,
  Scissors,
  Spline,
  Split,
  Square,
  Trash2,
  Undo2,
  Redo2,
  Ruler,
  Waypoints,
  X,
} from 'lucide-react';

import {
  beginSketchInteraction,
  createSketchCommandState,
  createSketchId,
  displayToModelUnits,
  endSketchInteraction,
  modelUnitsToDisplay,
  normalizeMmPerUnit,
  selectSketchTool,
  unitPrecision,
  useSketchDocumentHistory,
  type LineEntity,
  type SketchDocument,
  type SketchEntity,
  type SketchPoint as Point,
  type SketchStyle,
  type SketchTool,
} from '@/features/facility-map/sketch';
import {
  clientPointToSketchPoint,
  cssPixelsToSketchUnits,
} from '@/features/facility-map/sketch/core/coordinates';
import {
  findEndpointSnap,
} from '@/features/facility-map/sketch/snapping/endpointSnap';
import {
  findMidpointSnap,
} from '@/features/facility-map/sketch/snapping/midpointSnap';
import {
  findCircleCenterSnap,
} from '@/features/facility-map/sketch/snapping/circleCenterSnap';
import {
  findArcCenterSnap,
} from '@/features/facility-map/sketch/snapping/arcCenterSnap';
import {
  findLineLineIntersectionSnap,
} from '@/features/facility-map/sketch/snapping/lineIntersectionSnap';
import {
  findPolylineIntersectionSnap,
} from '@/features/facility-map/sketch/snapping/polylineIntersectionSnap';
import {
  findNearestSnap,
} from '@/features/facility-map/sketch/snapping/nearestSnap';
import {
  DEFAULT_GRID_STEP,
  findGridSnap,
} from '@/features/facility-map/sketch/snapping/gridSnap';
import {
  selectSnapCandidate,
  type SnapCandidate,
} from '@/features/facility-map/sketch/snapping/snapPriority';
import { SnapIndicator } from '@/features/facility-map/sketch/rendering/SnapIndicator';
import { DimensionRenderer } from '@/features/facility-map/sketch/rendering/DimensionRenderer';
import { ConstraintGlyphRenderer } from '@/features/facility-map/sketch/rendering/ConstraintGlyphRenderer';
import {
  getSketchViewDimensions,
  type ViewDimension,
} from '@/features/facility-map/sketch/dimensions/viewDimensions';
import {
  applyDrivingDimension,
  upsertDrivingDimension,
} from '@/features/facility-map/sketch/dimensions/drivingDimensions';
import {
  hideDimension,
  setDimensionReference,
} from '@/features/facility-map/sketch/dimensions/dimensionState';
import {
  applyCoincidentConstraint,
  applyHorizontalConstraint,
  applyVerticalConstraint,
} from '@/features/facility-map/sketch/constraints/basicConstraints';
import {
  applyConcentricConstraint,
  applyEqualConstraint,
  applyFixConstraint,
  applyMidpointConstraint,
  applyParallelConstraint,
  applyPerpendicularConstraint,
} from '@/features/facility-map/sketch/constraints/advancedConstraints';
import { solveSketchConstraints } from '@/features/facility-map/sketch/constraints/constraintSolver';
import {
  inferLineConstraints,
  pruneOrphanConstraints,
} from '@/features/facility-map/sketch/constraints/autoConstraints';
import {
  isDynamicInputKey,
  pickPrimaryDimension,
  resolveToolShortcut,
  shortcutForTool,
} from '@/features/facility-map/sketch/commands/shortcuts';
import {
  applySymmetryConstraint,
  applyTangentConstraint,
} from '@/features/facility-map/sketch/constraints/parametricConstraints';
import {
  toggleSelection,
} from '@/features/facility-map/sketch/selection/selectionState';
import {
  selectEntitiesInDrag,
} from '@/features/facility-map/sketch/selection/windowSelection';
import {
  applyBasicGripDrag,
  getBasicEntityGrips,
  type BasicGrip,
} from '@/features/facility-map/sketch/selection/basicGrips';
import {
  duplicateSelectedEntities,
  moveSelectedEntities,
} from '@/features/facility-map/sketch/selection/selectionTransform';
import {
  applyHorizontalInference,
  isHorizontalInferenceCandidate,
} from '@/features/facility-map/sketch/snapping/horizontalInference';
import {
  applyVerticalInference,
  isVerticalInferenceCandidate,
} from '@/features/facility-map/sketch/snapping/verticalInference';
import {
  angleDeg,
  arcPoint,
  degToRad,
  distance,
} from '@/features/facility-map/sketch/core/geometry';
import {
  commitExtend,
  commitTrim,
  effectiveModifyMode,
  getExtendPreview,
  getTrimPreview,
  type ModifyPreview,
} from '@/features/facility-map/sketch/modify/trimExtend';
import {
  breakLineAtPoint,
  createOffsetEntity,
  offsetChain,
} from '@/features/facility-map/sketch/modify/breakOffset';
import { mirrorSelectedEntities } from '@/features/facility-map/sketch/modify/mirror';
import {
  canDeleteParameter,
  recalculateParameters,
  renameParameter,
} from '@/features/facility-map/sketch/parametric/parameterEngine';
import {
  bindDimensionToParameter,
  dimensionParameterDimension,
  recalculateParametricDocument,
} from '@/features/facility-map/sketch/parametric/parameterBinding';
import { calibrateMmPerUnitFromFloorWidth } from '@/features/facility-map/sketch/integration/calibration';
import {
  getLineDynamicAngle,
  getLineDynamicLength,
  getLineKeyboardAction,
  resolveLinePreviewEnd,
  startLineDraft,
  updateLineDraft,
  type LineDraft,
} from '@/features/facility-map/sketch/commands/lineCommand';
import {
  createRectangleEntity,
  getRectangleDynamicHeight,
  getRectangleDynamicWidth,
  resolveRectangleHeight,
  resolveRectangleWidth,
  startRectangleDraft,
  updateRectangleDraft,
  type RectangleDraft,
} from '@/features/facility-map/sketch/commands/rectangleCommand';
import {
  createCircleEntity,
  getCircleDynamicRadius,
  resolveCircleRadius,
  resolveCirclePreviewPoint,
  startCircleDraft,
  updateCircleDraft,
  type CircleDraft,
} from '@/features/facility-map/sketch/commands/circleCommand';
import {
  appendPolylinePoint,
  createPolylineEntity,
  finishPolylineDraft,
  startPolylineDraft,
  updatePolylineDraft,
  type PolylineDraft,
} from '@/features/facility-map/sketch/commands/polylineCommand';
import {
  createArcEntity,
  setArcStartPoint,
  startArcDraft,
  updateArcDraft,
  type ArcDraft,
} from '@/features/facility-map/sketch/commands/arcCommand';
import {
  parseToolPresets,
  TOOL_PRESET_STORAGE_KEY,
  updateToolPreset,
  type ToolPresetMap,
} from '@/features/facility-map/sketch/persistence/toolPresets';

type Draft =
  | LineDraft
  | RectangleDraft
  | CircleDraft
  | PolylineDraft
  | ArcDraft
  | null;

// The single choke point every sketch edit passes through (see
// useSketchDocumentHistory's `postProcess` option). Without this, geometric
// constraints (Horizontal/Vertical/Coincident/Parallel/Perpendicular/Equal/
// Fix/Midpoint/Concentric/Tangent/Symmetry) only ever computed a status
// badge — dragging a grip, editing a driving dimension, or running
// Trim/Extend/Offset/Mirror never actually re-solved and applied the
// constrained geometry. Running the solver here means every commit,
// transient drag update, and finished transaction reflects solved geometry.
const SHOW_DIMENSIONS_STORAGE_KEY = 'znteqr.facilityMap.sketch.showDimensions';

// A comfortable, zoom-independent click/hover target for thin geometry —
// matches the 10px radius already used for endpoint/midpoint/grid snapping
// (see the `threshold` computed with cssPixelsToSketchUnits in this file).
const ENTITY_HIT_TARGET_PX = 10;

// i18n keys for the solver's `status` codes shown in the Constraints readout.
const CONSTRAINT_STATUS_LABEL_KEYS: Record<string, string> = {
  'under-constrained': 'facilityMap.sketchStatusUnderConstrained',
  'fully-constrained': 'facilityMap.sketchStatusFullyConstrained',
  'over-constrained': 'facilityMap.sketchStatusOverConstrained',
  conflict: 'facilityMap.sketchStatusConflict',
};

const applySketchConstraintSolve = (input: SketchDocument): SketchDocument => {
  const liveConstraints = pruneOrphanConstraints(input.entities, input.constraints);
  const document = liveConstraints === input.constraints ? input : { ...input, constraints: liveConstraints };
  if (!document.constraints.length) return document;
  const solved = solveSketchConstraints(document.entities, document.constraints);
  if (solved.status === 'conflict') {
    // Don't let a conflicting constraint pair silently rewrite geometry —
    // keep the entities as edited and only refresh the conflict flags so
    // the UI can surface it.
    return { ...document, constraints: solved.constraints };
  }
  return { ...document, entities: solved.entities, constraints: solved.constraints };
};

const isCreateSketchTool = (tool: SketchTool): boolean =>
  tool === 'line' || tool === 'polyline' || tool === 'rect' || tool === 'circle' || tool === 'arc';

const blurActiveInput = () => {
  const active = document.activeElement;
  if (active instanceof HTMLInputElement) active.blur();
};

type DynamicLocks = {
  a: boolean;
  b: boolean;
};

export type InventorSketchOverlayProps = {
  enabled: boolean;
  /**
   * Lets finished sketch geometry be *clicked* outside Sketch Mode, the way
   * a closed Inventor sketch is still a selectable, draggable feature in
   * the browser tree — but only as one rigid whole. Unlike `enabled`, this
   * never shows the create/modify toolbar, never allows per-entity/grip
   * editing, and a click is handed to `onGroupMouseDown` instead of being
   * handled internally: moving the whole block is the parent's job (its
   * existing pin/zone/annotation drag-and-marquee-select system), because
   * only it knows about the *other* objects a multi-select drag might also
   * be carrying along.
   */
  interactive?: boolean;
  /**
   * A live, render-only (dx, dy) shift — in this document's own model
   * units — applied to every entity while the parent is mid-drag on a
   * whole-sketch group move. Never touches the underlying document/history;
   * the parent commits the real change itself once the drag ends.
   */
  translateOffset?: { dx: number; dy: number };
  visible?: boolean;
  storageKey: string;
  sessionKey?: number | string;
  initialDocument?: SketchDocument;
  canvasWidth: number;
  canvasHeight: number;
  /**
   * Draws a model-unit grid, spaced at `gridStep`, inside the sketch itself.
   * Without this the only visible grid was the floor plan's own percentage-
   * based background grid — a different coordinate space that never lined
   * up with where `snapToGrid` actually snapped to, making "grid snap" feel
   * broken even while it was working exactly as configured.
   */
  showGrid?: boolean;
  /** Whether the grid candidate participates in snapping at all. */
  snapToGrid?: boolean;
  /** Grid spacing in this sketch's own model units. */
  gridStep?: number;
  // Matches useI18n()'s real `t` signature (I18nProvider's TranslationParams)
  // so callers can pass it through directly without a cast.
  t: (key: string, params?: Record<string, string | number>) => string;
  onDocumentChange?: (document: SketchDocument) => void;
  /** Entity mousedown while `interactive` and not `enabled` — see `interactive`. */
  onGroupMouseDown?: (event: React.MouseEvent) => void;
  onFinish: (document: SketchDocument) => void;
  onCancel: () => void;
  /**
   * An element outside the parent's pan/zoom-transformed drawing layer.
   * When set, the toolbar and properties panel are portaled there instead
   * of rendering inline, so they stay pinned to the viewport frame instead
   * of panning/scaling along with the drawing underneath them.
   */
  toolbarPortalTarget?: HTMLElement | null;
};

export default function InventorSketchOverlay({
  enabled,
  interactive = false,
  translateOffset,
  visible = true,
  storageKey,
  sessionKey,
  initialDocument,
  canvasWidth,
  canvasHeight,
  showGrid = false,
  snapToGrid = true,
  gridStep = DEFAULT_GRID_STEP,
  t,
  onDocumentChange,
  onGroupMouseDown,
  onFinish,
  onCancel,
  toolbarPortalTarget,
}: InventorSketchOverlayProps) {
  const sketchHistory = useSketchDocumentHistory(storageKey, {
    initialDocument,
    sessionKey,
    onChange: onDocumentChange,
    postProcess: applySketchConstraintSolve,
  });
  const store = sketchHistory.document;
  const setStore = sketchHistory.commit;
  const [commandState, setCommandState] = useState(() => createSketchCommandState());
  const tool = commandState.tool;
  // `enabled` drives full Sketch Mode (toolbar, panels, every tool).
  // `interactive` alone only allows select + drag-to-move on existing
  // geometry — see the prop doc comment above. Both funnel through the
  // same select/grip handlers, which is safe because the effect below
  // already forces `tool` back to 'select' whenever `enabled` is false.
  const canInteract = enabled || interactive;
  // The last non-select tool, so Space/Enter can repeat it the way
  // Inventor's "Repeat <command>" does.
  const lastToolRef = useRef<SketchTool | null>(null);
  const setTool = useCallback((nextTool: SketchTool) => {
    if (nextTool !== 'select') lastToolRef.current = nextTool;
    setCommandState((current) => selectSketchTool(current, nextTool));
  }, []);
  const [presets, setPresets] = useState<ToolPresetMap>(() =>
    parseToolPresets(localStorage.getItem(TOOL_PRESET_STORAGE_KEY)),
  );
  // A view-only preference (not sketch document data): whether the
  // auto-generated length/angle/radius labels render at all. With many
  // entities on screen these stack up and become unreadable, so users need
  // a bulk on/off switch in addition to hiding individual dimensions.
  const [showDimensions, setShowDimensions] = useState(() => {
    try {
      return localStorage.getItem(SHOW_DIMENSIONS_STORAGE_KEY) !== 'false';
    } catch {
      return true;
    }
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedDimensionId, setSelectedDimensionId] = useState('');
  const [activeSnap, setActiveSnap] = useState<SnapCandidate | null>(null);
  const [selectionBox, setSelectionBox] = useState<{ start: Point; current: Point } | null>(null);
  const [draft, setDraft] = useState<Draft>(null);
  const [pointer, setPointer] = useState<Point>({ x: 0, y: 0 });
  const [dynamicA, setDynamicA] = useState('');
  const [dynamicB, setDynamicB] = useState('');
  const [dynamicLocks, setDynamicLocks] = useState<DynamicLocks>({ a: false, b: false });
  const [message, setMessage] = useState('');
  const [modifyPreview, setModifyPreview] = useState<ModifyPreview | null>(null);
  const [draggingId, setDraggingId] = useState('');
  const [activeGrip, setActiveGrip] = useState<BasicGrip | null>(null);
  const dragRef = useRef<{ start: Point; entities: SketchEntity[] } | null>(null);
  const gripRef = useRef<{ entity: SketchEntity; grip: BasicGrip } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  // First field of the heads-up value box, so typing a digit while
  // drawing jumps straight into it (Inventor's dynamic input).
  const dynamicInputRef = useRef<HTMLInputElement | null>(null);
  // Live rendered width of the SVG in CSS pixels, kept in sync via
  // ResizeObserver so entity hit-areas stay a constant on-screen size
  // (ENTITY_HIT_TARGET_PX) across zoom levels and window resizes — mirrors
  // the on-demand `rect.width` reads already used for snap thresholds, but
  // as state so it's available synchronously during render.
  const [viewportWidthPx, setViewportWidthPx] = useState(0);

  useEffect(() => {
    setSelectedIds([]);
    setSelectedDimensionId('');
    setSelectionBox(null);
    setDraft(null);
    setCommandState(createSketchCommandState());
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(TOOL_PRESET_STORAGE_KEY, JSON.stringify(presets));
  }, [presets]);

  useEffect(() => {
    try {
      localStorage.setItem(SHOW_DIMENSIONS_STORAGE_KEY, String(showDimensions));
    } catch {
      // Ignore storage failures (private browsing, quota, etc.) — the
      // toggle still works for the current session.
    }
  }, [showDimensions]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || typeof ResizeObserver === 'undefined') return;
    const updateWidth = () => setViewportWidthPx(svg.getBoundingClientRect().width);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(svg);
    return () => observer.disconnect();
  }, [enabled]);

  useEffect(() => {
    // Per-entity/grip editing (selection, drafts, drag state, tool) only
    // ever exists while fully `enabled` — `interactive` alone never sets
    // any of it (see `onGroupMouseDown`), so it's safe to key this purely
    // on `enabled` again.
    if (!enabled) {
      setDraft(null);
      setSelectedIds([]);
      setSelectedDimensionId('');
      setSelectionBox(null);
      setDraggingId('');
      setActiveGrip(null);
      gripRef.current = null;
      setCommandState(createSketchCommandState());
    }
  }, [enabled]);


  const currentStyle = useMemo(() => {
    if (
      tool === 'line' ||
      tool === 'polyline' ||
      tool === 'rect' ||
      tool === 'circle' ||
      tool === 'arc'
    ) {
      return presets[tool];
    }
    return presets.line;
  }, [presets, tool]);

  const pointFromEvent = useCallback((event: React.MouseEvent<SVGSVGElement | SVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return null;
    return clientPointToSketchPoint(
      event.clientX,
      event.clientY,
      svg.getBoundingClientRect(),
      canvasWidth,
      canvasHeight,
    );
  }, [canvasHeight, canvasWidth]);

  const endpointSnap = useCallback((point: Point) => {
    const svg = svgRef.current;
    if (!svg) return point;
    const rect = svg.getBoundingClientRect();
    const threshold = cssPixelsToSketchUnits(10, rect.width, canvasWidth);
    const endpoint = findEndpointSnap(point, store.entities, threshold);
    const midpoint = findMidpointSnap(point, store.entities, threshold);
    const circleCenter = findCircleCenterSnap(
      point,
      store.entities,
      threshold,
    );
    const arcCenter = findArcCenterSnap(
      point,
      store.entities,
      threshold,
    );
    const lineIntersection = findLineLineIntersectionSnap(
      point,
      store.entities,
      threshold,
    );
    const polylineIntersection = findPolylineIntersectionSnap(
      point,
      store.entities,
      threshold,
    );
    const nearest = findNearestSnap(
      point,
      store.entities,
      threshold,
    );
    const grid = snapToGrid ? findGridSnap(point, threshold, gridStep) : null;
    const best = selectSnapCandidate([
      endpoint && {
        kind: 'endpoint',
        point: endpoint.point,
        distance: endpoint.distance,
      },
      lineIntersection && {
        kind: 'intersection',
        point: lineIntersection.point,
        distance: lineIntersection.distance,
      },
      polylineIntersection && {
        kind: 'intersection',
        point: polylineIntersection.point,
        distance: polylineIntersection.distance,
      },
      midpoint && {
        kind: 'midpoint',
        point: midpoint.point,
        distance: midpoint.distance,
      },
      circleCenter && {
        kind: 'center',
        point: circleCenter.point,
        distance: circleCenter.distance,
      },
      arcCenter && {
        kind: 'center',
        point: arcCenter.point,
        distance: arcCenter.distance,
      },
      nearest && {
        kind: 'nearest',
        point: nearest.point,
        distance: nearest.distance,
      },
      grid && {
        kind: 'grid',
        point: grid.point,
        distance: grid.distance,
      },
    ]);

    setActiveSnap(best);
    return best?.point ?? point;
  }, [canvasWidth, store.entities, snapToGrid, gridStep]);

  const inferLineEnd = useCallback((start: Point, raw: Point) => {
    const snapped = endpointSnap(raw);
    if (isHorizontalInferenceCandidate(start, snapped)) {
      return applyHorizontalInference(start, snapped);
    }
    if (isVerticalInferenceCandidate(start, snapped)) {
      return applyVerticalInference(start, snapped);
    }
    return snapped;
  }, [endpointSnap]);

  const updatePreset = (patch: Partial<SketchStyle>) => {
    if (
      tool !== 'line' &&
      tool !== 'polyline' &&
      tool !== 'arc' &&
      tool !== 'rect' &&
      tool !== 'circle'
    ) {
      return;
    }
    setPresets((current) => updateToolPreset(current, tool, patch));
  };

  const resetDynamic = () => {
    setDynamicA('');
    setDynamicB('');
    setDynamicLocks({ a: false, b: false });
  };

  const updateDynamicFromPointer = (next: Point) => {
    if (!draft) return;
    if (draft.type === 'line') {
      if (!dynamicLocks.a) setDynamicA(getLineDynamicLength(draft.start, next, store));
      if (!dynamicLocks.b) setDynamicB(getLineDynamicAngle(draft.start, next));
    } else if (draft.type === 'rect') {
      if (!dynamicLocks.a) setDynamicA(getRectangleDynamicWidth(draft.start, next, store));
      if (!dynamicLocks.b) setDynamicB(getRectangleDynamicHeight(draft.start, next, store));
    } else if (draft.type === 'circle') {
      if (!dynamicLocks.a) setDynamicA(getCircleDynamicRadius(draft.start, next, store));
    }
  };

  const finishCreateInteraction = () => {
    setDraft(null);
    setCommandState((current) => endSketchInteraction(current));
    resetDynamic();
    blurActiveInput();
  };

  // Drops the shape being drawn but stays in the current tool, the way the
  // first Esc in Inventor ends a line chain without leaving the Line command.
  const cancelDraft = () => {
    finishCreateInteraction();
    setMessage('');
  };

  /**
   * Commits the current line and, like Inventor's Line command, immediately
   * starts the next segment from its end so a profile can be drawn as one
   * click per corner. Esc, right-click, or clicking the chain's start point
   * again ends the chain. New lines get horizontal/vertical/coincident
   * constraints inferred from how they were snapped; holding Ctrl while
   * clicking suppresses that inference.
   */
  const commitLine = (currentPoint: Point, options: { suppressInference?: boolean } = {}) => {
    if (!draft || draft.type !== 'line') return;

    // Only a value the user actually typed (a locked field) overrides the
    // pointer. Feeding back the auto-filled, display-rounded text would nudge
    // a snapped endpoint off the point it snapped to.
    const end = resolveLinePreviewEnd({
      start: draft.start,
      current: currentPoint,
      lengthInput: dynamicA,
      angleInput: dynamicB,
      lockLength: dynamicLocks.a,
      lockAngle: dynamicLocks.b,
      document: store,
    });
    const line: LineEntity = {
      id: createSketchId('sketch-line'),
      type: 'line',
      x1: draft.start.x,
      y1: draft.start.y,
      x2: end.x,
      y2: end.y,
      ...presets.line,
    };
    if (distance(draft.start, end) <= 1e-9) {
      cancelDraft();
      return;
    }

    setStore((current) => {
      const inferred = options.suppressInference
        ? []
        : inferLineConstraints(current.entities, line, (kind) => createSketchId(`constraint-${kind}`));
      return {
        ...current,
        entities: [...current.entities, line],
        constraints: inferred.length ? [...current.constraints, ...inferred] : current.constraints,
      };
    });
    resetDynamic();
    blurActiveInput();
    setDraft(startLineDraft(end));
  };

  const handleLineInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!draft || draft.type !== 'line') return;
    const action = getLineKeyboardAction(event.key);
    if (action === 'none') return;

    event.preventDefault();
    event.stopPropagation();

    if (action === 'confirm') {
      commitLine(pointer);
      return;
    }

    cancelDraft();
  };

  const handleShapeInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!draft || (draft.type !== 'rect' && draft.type !== 'circle')) return;
    if (event.key !== 'Enter' && event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === 'Enter') commitDraft(pointer);
    else cancelDraft();
  };

  const commitPolyline = (polylineDraft: PolylineDraft) => {
    const entity = createPolylineEntity({
      draft: polylineDraft,
      style: presets.polyline,
    });
    if (!entity) return false;

    setStore((current) => ({
      ...current,
      entities: [...current.entities, entity],
    }));
    finishCreateInteraction();
    return true;
  };

  const finishActivePolyline = () => {
    if (!draft || draft.type !== 'polyline') return;
    const finished = finishPolylineDraft(draft);
    if (!finished) return;
    commitPolyline(finished);
  };


  const commitArc = (arcDraft: ArcDraft) => {
    const entity = createArcEntity({
      draft: arcDraft,
      style: presets.arc,
    });
    if (!entity) return false;

    setStore((current) => ({
      ...current,
      entities: [...current.entities, entity],
    }));
    finishCreateInteraction();
    return true;
  };

  const commitDraft = (currentPoint: Point) => {
    if (!draft || draft.type === 'line' || draft.type === 'polyline' || draft.type === 'arc') return;
    const style = draft.type === 'rect' ? presets.rect : presets.circle;

    if (draft.type === 'rect') {
      const fallbackW = Math.abs(currentPoint.x - draft.start.x);
      const fallbackH = Math.abs(currentPoint.y - draft.start.y);
      // Same rule as the line: only typed (locked) values override the pointer.
      const width = dynamicLocks.a ? resolveRectangleWidth(dynamicA, fallbackW, store) : fallbackW;
      const height = dynamicLocks.b ? resolveRectangleHeight(dynamicB, fallbackH, store) : fallbackH;
      const rect = createRectangleEntity({
        draft,
        current: currentPoint,
        width,
        height,
        style,
      });
      setStore((current) => ({
        ...current,
        entities: [...current.entities, rect],
      }));
    } else {
      const fallbackRadius = distance(draft.start, currentPoint);
      const radius = dynamicLocks.a ? resolveCircleRadius(dynamicA, fallbackRadius, store) : fallbackRadius;
      const circle = createCircleEntity({
        draft,
        radius,
        style,
      });
      setStore((current) => ({
        ...current,
        entities: [...current.entities, circle],
      }));
    }

    finishCreateInteraction();
  };

  const handleCanvasMouseDown = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!enabled || event.button !== 0) return;
    const raw = pointFromEvent(event);
    if (!raw) return;
    // Commit exactly what the preview showed: the line preview applies
    // horizontal/vertical inference on top of point snapping, so the click
    // has to as well or a line that looked horizontal lands a hair off.
    const point = draft?.type === 'line' ? inferLineEnd(draft.start, raw) : endpointSnap(raw);
    setPointer(point);

    if (tool === 'line') {
      event.stopPropagation();
      if (!draft) {
        setDraft(startLineDraft(point));
        setCommandState((current) => beginSketchInteraction(current, 'creating'));
        resetDynamic();
        return;
      }
      commitLine(point, { suppressInference: event.ctrlKey || event.metaKey });
      return;
    }

    if (tool === 'polyline') {
      event.stopPropagation();
      if (!draft) {
        setDraft(startPolylineDraft(point));
        setCommandState((current) => beginSketchInteraction(current, 'creating'));
        resetDynamic();
        return;
      }
      if (draft.type === 'polyline') {
        setDraft(appendPolylinePoint(draft, point));
      }
      return;
    }

    if (tool === 'arc') {
      event.stopPropagation();
      if (!draft) {
        setDraft(startArcDraft(point));
        setCommandState((current) => beginSketchInteraction(current, 'creating'));
        resetDynamic();
        return;
      }
      if (draft.type === 'arc') {
        if (!draft.start) {
          setDraft(setArcStartPoint(draft, point));
          return;
        }
        commitArc(updateArcDraft(draft, point));
      }
      return;
    }

    if (tool === 'rect') {
      event.stopPropagation();
      if (!draft) {
        setDraft(startRectangleDraft(point));
        setCommandState((current) => beginSketchInteraction(current, 'creating'));
        resetDynamic();
        return;
      }
      commitDraft(point);
      return;
    }

    if (tool === 'circle') {
      event.stopPropagation();
      if (!draft) {
        setDraft(startCircleDraft(point));
        setCommandState((current) => beginSketchInteraction(current, 'creating'));
        resetDynamic();
        return;
      }
      commitDraft(point);
      return;
    }

    if (tool === 'select') {
      setSelectedIds([]);
      setSelectionBox({ start: raw, current: raw });
      setActiveSnap(null);
    }
  };

  const handleCanvasMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const raw = pointFromEvent(event);
    if (!raw) return;

    if (selectionBox && tool === 'select' && !draggingId) {
      setSelectionBox((current) => current ? { ...current, current: raw } : null);
      setPointer(raw);
      setActiveSnap(null);
      return;
    }

    const next = draft?.type === 'line' ? inferLineEnd(draft.start, raw) : endpointSnap(raw);
    setPointer(next);

    if (activeGrip && gripRef.current) {
      const source = gripRef.current.entity;
      const updated = applyBasicGripDrag(source, gripRef.current.grip, next);
      sketchHistory.updateTransient((current) => ({
        ...current,
        entities: current.entities.map((entity) =>
          entity.id === source.id ? updated : entity,
        ),
      }));
      return;
    }

    if (draggingId && dragRef.current) {
      const dx = next.x - dragRef.current.start.x;
      const dy = next.y - dragRef.current.start.y;
      const moved = moveSelectedEntities(
        dragRef.current.entities,
        dragRef.current.entities.map((entity) => entity.id),
        dx,
        dy,
      );
      const movedById = new Map(moved.map((entity) => [entity.id, entity]));
      sketchHistory.updateTransient((current) => ({
        ...current,
        entities: current.entities.map(
          (entity) => movedById.get(entity.id) ?? entity,
        ),
      }));
      return;
    }

    if (draft) {
      setDraft(
        draft.type === 'line'
          ? updateLineDraft(draft, next)
          : draft.type === 'rect'
            ? updateRectangleDraft(draft, next)
            : draft.type === 'circle'
              ? updateCircleDraft(draft, next)
              : draft.type === 'polyline'
                ? updatePolylineDraft(draft, next)
                : updateArcDraft(draft, next),
      );
      updateDynamicFromPointer(next);
    }
  };

  const resolveModifyPreview = (
    entity: SketchEntity,
    point: Point,
    shiftKey: boolean,
  ) => {
    if (tool !== 'trim' && tool !== 'extend') return null;
    const mode = effectiveModifyMode(tool, shiftKey);
    if (mode === 'trim') {
      return getTrimPreview(store.entities, entity, point);
    }
    return entity.type === 'line' || entity.type === 'arc'
      ? getExtendPreview(store.entities, entity, point)
      : null;
  };

  const handleEntityMouseDown = (event: React.MouseEvent<SVGElement>, entity: SketchEntity) => {
    if (!enabled) {
      // Outside Sketch Mode, a click on any entity selects/drags the whole
      // sketch as one block — that's the parent's existing pin/zone/
      // annotation select+drag system, not per-entity editing here.
      if (interactive) {
        event.stopPropagation();
        onGroupMouseDown?.(event);
      }
      return;
    }
    // A create tool (line/rect/circle/...) starting a new shape on top of an
    // existing entity must fall through to the canvas's own draw-start
    // handler — stopping propagation here (as every other tool needs, to
    // claim the click for itself) swallowed the mousedown before it ever
    // reached the canvas, so drawing over existing geometry silently did
    // nothing and the only workaround was drawing beside it and dragging it
    // into place afterward.
    if (isCreateSketchTool(tool)) return;

    const point = pointFromEvent(event);
    if (!point) return;
    event.stopPropagation();

    if (tool === 'dimension') {
      // Inventor's D: pick geometry, type its size. Edits the entity's main
      // dimension (length / radius / diameter), never its angle first.
      const dimension = pickPrimaryDimension(viewDimensions, entity.id);
      if (!dimension) return;
      setShowDimensions(true);
      editDimension(dimension);
      return;
    }

    if (tool === 'break') {
      if (entity.type !== 'line') {
        setMessage(t('facilityMap.sketchBreakLineOnly'));
        return;
      }
      const nextEntities = breakLineAtPoint(
        store.entities,
        entity,
        point,
        () => createSketchId('sketch-line'),
      );
      if (!nextEntities) {
        setMessage(t('facilityMap.sketchBreakInvalidPoint'));
        return;
      }
      setStore((current) => ({
        ...current,
        entities: nextEntities,
      }));
      setMessage(t('facilityMap.sketchBreakApplied'));
      return;
    }

    if (tool === 'offset') {
      const rawDistance = window.prompt(
        t('facilityMap.sketchOffsetPrompt', { unit: store.displayUnit }),
        '10',
      );
      if (rawDistance == null) return;
      const displayDistance = Number(rawDistance);
      if (!Number.isFinite(displayDistance) || displayDistance <= 0) {
        setMessage(t('facilityMap.sketchOffsetInvalid'));
        return;
      }
      const modelDistance = displayToModelUnits(
        displayDistance,
        store,
      );
      // Matches Inventor's own Offset: picking one edge of a connected
      // chain offsets the whole chain by default, the same way it offsets
      // a whole closed profile from one picked curve — hold Ctrl/Cmd to
      // force just the single picked curve instead. The chain can mix
      // Line and Arc segments (e.g. a rounded corner), unlike the
      // single-curve fallback below.
      const chainResult =
        (entity.type === 'line' || entity.type === 'arc') && !event.ctrlKey && !event.metaKey
          ? offsetChain(
              store.entities,
              entity,
              modelDistance,
              point,
              () => createSketchId('sketch-chain'),
            )
          : null;
      const newEntities = chainResult
        ? chainResult.offsetEntities
        : (() => {
            const single = createOffsetEntity(
              entity,
              modelDistance,
              point,
              createSketchId(`sketch-${entity.type}`),
            );
            return single ? [single] : [];
          })();
      if (!newEntities.length) {
        setMessage(t('facilityMap.sketchOffsetUnsupported'));
        return;
      }
      setStore((current) => ({
        ...current,
        entities: [...current.entities, ...newEntities],
      }));
      setSelectedIds(newEntities.map((created) => created.id));
      setMessage(
        chainResult
          ? t('facilityMap.sketchOffsetChainApplied', { count: chainResult.chain.segments.length })
          : t('facilityMap.sketchOffsetApplied'),
      );
      return;
    }

    if (tool === 'trim' || tool === 'extend') {
      const mode = effectiveModifyMode(tool, event.shiftKey);
      const nextEntities =
        mode === 'trim'
          ? commitTrim(
              store.entities,
              entity,
              point,
              () => createSketchId('sketch-line'),
            )
          : entity.type === 'line' || entity.type === 'arc'
            ? commitExtend(store.entities, entity, point)
            : null;
      if (!nextEntities) {
        setMessage(
          mode === 'trim'
            ? t('facilityMap.sketchNoTrimBoundary')
            : t('facilityMap.sketchNoExtendBoundary'),
        );
        return;
      }
      setStore((current) => ({
        ...current,
        entities: nextEntities,
      }));
      setModifyPreview(null);
      setMessage(
        mode === 'trim'
          ? t('facilityMap.sketchTrimApplied')
          : t('facilityMap.sketchExtendApplied'),
      );
      return;
    }
    if (tool !== 'select') return;

    if (event.ctrlKey || event.metaKey) {
      setSelectedIds((current) => toggleSelection(current, entity.id));
      return;
    }

    const dragIds = selectedIds.includes(entity.id)
      ? selectedIds
      : [entity.id];
    setSelectedIds(dragIds);
    dragRef.current = {
      start: point,
      entities: store.entities
        .filter((item) => dragIds.includes(item.id))
        .map((item) => structuredClone(item)),
    };
    sketchHistory.beginTransaction();
    setCommandState((current) => beginSketchInteraction(current, 'dragging'));
    setDraggingId(entity.id);
  };

  const handleEntityMouseUp = () => {
    if (draggingId || activeGrip) sketchHistory.commitTransaction();
    setDraggingId('');
    setActiveGrip(null);
    dragRef.current = null;
    gripRef.current = null;
    setCommandState((current) => endSketchInteraction(current));
  };

  const handleGripMouseDown = (
    event: React.MouseEvent<SVGCircleElement>,
    entity: SketchEntity,
    grip: BasicGrip,
  ) => {
    if (!enabled || tool !== 'select') return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedIds([entity.id]);
    gripRef.current = { entity: structuredClone(entity), grip };
    sketchHistory.beginTransaction();
    setCommandState((current) => beginSketchInteraction(current, 'dragging'));
    setActiveGrip(grip);
  };

  const handleCanvasMouseUp = () => {
    if (selectionBox && tool === 'select' && !draggingId) {
      setSelectedIds(
        selectEntitiesInDrag(
          store.entities,
          selectionBox.start,
          selectionBox.current,
        ),
      );
      setSelectionBox(null);
      return;
    }

    handleEntityMouseUp();
  };

  const draftPreview = useMemo(() => {
    if (!draft) return null;
    if (draft.type === 'line') {
      return {
        ...draft,
        current: resolveLinePreviewEnd({
          start: draft.start,
          current: draft.current,
          lengthInput: dynamicA,
          angleInput: dynamicB,
          lockLength: dynamicLocks.a,
          lockAngle: dynamicLocks.b,
          document: store,
        }),
      };
    }
    if (draft.type === 'rect') {
      const fallbackW = Math.abs(draft.current.x - draft.start.x);
      const fallbackH = Math.abs(draft.current.y - draft.start.y);
      const width = dynamicLocks.a ? resolveRectangleWidth(dynamicA, fallbackW, store) : fallbackW;
      const height = dynamicLocks.b ? resolveRectangleHeight(dynamicB, fallbackH, store) : fallbackH;
      const signX = draft.current.x >= draft.start.x ? 1 : -1;
      const signY = draft.current.y >= draft.start.y ? 1 : -1;
      return {
        ...draft,
        current: { x: draft.start.x + signX * width, y: draft.start.y + signY * height },
      };
    }
    if (draft.type === 'polyline' || draft.type === 'arc') {
      return draft;
    }
    return {
      ...draft,
      current: resolveCirclePreviewPoint({
        draft,
        radiusInput: dynamicA,
        lockRadius: dynamicLocks.a,
        document: store,
      }),
    };
  }, [draft, dynamicA, dynamicB, dynamicLocks, store]);

  const editDimension = (dimension: ViewDimension) => {
    const currentDisplayValue = dimension.kind === 'angle'
      ? dimension.value
      : modelUnitsToDisplay(dimension.value, store);
    const promptLabel =
      dimension.kind === 'angle'
        ? t('facilityMap.sketchEnterAngle')
        : dimension.kind === 'radius'
          ? t('facilityMap.sketchEnterRadius')
          : dimension.kind === 'horizontal'
            ? t('facilityMap.sketchEnterWidth')
            : dimension.kind === 'vertical'
              ? t('facilityMap.sketchEnterHeight')
              : dimension.kind === 'diameter'
                ? t('facilityMap.sketchDiameter')
                : t('facilityMap.sketchEnterLength');
    const raw = window.prompt(
      promptLabel,
      currentDisplayValue.toFixed(
        dimension.kind === 'angle'
          ? 1
          : unitPrecision(store.displayUnit),
      ),
    );
    if (raw == null) return;

    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    if (dimension.kind !== 'angle' && parsed <= 0) return;

    const nextValue = dimension.kind === 'angle'
      ? parsed
      : displayToModelUnits(parsed, store);
    const target = store.entities.find(
      (entity) => entity.id === dimension.entityId,
    );
    if (!target) return;

    const nextEntity = applyDrivingDimension(
      target,
      dimension,
      nextValue,
    );
    if (nextEntity === target) return;

    setStore((current) => ({
      ...current,
      entities: current.entities.map((entity) =>
        entity.id === target.id ? nextEntity : entity,
      ),
      dimensions: upsertDrivingDimension(
        current.dimensions,
        dimension,
        nextValue,
      ),
    }));
    setSelectedDimensionId(dimension.id);
  };

  const calculatedParameters = useMemo(
    () => recalculateParameters(store.parameters, store.mmPerUnit),
    [store.mmPerUnit, store.parameters],
  );

  const constraintSolve = useMemo(
    () => solveSketchConstraints(store.entities, store.constraints),
    [store.constraints, store.entities],
  );

  const viewDimensions = useMemo(() => {
    const persistedById = new Map(
      store.dimensions.map((dimension) => [dimension.id, dimension]),
    );

    return getSketchViewDimensions(store.entities).map((dimension) => {
      const persisted = persistedById.get(dimension.id);
      return {
        ...dimension,
        reference: persisted?.reference ?? false,
        driving: persisted?.driving ?? false,
        hidden: persisted?.hidden ?? false,
      };
    }).filter((dimension) => !dimension.hidden);
  }, [store.dimensions, store.entities]);

  const switchTool = (nextTool: SketchTool) => {
    sketchHistory.cancelTransaction();
    setTool(nextTool);
    setDraft(null);
    resetDynamic();
    setModifyPreview(null);
    setMessage('');
    blurActiveInput();
  };

  // One window-level keyboard handler for the whole sketch session. It is
  // re-pointed at the latest render's closure on every render, so it never
  // reads stale state (selection, draft, view dimensions) the way a
  // dependency-listed effect could when a dependency was missed.
  const keyHandlerRef = useRef<(event: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    keyHandlerRef.current = (event: KeyboardEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.matches('input, textarea, select, [contenteditable="true"]')) return;

      if (event.key === 'Escape') {
        // Inventor-style two-stage Esc: first ends the shape/chain being
        // drawn, the next one leaves the tool, then clears the selection.
        sketchHistory.cancelTransaction();
        setActiveGrip(null);
        gripRef.current = null;
        setSelectionBox(null);
        setModifyPreview(null);
        setMessage('');
        if (draft) {
          cancelDraft();
          return;
        }
        if (tool !== 'select') {
          switchTool('select');
          return;
        }
        setSelectedIds([]);
        setSelectedDimensionId('');
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) sketchHistory.redo();
        else sketchHistory.undo();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        sketchHistory.redo();
        return;
      }
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === 'd' &&
        selectedIds.length
      ) {
        event.preventDefault();
        const duplicated = duplicateSelectedEntities(
          store.entities,
          selectedIds,
          { x: 10, y: 10 },
          (entity) => createSketchId(`sketch-${entity.type}`),
        );
        setStore((current) => ({
          ...current,
          entities: [...current.entities, ...duplicated.entities],
        }));
        setSelectedIds(duplicated.ids);
        return;
      }
      if (event.key === 'Enter' && draft?.type === 'polyline') {
        event.preventDefault();
        finishActivePolyline();
        return;
      }
      if (
        draft &&
        (draft.type === 'line' || draft.type === 'rect' || draft.type === 'circle') &&
        isDynamicInputKey(event)
      ) {
        // Typing a number while drawing goes straight into the first value
        // field — no need to click into the box first.
        event.preventDefault();
        setDynamicLocks((value) => ({ ...value, a: true }));
        setDynamicA(event.key === ',' ? '.' : event.key);
        dynamicInputRef.current?.focus();
        return;
      }
      if ((event.key === ' ' || event.key === 'Enter') && !draft && tool === 'select' && lastToolRef.current) {
        event.preventDefault();
        switchTool(lastToolRef.current);
        return;
      }
      const shortcutTool = resolveToolShortcut(event);
      if (shortcutTool) {
        event.preventDefault();
        if (!event.repeat && shortcutTool !== tool) switchTool(shortcutTool);
        return;
      }
      if (
        (event.key === 'Delete' || event.key === 'Backspace') &&
        selectedDimensionId
      ) {
        event.preventDefault();
        const selected = viewDimensions.find(
          (dimension) => dimension.id === selectedDimensionId,
        );
        if (selected) {
          setStore((current) => ({
            ...current,
            dimensions: hideDimension(
              current.dimensions,
              selected,
            ),
          }));
        }
        setSelectedDimensionId('');
        return;
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedIds.length) {
        event.preventDefault();
        const selected = new Set(selectedIds);
        setStore((current) => ({
          ...current,
          entities: current.entities.filter((entity) => !selected.has(entity.id)),
        }));
        setSelectedIds([]);
      }
    };
  });

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => keyHandlerRef.current(event);
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[10]" data-facility-layer="sketch">
      <svg
        ref={svgRef}
        // Only `enabled` makes the SVG itself a hit target — otherwise an
        // empty-space click inside its bounds would be swallowed here and
        // never reach the floor plan's own canvas beneath it, breaking its
        // marquee-select. Individual entities re-enable their own hit
        // testing below regardless (`canInteract`), which is how a click
        // lands on a *sketch line* without the SVG background eating clicks
        // on the empty space around it.
        className={`absolute inset-0 h-full w-full ${enabled ? 'pointer-events-auto' : 'pointer-events-none'}`}
        viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
        preserveAspectRatio="none"
        onMouseDown={handleCanvasMouseDown}
        onContextMenu={(event) => {
          if (!enabled) return;
          // Right-click finishes the current shape (Inventor's "OK"), or
          // leaves the tool when nothing is being drawn.
          event.preventDefault();
          if (draft?.type === 'polyline') finishActivePolyline();
          else if (draft) cancelDraft();
          else if (tool !== 'select') switchTool('select');
        }}
        onDoubleClick={(event) => {
          if (tool !== 'polyline' || !draft || draft.type !== 'polyline') return;
          event.preventDefault();
          event.stopPropagation();
          finishActivePolyline();
        }}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={() => {
          setActiveSnap(null);
          setSelectionBox(null);
          handleEntityMouseUp();
        }}
      >
        {showGrid && gridStep > 0 && canvasWidth / gridStep <= 400 && canvasHeight / gridStep <= 400 && (
          <g className="pointer-events-none">
            {Array.from(
              { length: Math.floor(canvasWidth / gridStep) + 1 },
              (_, index) => index * gridStep,
            ).map((x) => (
              <line
                key={`grid-v-${x}`}
                x1={x}
                y1={0}
                x2={x}
                y2={canvasHeight}
                stroke="rgba(15,23,42,0.16)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {Array.from(
              { length: Math.floor(canvasHeight / gridStep) + 1 },
              (_, index) => index * gridStep,
            ).map((y) => (
              <line
                key={`grid-h-${y}`}
                x1={0}
                y1={y}
                x2={canvasWidth}
                y2={y}
                stroke="rgba(15,23,42,0.16)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </g>
        )}
        <g
          transform={
            translateOffset
              ? `translate(${translateOffset.dx} ${translateOffset.dy})`
              : undefined
          }
        >
        {store.entities.map((entity) => {
          const selected = selectedIds.includes(entity.id);
          const visualStrokeWidth = selected ? entity.lineWidth + 0.8 : entity.lineWidth;
          // Thin lines (0.15–1 model units, often sub-pixel on screen) are
          // nearly impossible to click precisely. Give every entity an
          // invisible, generously-wide "hit" twin sized to a constant
          // on-screen target (ENTITY_HIT_TARGET_PX) — the same idea as the
          // endpoint/midpoint snap threshold below — while the visible
          // stroke keeps rendering at its real width.
          const hitStrokeWidth = viewportWidthPx > 0
            ? Math.max(
                visualStrokeWidth,
                cssPixelsToSketchUnits(ENTITY_HIT_TARGET_PX, viewportWidthPx, canvasWidth),
              )
            : visualStrokeWidth;
          const cursor =
            canInteract && tool === 'select'
              ? 'move'
              : enabled &&
                  (tool === 'trim' ||
                    tool === 'extend' ||
                    tool === 'break' ||
                    tool === 'offset' ||
                    tool === 'dimension')
                ? 'crosshair'
                : 'default';
          // Trim/Extend/Break/Offset target a specific curve, the way
          // Inventor's own equivalents do — clicking has to land ON that
          // curve. A closed shape's full-interior hit area (below) is right
          // for `select`, where clicking anywhere inside picks up the whole
          // shape, but for these tools it meant an overlapping circle's
          // interior silently stole every click meant for a rectangle's
          // edge underneath it, no matter how close to that edge you
          // clicked — trim would then always act on the circle.
          const isModifyTool =
            tool === 'trim' ||
            tool === 'extend' ||
            tool === 'break' ||
            tool === 'offset' ||
            tool === 'dimension';
          const interaction = {
            stroke: 'transparent',
            strokeWidth: hitStrokeWidth,
            vectorEffect: 'non-scaling-stroke' as const,
            fill: 'none',
            style: { cursor },
            // 'all' (not 'stroke') keeps the original behavior of closed
            // shapes (rect/circle/polyline) being clickable anywhere in
            // their interior, not just near the edge — the wider
            // hitStrokeWidth above only adds a more forgiving edge band on
            // top of that, it doesn't take anything away. Modify tools
            // narrow this to 'stroke' so only the edge band responds,
            // letting a click pass through to whatever curve is actually
            // underneath it.
            pointerEvents: canInteract
              ? isModifyTool
                ? ('stroke' as const)
                : ('all' as const)
              : ('none' as const),
            onMouseDown: (event: React.MouseEvent<SVGElement>) => handleEntityMouseDown(event, entity),
            onMouseMove: (event: React.MouseEvent<SVGElement>) => {
              if (tool !== 'trim' && tool !== 'extend') return;
              const point = pointFromEvent(event);
              if (!point) return;
              setModifyPreview(
                resolveModifyPreview(entity, point, event.shiftKey),
              );
            },
            onMouseLeave: () => {
              if (tool === 'trim' || tool === 'extend') {
                setModifyPreview(null);
              }
            },
            onMouseUp: handleEntityMouseUp,
          };
          const visual = {
            stroke: entity.color,
            strokeWidth: visualStrokeWidth,
            vectorEffect: 'non-scaling-stroke' as const,
            fill: 'none',
            pointerEvents: 'none' as const,
          };

          if (entity.type === 'line') {
            return (
              <g key={entity.id}>
                <line x1={entity.x1} y1={entity.y1} x2={entity.x2} y2={entity.y2} {...interaction} />
                <line x1={entity.x1} y1={entity.y1} x2={entity.x2} y2={entity.y2} {...visual} />
              </g>
            );
          }

          if (entity.type === 'rect') {
            return (
              <g key={entity.id}>
                <rect x={entity.x} y={entity.y} width={entity.w} height={entity.h} {...interaction} />
                <rect x={entity.x} y={entity.y} width={entity.w} height={entity.h} {...visual} />
              </g>
            );
          }

          if (entity.type === 'circle') {
            return (
              <g key={entity.id}>
                <circle cx={entity.cx} cy={entity.cy} r={entity.r} {...interaction} />
                <circle cx={entity.cx} cy={entity.cy} r={entity.r} {...visual} />
              </g>
            );
          }

          if (entity.type === 'polyline') {
            const points = entity.points.map((point) => `${point.x},${point.y}`).join(' ');
            return (
              <g key={entity.id}>
                <polyline points={points} {...interaction} />
                <polyline points={points} {...visual} />
              </g>
            );
          }

          const start = arcPoint(entity, entity.startAngleDeg);
          const end = arcPoint(entity, entity.endAngleDeg);
          const rawDelta = entity.clockwise
            ? entity.startAngleDeg - entity.endAngleDeg
            : entity.endAngleDeg - entity.startAngleDeg;
          const normalizedDelta = ((rawDelta % 360) + 360) % 360;
          const largeArcFlag = normalizedDelta > 180 ? 1 : 0;
          const sweepFlag = entity.clockwise ? 0 : 1;
          const arcPath = `M ${start.x} ${start.y} A ${entity.r} ${entity.r} 0 ${largeArcFlag} ${sweepFlag} ${end.x} ${end.y}`;
          return (
            <g key={entity.id}>
              <path d={arcPath} {...interaction} />
              <path d={arcPath} {...visual} />
            </g>
          );
        })}

        <ConstraintGlyphRenderer
          constraints={constraintSolve.constraints}
          entities={store.entities}
        />

        <DimensionRenderer
          dimensions={showDimensions ? viewDimensions : []}
          document={store}
          enabled={enabled}
          selectedId={selectedDimensionId}
          onSelect={(dimensionId) => {
            setSelectedDimensionId(dimensionId);
            setSelectedIds([]);
          }}
          onEdit={editDimension}
        />
        </g>

        {draftPreview?.type === 'line' && (
          <line
            x1={draftPreview.start.x}
            y1={draftPreview.start.y}
            x2={draftPreview.current.x}
            y2={draftPreview.current.y}
            stroke={presets.line.color}
            strokeWidth={presets.line.lineWidth}
            strokeDasharray="6 4"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {draftPreview?.type === 'rect' && (
          <rect
            x={Math.min(draftPreview.start.x, draftPreview.current.x)}
            y={Math.min(draftPreview.start.y, draftPreview.current.y)}
            width={Math.abs(draftPreview.current.x - draftPreview.start.x)}
            height={Math.abs(draftPreview.current.y - draftPreview.start.y)}
            stroke={presets.rect.color}
            strokeWidth={presets.rect.lineWidth}
            strokeDasharray="6 4"
            fill="none"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {draftPreview?.type === 'polyline' && (
          <polyline
            points={[
              ...draftPreview.points,
              draftPreview.current,
            ].map((point) => `${point.x},${point.y}`).join(' ')}
            stroke={presets.polyline.color}
            strokeWidth={presets.polyline.lineWidth}
            strokeDasharray="6 4"
            fill="none"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {draftPreview?.type === 'arc' && !draftPreview.start && (
          <line
            x1={draftPreview.center.x}
            y1={draftPreview.center.y}
            x2={draftPreview.current.x}
            y2={draftPreview.current.y}
            stroke={presets.arc.color}
            strokeWidth={presets.arc.lineWidth}
            strokeDasharray="6 4"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {draftPreview?.type === 'arc' && draftPreview.start && (() => {
          const radius = distance(draftPreview.center, draftPreview.start);
          const startAngle = angleDeg(draftPreview.center, draftPreview.start);
          const endAngle = angleDeg(draftPreview.center, draftPreview.current);
          const startPoint = draftPreview.start;
          const endPoint = {
            x: draftPreview.center.x + Math.cos(degToRad(endAngle)) * radius,
            y: draftPreview.center.y + Math.sin(degToRad(endAngle)) * radius,
          };
          const delta = ((endAngle - startAngle) % 360 + 360) % 360;
          const largeArcFlag = delta > 180 ? 1 : 0;
          return (
            <path
              d={`M ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endPoint.x} ${endPoint.y}`}
              stroke={presets.arc.color}
              strokeWidth={presets.arc.lineWidth}
              strokeDasharray="6 4"
              fill="none"
              vectorEffect="non-scaling-stroke"
            />
          );
        })()}
        {draftPreview?.type === 'circle' && (
          <circle
            cx={draftPreview.start.x}
            cy={draftPreview.start.y}
            r={distance(draftPreview.start, draftPreview.current)}
            stroke={presets.circle.color}
            strokeWidth={presets.circle.lineWidth}
            strokeDasharray="6 4"
            fill="none"
            vectorEffect="non-scaling-stroke"
          />
        )}

        {enabled && tool === 'select' && store.entities.flatMap((entity) => {
          if (!selectedIds.includes(entity.id)) return [];
          return getBasicEntityGrips(entity).map((grip) => (
            <circle
              key={`${entity.id}:${grip.id}`}
              cx={grip.point.x}
              cy={grip.point.y}
              r={5}
              fill="#ffffff"
              stroke="#0ea5e9"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
              pointerEvents="all"
              style={{ cursor: 'crosshair' }}
              onMouseDown={(event) => handleGripMouseDown(event, entity, grip)}
            />
          ));
        })}

        {enabled && selectionBox && (() => {
          const x = Math.min(selectionBox.start.x, selectionBox.current.x);
          const y = Math.min(selectionBox.start.y, selectionBox.current.y);
          const width = Math.abs(selectionBox.current.x - selectionBox.start.x);
          const height = Math.abs(selectionBox.current.y - selectionBox.start.y);
          const crossing = selectionBox.current.x < selectionBox.start.x;
          return (
            <rect
              x={x}
              y={y}
              width={width}
              height={height}
              fill={crossing ? 'rgba(34,197,94,0.10)' : 'rgba(14,165,233,0.10)'}
              stroke={crossing ? '#22c55e' : '#0ea5e9'}
              strokeWidth={1}
              strokeDasharray={crossing ? '5 3' : undefined}
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          );
        })()}

        {enabled && modifyPreview && (
          <line
            x1={modifyPreview.from.x}
            y1={modifyPreview.from.y}
            x2={modifyPreview.to.x}
            y2={modifyPreview.to.y}
            stroke={modifyPreview.mode === 'trim' ? '#ef4444' : '#22c55e'}
            strokeWidth={3}
            strokeDasharray="6 4"
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />
        )}

        {enabled && activeSnap && (
          <SnapIndicator candidate={activeSnap} />
        )}

        {enabled && draft && draft.type !== 'polyline' && draft.type !== 'arc' && (
          <foreignObject x={Math.min(pointer.x + 12, canvasWidth - 230)} y={Math.min(pointer.y + 12, canvasHeight - 92)} width="220" height="88" style={{ pointerEvents: 'all' }}>
            <div
              // `xmlns` on the foreignObject's root element is required for
              // cross-browser rendering inside an SVG document, but React's
              // HTMLAttributes type doesn't include it for a <div>.
              {...({ xmlns: 'http://www.w3.org/1999/xhtml' } as React.HTMLAttributes<HTMLDivElement>)}
              role="presentation"
              className="rounded-lg border border-sky-400/40 bg-slate-950/95 p-2 text-[11px] text-white shadow-xl"
              onMouseDown={(event) => event.stopPropagation()}
            >
              {draft.type === 'line' && (
                <div className="grid grid-cols-2 gap-1.5">
                  <label>
                    <span className="mb-1 block text-slate-400">{t('facilityMap.sketchLength')} ({store.displayUnit})</span>
                    <input
                      ref={dynamicInputRef}
                      value={dynamicA}
                      onFocus={() => setDynamicLocks((value) => ({ ...value, a: true }))}
                      onChange={(event) => { setDynamicLocks((value) => ({ ...value, a: true })); setDynamicA(event.target.value); }}
                      onKeyDown={handleLineInputKeyDown}
                      className="w-full rounded border border-white/15 bg-white/10 px-1.5 py-1 text-white"
                    />
                  </label>
                  <label>
                    <span className="mb-1 block text-slate-400">{t('facilityMap.sketchAngle')}</span>
                    <input
                      value={dynamicB}
                      onFocus={() => setDynamicLocks((value) => ({ ...value, b: true }))}
                      onChange={(event) => { setDynamicLocks((value) => ({ ...value, b: true })); setDynamicB(event.target.value); }}
                      onKeyDown={handleLineInputKeyDown}
                      className="w-full rounded border border-white/15 bg-white/10 px-1.5 py-1 text-white"
                    />
                  </label>
                </div>
              )}
              {draft.type === 'rect' && (
                <div className="grid grid-cols-2 gap-1.5">
                  <label>
                    <span className="mb-1 block text-slate-400">{t('facilityMap.sketchWidth')} ({store.displayUnit})</span>
                    <input
                      ref={dynamicInputRef}
                      value={dynamicA}
                      onFocus={() => setDynamicLocks((value) => ({ ...value, a: true }))}
                      onChange={(event) => { setDynamicLocks((value) => ({ ...value, a: true })); setDynamicA(event.target.value); }}
                      onKeyDown={handleShapeInputKeyDown}
                      className="w-full rounded border border-white/15 bg-white/10 px-1.5 py-1 text-white"
                    />
                  </label>
                  <label>
                    <span className="mb-1 block text-slate-400">{t('facilityMap.sketchHeight')} ({store.displayUnit})</span>
                    <input
                      value={dynamicB}
                      onFocus={() => setDynamicLocks((value) => ({ ...value, b: true }))}
                      onChange={(event) => { setDynamicLocks((value) => ({ ...value, b: true })); setDynamicB(event.target.value); }}
                      onKeyDown={handleShapeInputKeyDown}
                      className="w-full rounded border border-white/15 bg-white/10 px-1.5 py-1 text-white"
                    />
                  </label>
                </div>
              )}
              {draft.type === 'circle' && (
                <label>
                  <span className="mb-1 block text-slate-400">{t('facilityMap.sketchRadius')} ({store.displayUnit})</span>
                  <input
                    ref={dynamicInputRef}
                    value={dynamicA}
                    onFocus={() => setDynamicLocks((value) => ({ ...value, a: true }))}
                    onChange={(event) => { setDynamicLocks((value) => ({ ...value, a: true })); setDynamicA(event.target.value); }}
                    onKeyDown={handleShapeInputKeyDown}
                    className="w-full rounded border border-white/15 bg-white/10 px-1.5 py-1 text-white"
                  />
                </label>
              )}
              <div className="mt-1 text-[9px] text-slate-500">{t('facilityMap.sketchDynamicHint')}</div>
            </div>
          </foreignObject>
        )}
      </svg>

      {enabled && (
        <>
          {(() => {
            // The toolbar/properties chrome below must stay pinned to the
            // *viewport frame*, not to this component's own root — that root
            // sits inside FacilityFloorPlan's pan/zoom-transformed layer, so
            // an inline `absolute` position here would pan and scale along
            // with the drawing instead of staying fixed and clickable. When
            // the parent supplies `toolbarPortalTarget` (an untransformed
            // element), portal the chrome there instead of rendering inline.
            const chrome = (
              <>
          <div className="pointer-events-auto absolute left-1/2 top-0 flex -translate-x-1/2 items-center gap-1 rounded-b-xl border border-t-0 border-sky-400/30 bg-slate-950/90 p-1.5 text-white shadow-2xl backdrop-blur">
            {([
              ['select', MousePointer2, 'facilityMap.toolSelect'],
              ['line', Minus, 'facilityMap.toolLine'],
              ['polyline', Waypoints, 'facilityMap.toolPolyline'],
              ['arc', Spline, 'facilityMap.toolArc'],
              ['rect', Square, 'facilityMap.toolRectangle'],
              ['circle', CircleIcon, 'facilityMap.toolCircle'],
              ['trim', Scissors, 'facilityMap.sketchTrim'],
              ['extend', ArrowUpRight, 'facilityMap.sketchExtend'],
              ['break', Split, 'facilityMap.sketchBreak'],
              ['offset', Rows3, 'facilityMap.sketchOffset'],
              ['dimension', Ruler, 'facilityMap.sketchDimensionTool'],
            ] as const).map(([id, Icon, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => switchTool(id)}
                className={`rounded-md p-2 ${tool === id ? 'bg-sky-500 text-white' : 'hover:bg-white/10'}`}
                title={shortcutForTool(id) ? `${t(label)} (${shortcutForTool(id)})` : `${t(label)} (Esc)`}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
            <span className="mx-1 h-5 w-px bg-white/15" />
            <button
              type="button"
              onClick={sketchHistory.undo}
              disabled={!sketchHistory.canUndo}
              className="rounded-md p-2 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
              title={t('facilityMap.undo')}
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={sketchHistory.redo}
              disabled={!sketchHistory.canRedo}
              className="rounded-md p-2 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
              title={t('facilityMap.redo')}
            >
              <Redo2 className="h-4 w-4" />
            </button>
            <span className="mx-1 h-5 w-px bg-white/15" />
            <button
              type="button"
              onClick={() => setShowDimensions((current) => !current)}
              className={`rounded-md p-2 ${showDimensions ? 'hover:bg-white/10' : 'bg-sky-500/20 text-sky-300'}`}
              title={showDimensions ? t('facilityMap.sketchHideDimensions') : t('facilityMap.sketchShowDimensions')}
            >
              {showDimensions ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
            <span className="mx-1 h-5 w-px bg-white/15" />
            <button
              type="button"
              onClick={() => onCancel()}
              className="inline-flex items-center gap-1 rounded-md border border-red-400/30 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/10"
            >
              <X className="h-4 w-4" />
              {t('sharedUi.cancel')}
            </button>
            <button
              type="button"
              onClick={() => onFinish(store)}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950"
            >
              <Check className="h-4 w-4" />
              {t('facilityMap.finishSketch')}
            </button>
          </div>

          <div className="pointer-events-auto absolute right-3 top-14 w-64 rounded-xl border border-white/10 bg-slate-950/92 p-3 text-white shadow-xl backdrop-blur">
            <div className="mb-2 text-xs font-semibold">{t('facilityMap.sketchProperties')}</div>
            <label className="mb-2 flex items-center justify-between gap-2 text-[11px]">
              <span>{t('facilityMap.sketchScale')}</span>
              <input
                type="number"
                min="0.001"
                step="0.1"
                value={store.mmPerUnit}
                onChange={(event) => setStore((current) => ({ ...current, mmPerUnit: normalizeMmPerUnit(Number(event.target.value), current.mmPerUnit) }))}
                className="w-24 rounded border border-white/10 bg-white/5 px-2 py-1 text-right"
              />
            </label>
            <label className="mb-2 flex items-center justify-between gap-2 text-[11px]">
              <span>{t('facilityMap.sketchDisplayUnit')}</span>
              <select
                value={store.displayUnit}
                onChange={(event) => setStore((current) => ({ ...current, displayUnit: event.target.value === 'm' ? 'm' : 'mm' }))}
                className="rounded border border-white/10 bg-slate-900 px-2 py-1"
              >
                <option value="mm">mm</option>
                <option value="m">m</option>
              </select>
            </label>

            <button
              type="button"
              onClick={() => {
                const currentWidthMm = store.mmPerUnit * canvasWidth;
                const raw = window.prompt(
                  t('facilityMap.sketchCalibratePrompt'),
                  currentWidthMm.toFixed(0),
                );
                if (raw == null) return;
                const knownWidthMm = Number(raw);
                const nextMmPerUnit = calibrateMmPerUnitFromFloorWidth(
                  knownWidthMm,
                  canvasWidth,
                  store.mmPerUnit,
                );
                setStore((current) => ({
                  ...current,
                  mmPerUnit: nextMmPerUnit,
                }));
              }}
              className="mb-2 w-full rounded-md border border-cyan-400/20 px-2 py-1.5 text-[10px] text-cyan-200 hover:bg-cyan-500/10"
            >
              {t('facilityMap.sketchCalibrate')}
            </button>

            {(tool === 'line' || tool === 'polyline' || tool === 'arc' || tool === 'rect' || tool === 'circle') && (
              <>
                <label className="mb-2 flex items-center justify-between gap-2 text-[11px]">
                  <span>{t('facilityMap.annotationColor')}</span>
                  <input
                    type="color"
                    value={currentStyle.color}
                    onChange={(event) => updatePreset({ color: event.target.value })}
                    className="h-7 w-10 rounded border border-white/10 bg-transparent"
                  />
                </label>
                <label className="flex items-center justify-between gap-2 text-[11px]">
                  <span>{t('facilityMap.lineWeight')}</span>
                  <select
                    value={currentStyle.lineWidth}
                    onChange={(event) => updatePreset({ lineWidth: Number(event.target.value) })}
                    className="rounded border border-white/10 bg-slate-900 px-2 py-1"
                  >
                    {[0.5, 1, 1.5, 2, 3, 4].map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </label>
              </>
            )}

            <div className="mt-3 rounded-md border border-cyan-400/20 bg-cyan-500/5 p-2">
              <div className="mb-2 flex items-center justify-between text-[10px] font-semibold text-cyan-200">
                <span>{t('facilityMap.sketchParameters')}</span>
                <button
                  type="button"
                  onClick={() => {
                    const name = window.prompt(t('facilityMap.sketchParameterNamePrompt'), `p${store.parameters.length + 1}`);
                    if (!name) return;
                    const expression = window.prompt(t('facilityMap.sketchParameterExpressionPrompt'), '100 mm');
                    if (!expression) return;
                    const next = [
                      ...store.parameters,
                      {
                        id: createSketchId('parameter'),
                        name,
                        expression,
                      },
                    ];
                    setStore((current) =>
                      recalculateParametricDocument({
                        ...current,
                        parameters: next,
                      }),
                    );
                  }}
                  className="rounded border border-cyan-400/30 px-2 py-1 text-[9px] text-cyan-200 hover:bg-cyan-500/10"
                >
                  {t('facilityMap.sketchAddParameter')}
                </button>
              </div>
              <div className="grid gap-1">
                {calculatedParameters.map((parameter) => (
                  <div
                    key={parameter.id}
                    className="rounded bg-white/5 px-2 py-1 text-[9px]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        className="truncate text-left text-cyan-100 hover:underline"
                        onClick={() => {
                          const nextName = window.prompt(t('facilityMap.sketchParameterNamePrompt'), parameter.name);
                          if (!nextName) return;
                          const nextExpression = window.prompt(t('facilityMap.sketchParameterExpressionPrompt'), parameter.expression);
                          if (nextExpression == null) return;
                          try {
                            const renamed = renameParameter(
                              store.parameters,
                              parameter.name,
                              nextName,
                            ).map((item) =>
                              item.name === nextName
                                ? { ...item, expression: nextExpression }
                                : item,
                            );
                            setStore((current) =>
                              recalculateParametricDocument({
                                ...current,
                                parameters: renamed,
                              }),
                            );
                          } catch (error) {
                            setMessage(error instanceof Error ? error.message : t('facilityMap.sketchInvalidParameter'));
                          }
                        }}
                      >
                        {parameter.name} = {parameter.expression}
                      </button>
                      <button
                        type="button"
                        className="text-red-300 hover:text-red-200"
                        onClick={() => {
                          const protection = canDeleteParameter(
                            store.parameters,
                            parameter.name,
                          );
                          const bound = store.dimensions.some(
                            (dimension) => dimension.parameterId === parameter.id,
                          );
                          if (bound) {
                            setMessage(t('facilityMap.sketchParameterBound'));
                            return;
                          }
                          if (!protection.ok) {
                            setMessage(t('facilityMap.sketchParameterUsedBy', { names: protection.dependents.join(', ') }));
                            return;
                          }
                          setStore((current) =>
                            recalculateParametricDocument({
                              ...current,
                              parameters: current.parameters.filter(
                                (item) => item.id !== parameter.id,
                              ),
                            }),
                          );
                        }}
                      >
                        ×
                      </button>
                    </div>
                    <div className={parameter.error ? 'text-red-300' : 'text-slate-400'}>
                      {parameter.error
                        ? parameter.error
                        : `${parameter.value ?? '—'} ${parameter.dimension ?? ''}`}
                    </div>
                  </div>
                ))}
                {!calculatedParameters.length && (
                  <div className="text-[9px] text-slate-500">{t('facilityMap.sketchNoParameters')}</div>
                )}
              </div>
            </div>

            {tool === 'select' && selectedIds.length === 1 && (() => {
              const selected = store.entities.find(
                (entity) => entity.id === selectedIds[0],
              );
              if (!selected || selected.type !== 'line') return null;
              const applySingleConstraint = (
                kind: 'horizontal' | 'vertical',
              ) => {
                const id = createSketchId(`constraint-${kind}`);
                const result = kind === 'horizontal'
                  ? applyHorizontalConstraint(store.entities, selected.id, id)
                  : applyVerticalConstraint(store.entities, selected.id, id);
                if (!result) return;
                setStore((current) => ({
                  ...current,
                  entities: result.entities,
                  constraints: [
                    ...current.constraints.filter(
                      (constraint) =>
                        !(
                          constraint.kind === kind &&
                          constraint.entityIds.length === 1 &&
                          constraint.entityIds[0] === selected.id
                        ),
                    ),
                    result.constraint,
                  ],
                }));
              };
              const addFix = () => {
                const result = applyFixConstraint(
                  store.entities,
                  selected.id,
                  createSketchId('constraint-fix'),
                );
                if (!result) return;
                setStore((current) => ({
                  ...current,
                  constraints: [
                    ...current.constraints.filter(
                      (constraint) =>
                        !(
                          constraint.kind === 'fix' &&
                          constraint.entityIds[0] === selected.id
                        ),
                    ),
                    result.constraint,
                  ],
                }));
              };
              return (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => applySingleConstraint('horizontal')}
                    className="rounded-md border border-violet-400/30 px-2 py-2 text-xs text-violet-300 hover:bg-violet-500/10"
                  >
                    {t('facilityMap.sketchConstraintHorizontal')}
                  </button>
                  <button
                    type="button"
                    onClick={() => applySingleConstraint('vertical')}
                    className="rounded-md border border-violet-400/30 px-2 py-2 text-xs text-violet-300 hover:bg-violet-500/10"
                  >
                    {t('facilityMap.sketchConstraintVertical')}
                  </button>
                  <button
                    type="button"
                    onClick={addFix}
                    className="col-span-2 rounded-md border border-violet-400/30 px-2 py-2 text-xs text-violet-300 hover:bg-violet-500/10"
                  >
                    {t('facilityMap.sketchConstraintFix')}
                  </button>
                </div>
              );
            })()}

            {tool === 'select' && selectedIds.length === 2 && (() => {
              const lines = selectedIds
                .map((id) => store.entities.find((entity) => entity.id === id))
                .filter(
                  (entity): entity is LineEntity =>
                    Boolean(entity && entity.type === 'line'),
                );
              if (lines.length !== 2) return null;
              const applyPair = (
                kind: 'coincident' | 'parallel' | 'perpendicular' | 'equal' | 'midpoint',
              ) => {
                const id = createSketchId(`constraint-${kind}`);
                const result =
                  kind === 'coincident'
                    ? applyCoincidentConstraint(store.entities, lines[0].id, lines[1].id, id)
                    : kind === 'parallel'
                      ? applyParallelConstraint(store.entities, lines[0].id, lines[1].id, id)
                      : kind === 'perpendicular'
                        ? applyPerpendicularConstraint(store.entities, lines[0].id, lines[1].id, id)
                        : kind === 'equal'
                          ? applyEqualConstraint(store.entities, lines[0].id, lines[1].id, id)
                          : applyMidpointConstraint(store.entities, lines[0].id, lines[1].id, id);
                if (!result) return;
                setStore((current) => ({
                  ...current,
                  entities: result.entities,
                  constraints: [...current.constraints, result.constraint],
                }));
              };
              return (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {([
                    ['coincident', 'facilityMap.sketchConstraintCoincident'],
                    ['parallel', 'facilityMap.sketchConstraintParallel'],
                    ['perpendicular', 'facilityMap.sketchConstraintPerpendicular'],
                    ['equal', 'facilityMap.sketchConstraintEqual'],
                    ['midpoint', 'facilityMap.sketchConstraintMidpoint'],
                  ] as const).map(([kind, labelKey]) => (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => applyPair(kind)}
                      className="rounded-md border border-violet-400/30 px-2 py-2 text-xs text-violet-300 hover:bg-violet-500/10"
                    >
                      {t(labelKey)}
                    </button>
                  ))}
                </div>
              );
            })()}

            {tool === 'select' && selectedIds.length === 2 && (() => {
              const pair = selectedIds
                .map((id) => store.entities.find((entity) => entity.id === id))
                .filter(Boolean) as SketchEntity[];
              const tangentLine = pair.find(
                (entity): entity is LineEntity => entity?.type === 'line',
              );
              const tangentRadial = pair.find(
                (entity) => entity?.type === 'circle' || entity?.type === 'arc',
              );
              if (pair.length === 2 && tangentLine && tangentRadial) {
                return (
                  <button
                    type="button"
                    onClick={() => {
                      const result = applyTangentConstraint(
                        store.entities,
                        tangentLine.id,
                        tangentRadial.id,
                        createSketchId('constraint-tangent'),
                      );
                      if (!result) return;
                      setStore((current) => ({
                        ...current,
                        entities: result.entities,
                        constraints: [...current.constraints, result.constraint],
                      }));
                    }}
                    className="mt-3 w-full rounded-md border border-violet-400/30 px-3 py-2 text-xs text-violet-300 hover:bg-violet-500/10"
                  >
                    {t('facilityMap.sketchConstraintTangent')}
                  </button>
                );
              }
              if (
                pair.length !== 2 ||
                !(
                  (pair[0].type === 'circle' || pair[0].type === 'arc') &&
                  (pair[1].type === 'circle' || pair[1].type === 'arc')
                )
              ) {
                return null;
              }
              const applyRadial = (kind: 'equal' | 'concentric') => {
                const result = kind === 'equal'
                  ? applyEqualConstraint(
                      store.entities,
                      pair[0].id,
                      pair[1].id,
                      createSketchId('constraint-equal'),
                    )
                  : applyConcentricConstraint(
                      store.entities,
                      pair[0].id,
                      pair[1].id,
                      createSketchId('constraint-concentric'),
                    );
                if (!result) return;
                setStore((current) => ({
                  ...current,
                  entities: result.entities,
                  constraints: [...current.constraints, result.constraint],
                }));
              };
              return (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => applyRadial('equal')}
                    className="rounded-md border border-violet-400/30 px-2 py-2 text-xs text-violet-300 hover:bg-violet-500/10"
                  >
                    {t('facilityMap.sketchConstraintEqual')}
                  </button>
                  <button
                    type="button"
                    onClick={() => applyRadial('concentric')}
                    className="rounded-md border border-violet-400/30 px-2 py-2 text-xs text-violet-300 hover:bg-violet-500/10"
                  >
                    {t('facilityMap.sketchConstraintConcentric')}
                  </button>
                </div>
              );
            })()}

            {tool === 'select' && selectedIds.length === 3 && (() => {
              const axis = store.entities.find(
                (entity): entity is LineEntity =>
                  entity.id === selectedIds[0] && entity.type === 'line',
              );
              if (!axis) return null;
              return (
                <button
                  type="button"
                  onClick={() => {
                    const result = applySymmetryConstraint(
                      store.entities,
                      axis.id,
                      selectedIds[1],
                      selectedIds[2],
                      createSketchId('constraint-symmetry'),
                    );
                    if (!result) return;
                    setStore((current) => ({
                      ...current,
                      entities: result.entities,
                      constraints: [...current.constraints, result.constraint],
                    }));
                    setMessage(t('facilityMap.sketchSymmetryApplied'));
                  }}
                  className="mt-3 w-full rounded-md border border-violet-400/30 px-3 py-2 text-xs text-violet-300 hover:bg-violet-500/10"
                >
                  {t('facilityMap.sketchConstraintSymmetry')}
                </button>
              );
            })()}

            {tool === 'select' && selectedIds.length >= 2 && (() => {
              const axis = store.entities.find(
                (entity): entity is LineEntity =>
                  entity.id === selectedIds[0] && entity.type === 'line',
              );
              if (!axis) return null;
              return (
                <button
                  type="button"
                  onClick={() => {
                    const mirrored = mirrorSelectedEntities(
                      store.entities,
                      axis.id,
                      selectedIds.slice(1),
                      (entity) => createSketchId(`sketch-${entity.type}`),
                    );
                    if (!mirrored || !mirrored.copies.length) return;
                    setStore((current) => ({
                      ...current,
                      entities: [...current.entities, ...mirrored.copies],
                    }));
                    setSelectedIds(mirrored.ids);
                    setMessage(t('facilityMap.sketchMirrorApplied'));
                  }}
                  className="mt-3 w-full rounded-md border border-cyan-400/30 px-3 py-2 text-xs text-cyan-300 hover:bg-cyan-500/10"
                >
                  {t('facilityMap.sketchMirror')}
                </button>
              );
            })()}

            {selectedDimensionId && (() => {
              const persisted = store.dimensions.find(
                (dimension) => dimension.id === selectedDimensionId,
              );
              const isReference = persisted?.reference === true;
              return (
                <div className="mt-3 grid gap-2">
                  {(() => {
                    const selected = viewDimensions.find(
                      (dimension) => dimension.id === selectedDimensionId,
                    );
                    if (!selected) return null;
                    const expected = dimensionParameterDimension(selected.kind);
                    const compatible = calculatedParameters.filter(
                      (parameter) =>
                        !parameter.error &&
                        parameter.dimension === expected,
                    );
                    const binding = persisted?.parameterId ?? '';
                    return (
                      <select
                        value={binding}
                        onChange={(event) => {
                          const parameterId = event.target.value || null;
                          setStore((current) =>
                            bindDimensionToParameter(
                              current,
                              selected,
                              parameterId,
                            ),
                          );
                        }}
                        className="w-full rounded border border-cyan-400/20 bg-slate-900 px-2 py-1.5 text-xs text-cyan-100"
                      >
                        <option value="">{t('facilityMap.sketchNoParameterBinding')}</option>
                        {compatible.map((parameter) => (
                          <option key={parameter.id} value={parameter.id}>
                            {parameter.name}
                          </option>
                        ))}
                      </select>
                    );
                  })()}
                  <button
                    type="button"
                    onClick={() => {
                      const selected = viewDimensions.find(
                        (dimension) => dimension.id === selectedDimensionId,
                      );
                      if (!selected) return;
                      setStore((current) => ({
                        ...current,
                        dimensions: setDimensionReference(
                          current.dimensions,
                          selected,
                          !isReference,
                        ),
                      }));
                    }}
                    className="inline-flex w-full items-center justify-center rounded-md border border-amber-400/30 px-3 py-2 text-xs text-amber-300 hover:bg-amber-500/10"
                  >
                    {isReference ? t('facilityMap.sketchSetDriving') : t('facilityMap.sketchSetReference')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const selected = viewDimensions.find(
                        (dimension) => dimension.id === selectedDimensionId,
                      );
                      if (!selected) return;
                      setStore((current) => ({
                        ...current,
                        dimensions: hideDimension(
                          current.dimensions,
                          selected,
                        ),
                      }));
                      setSelectedDimensionId('');
                    }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-red-400/30 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t('facilityMap.sketchDeleteDimension')}
                  </button>
                </div>
              );
            })()}

            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const duplicated = duplicateSelectedEntities(
                    store.entities,
                    selectedIds,
                    { x: 10, y: 10 },
                    (entity) => createSketchId(`sketch-${entity.type}`),
                  );
                  setStore((current) => ({
                    ...current,
                    entities: [...current.entities, ...duplicated.entities],
                  }));
                  setSelectedIds(duplicated.ids);
                }}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-sky-400/30 px-3 py-2 text-xs text-sky-300 hover:bg-sky-500/10"
                title="Ctrl/Cmd+D"
              >
                <Copy className="h-3.5 w-3.5" />
                {t('facilityMap.sketchCopySelected')}
              </button>
            )}

            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const selected = new Set(selectedIds);
                  setStore((current) => ({
                    ...current,
                    entities: current.entities.filter((entity) => !selected.has(entity.id)),
                  }));
                  setSelectedIds([]);
                }}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-red-400/30 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t('facilityMap.deleteSelected')}
              </button>
            )}

            <div className="mt-3 rounded-md border border-violet-400/20 bg-violet-500/5 p-2 text-[10px] text-violet-200">
              {t('facilityMap.sketchConstraintsStatus', {
                status: CONSTRAINT_STATUS_LABEL_KEYS[constraintSolve.status]
                  ? t(CONSTRAINT_STATUS_LABEL_KEYS[constraintSolve.status])
                  : constraintSolve.status,
              })}
              {constraintSolve.status !== 'conflict' && (
                <> · {constraintSolve.converged ? t('facilityMap.sketchConverged') : t('facilityMap.sketchIterationLimit')}</>
              )}
            </div>

            <div className="mt-3 rounded-md bg-white/5 p-2 text-[10px] text-slate-400">
              {tool === 'trim' || tool === 'extend'
                ? t('facilityMap.sketchTrimExtendHint')
                : tool === 'break'
                  ? t('facilityMap.sketchBreakHint')
                  : tool === 'offset'
                    ? t('facilityMap.sketchOffsetHint')
                    : tool === 'dimension'
                      ? t('facilityMap.sketchDimensionToolHint')
                      : tool === 'line'
                        ? t('facilityMap.sketchLineChainHint')
                        : t('facilityMap.sketchDimensionHint')}
              <div className="mt-1 text-slate-500">{t('facilityMap.sketchShortcutsHint')}</div>
            </div>
            {message && <div className="mt-2 text-[10px] text-amber-300">{message}</div>}
          </div>
              </>
            );
            return toolbarPortalTarget
              ? createPortal(chrome, toolbarPortalTarget)
              : chrome;
          })()}
        </>
      )}
    </div>
  );
}
