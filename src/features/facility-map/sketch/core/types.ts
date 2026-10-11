export type SketchId = string;

export type SketchUnit = 'mm' | 'm';

export type SketchPoint = {
  x: number;
  y: number;
};

export type SketchStyle = {
  color: string;
  lineWidth: number;
  construction?: boolean;
  visible?: boolean;
  locked?: boolean;
};

export type LineEntity = SketchStyle & {
  id: SketchId;
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type PolylineEntity = SketchStyle & {
  id: SketchId;
  type: 'polyline';
  points: SketchPoint[];
  closed?: boolean;
};

export type RectEntity = SketchStyle & {
  id: SketchId;
  type: 'rect';
  x: number;
  y: number;
  w: number;
  h: number;
};

export type CircleEntity = SketchStyle & {
  id: SketchId;
  type: 'circle';
  cx: number;
  cy: number;
  r: number;
};

export type ArcEntity = SketchStyle & {
  id: SketchId;
  type: 'arc';
  cx: number;
  cy: number;
  r: number;
  startAngleDeg: number;
  endAngleDeg: number;
  clockwise?: boolean;
};

export type SketchEntity =
  | LineEntity
  | PolylineEntity
  | RectEntity
  | CircleEntity
  | ArcEntity;

export type SketchDimensionKind =
  | 'length'
  | 'horizontal'
  | 'vertical'
  | 'radius'
  | 'diameter'
  | 'angle';

export type SketchDimension = {
  id: SketchId;
  kind: SketchDimensionKind;
  entityId: SketchId;
  driving?: boolean;
  reference?: boolean;
  value?: number;
  labelOffset?: SketchPoint;
  hidden?: boolean;
  parameterId?: SketchId;
};

export type SketchConstraintKind =
  | 'coincident'
  | 'horizontal'
  | 'vertical'
  | 'parallel'
  | 'perpendicular'
  | 'equal'
  | 'fix'
  | 'midpoint'
  | 'concentric'
  | 'tangent'
  | 'symmetry';

export type SketchConstraintPointRef = {
  entityId: SketchId;
  point: 'start' | 'end' | 'center' | 'midpoint' | `vertex:${number}`;
};

export type SketchConstraint = {
  id: SketchId;
  kind: SketchConstraintKind;
  entityIds: SketchId[];
  pointRefs?: SketchConstraintPointRef[];
  enabled?: boolean;
  conflict?: boolean;
  overConstrained?: boolean;
  /**
   * For `kind: 'fix'` only — the entity's exact geometry at the moment Fix
   * was applied. The solver restores to THIS snapshot, not to whatever the
   * entity looks like when solve happens to run, so a direct user
   * drag/edit on a fixed entity can't stick either (only removing the Fix
   * constraint can move it). Absent on constraints created before this
   * field existed — the solver falls back to its pre-solve behavior then.
   */
  fixedGeometry?: SketchEntity;
};

export type SketchParameterDimension = 'scalar' | 'length';

export type SketchParameter = {
  id: SketchId;
  name: string;
  expression: string;
  value?: number;
  dimension?: SketchParameterDimension;
  error?: string;
};

export type SketchDocument = {
  schemaVersion: 1;
  id: SketchId;
  name?: string;
  displayUnit: SketchUnit;
  /**
   * Physical millimeters represented by one model-space coordinate.
   * Example: 10 means 1 drawing coordinate = 10 mm.
   */
  mmPerUnit: number;
  entities: SketchEntity[];
  dimensions: SketchDimension[];
  constraints: SketchConstraint[];
  parameters: SketchParameter[];
  createdAt: number;
  updatedAt: number;
};

export type SketchCreateTool = 'line' | 'polyline' | 'rect' | 'circle' | 'arc';
export type SketchModifyTool = 'trim' | 'extend' | 'break' | 'offset' | 'dimension';
export type SketchTool = 'select' | SketchCreateTool | SketchModifyTool;
export type SketchInteraction = 'idle' | 'creating' | 'dragging' | 'modifying';

export type SketchCommandState = {
  tool: SketchTool;
  interaction: SketchInteraction;
};
