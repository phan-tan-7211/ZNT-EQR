import type { SketchDimensionKind, SketchTool } from '../core/types';

/** Single-key tool shortcuts, following Autodesk Inventor's sketch defaults where one exists. */
export const SKETCH_TOOL_SHORTCUTS: Readonly<Record<string, SketchTool>> = {
  l: 'line',
  p: 'polyline',
  a: 'arc',
  r: 'rect',
  c: 'circle',
  d: 'dimension',
  x: 'trim',
  e: 'extend',
  b: 'break',
  o: 'offset',
};

export const shortcutForTool = (tool: SketchTool): string | null => {
  const entry = Object.entries(SKETCH_TOOL_SHORTCUTS).find(([, value]) => value === tool);
  return entry ? entry[0].toUpperCase() : null;
};

type KeyLike = { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean };

export const resolveToolShortcut = (event: KeyLike): SketchTool | null => {
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  return SKETCH_TOOL_SHORTCUTS[event.key.toLowerCase()] ?? null;
};

/** Keys that start typing a value into the heads-up length/angle box. */
export const isDynamicInputKey = (event: KeyLike): boolean =>
  !event.ctrlKey && !event.metaKey && !event.altKey && /^[0-9.,-]$/.test(event.key);

const DIMENSION_PRIORITY: SketchDimensionKind[] = ['length', 'radius', 'diameter', 'horizontal', 'vertical', 'angle'];

/** The dimension the Dimension tool edits when an entity is clicked — its main size, not its angle. */
export const pickPrimaryDimension = <T extends { entityId: string; kind: SketchDimensionKind }>(
  dimensions: T[],
  entityId: string,
): T | null => {
  const own = dimensions.filter((dimension) => dimension.entityId === entityId);
  for (const kind of DIMENSION_PRIORITY) {
    const match = own.find((dimension) => dimension.kind === kind);
    if (match) return match;
  }
  return null;
};
