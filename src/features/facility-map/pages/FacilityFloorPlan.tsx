import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Building2,
  Circle,
  Eye,
  EyeOff,
  Focus,
  ImagePlus,
  LayoutGrid,
  Layers3,
  ListFilter,
  MapPin,
  Minus,
  Plus,
  Copy,
  MousePointer2,
  Maximize2,
  Minimize2,
  Move,
  Pencil,
  Redo2,
  RotateCcw,
  Save,
  Printer,
  Siren,
  History,
  GitCompare,
  X,
  Search,
  Square,
  Trash2,
  Type,
  Lock,
  Unlock,
  Undo2,
  Ruler,
  CircleHelp,
  Eraser,
  Wrench,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useI18n } from '@/i18n';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useFormatTimestamp } from '@/hooks/useFormatTimestamp';
import { toast } from '@/hooks/use-toast';
import InventorSketchOverlay from '@/features/facility-map/components/InventorSketchOverlay';
import SketchGuideDialog from '@/features/facility-map/components/SketchGuideDialog';
import {
  isQuotaExceeded,
  reportSaveFailure,
  setSaveFailureNotifier,
} from '@/features/facility-map/sketch/persistence/saveFailure';
import {
  cloneSketchDocument,
  createSketchDocument,
  createSketchId,
  loadSketchDocument,
  saveSketchDocument,
  type SketchDocument,
} from '@/features/facility-map/sketch';
import { SketchPrintLayer } from '@/features/facility-map/sketch/rendering/SketchPrintLayer';
import { deleteSelectedSketchLayers } from '@/features/facility-map/pages/sketchLayerOperations';
import {
  getSketchEntitiesBounds,
  translateSketchEntity,
} from '@/features/facility-map/sketch/core/geometry';

type EquipmentRow = {
  id: string;
  name: string | null;
  status: string | null;
};

const DEMO_EQUIPMENT: EquipmentRow[] = [
  { id: 'CEV-CNC-001', name: 'CNC Machine 01', status: 'Active' },
  { id: 'CEV-CNC-002', name: 'CNC Machine 02', status: 'Active' },
  { id: 'CEV-PRS-003', name: 'Press Machine 03', status: 'Maintenance' },
  { id: 'CEV-CMP-002', name: 'Air Compressor 02', status: 'Active' },
  { id: 'CEV-INJ-004', name: 'Injection Machine 04', status: 'Inactive' },
  { id: 'CEV-OLD-009', name: 'Legacy Tester 09', status: 'Retired' },
];

const DEMO_BUILDINGS = ['Main Building', 'Warehouse Building'];
const DEMO_FLOORS = ['Floor 1', 'Floor 2', 'Roof'];

type EquipmentPin = {
  equipmentId: string;
  x: number;
  y: number;
};

type LayerId = 'fire' | 'tornado' | 'flood' | 'emergency' | 'utility';
type ZoneType =
  | 'production'
  | 'storage'
  | 'utility'
  | 'restricted'
  | 'hazard'
  | 'emergency'
  | 'office'
  | 'custom';

type OverlayPin = {
  id: string;
  layer: LayerId;
  x: number;
  y: number;
  label?: string;
};

type Zone = {
  id: string;
  type: ZoneType;
  x: number;
  y: number;
  w: number;
  h: number;
  customLabel?: string;
  customColor?: string;
};

type DrawTool = 'select' | 'pan' | 'line' | 'arrow' | 'rect' | 'circle' | 'text' | 'ruler' | 'erase';
type Annotation = {
  id: string;
  type: Exclude<DrawTool, 'select' | 'pan' | 'erase'>;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  text?: string;
  color?: string;
  lineWidth?: number;
  textSize?: number;
  arrowSize?: number;
};

type ZoneResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
type SelectionBox = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  crossing: boolean;
};
type AnnotationGrip = {
  id: string;
  handle: 'start' | 'end' | 'nw' | 'ne' | 'se' | 'sw';
} | null;

type AnnotationTool = Annotation['type'];
type DrawingPreset = {
  color: string;
  lineWidth: number;
  textSize: number;
  arrowSize: number;
  text: string;
};

// A named, independently visible/editable sketch — think Inventor's
// Sketch1/Sketch2/Sketch3 under one part. `sketchDocument` below remains
// the original single "default" sketch (unchanged, for backward
// compatibility with existing saved plans); `sketches` holds every
// additional one the user creates via "+ New Sketch".
type SketchLayer = {
  id: string;
  name: string;
  visible: boolean;
  /**
   * Layer-lock, the CorelDRAW/Illustrator sense: a locked sketch is excluded
   * from window/crossing marquee-select and can't be click-selected or
   * dragged as a group on the main canvas. Editing it (Enter/Edit Sketch)
   * still requires unlocking first, same as those tools.
   */
  locked?: boolean;
  document: SketchDocument;
};

export type FloorPlanState = {
  name: string;
  building: string;
  floor: string;
  imageDataUrl: string;
  canvasWidth: number;
  canvasHeight: number;
  pins: EquipmentPin[];
  overlayPins: OverlayPin[];
  zones: Zone[];
  annotations: Annotation[];
  sketchDocument?: SketchDocument;
  /**
   * Lock state for the default sketch — mirrors SketchLayer.locked for
   * additional sketches. Optional so plans saved before this field existed
   * (undefined -> unlocked) keep loading unchanged.
   */
  sketchLocked?: boolean;
  sketches: SketchLayer[];
};

const STORAGE_KEY = 'znteqr:facility-floor-plan:dryrun:v3';
const PLAN_CACHE_KEY = 'znteqr:facility-floor-plan:dryrun:plans:v1';
const HISTORY_KEY = 'znteqr:facility-floor-plan:dryrun:history:v1';
const DRAWING_PRESET_KEY = 'znteqr:facility-floor-plan:drawing-presets:v1';

// eslint-disable-next-line react-refresh/only-export-components -- pure plan helper shared with FacilityFloorPlan.sketchLock.test.ts
export const planKey = (building: string, floor: string) => `${building}::${floor}`;

// The original, single always-present sketch (backward compatible with
// plans saved before multi-sketch support existed). Additional sketches
// the user creates live in `plan.sketches` and are addressed by their own id.
export const DEFAULT_SKETCH_ID = 'default';

type PlanHistoryEntry = {
  id: string;
  key: string;
  timestamp: number;
  snapshot: FloorPlanState;
};

const readPlanCache = (): Record<string, FloorPlanState> => {
  try {
    const raw = localStorage.getItem(PLAN_CACHE_KEY);
    return raw ? JSON.parse(raw) as Record<string, FloorPlanState> : {};
  } catch {
    return {};
  }
};

const readHistory = (): PlanHistoryEntry[] => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) as PlanHistoryEntry[] : [];
  } catch {
    return [];
  }
};

const SKETCH_GUIDE_SEEN_KEY = 'znteqr.facilityMap.sketchGuideSeen';

/**
 * A plan (or a plan-image-bearing history entry) can be a multi-hundred-KB
 * data URL, and localStorage's ~5-10MB-per-origin quota doesn't grow with
 * how many of those a user happens to accumulate. Letting `setItem` throw
 * uncaught here doesn't just fail to save — it crashes the whole component
 * mid-render (this write happens inside a state updater), taking the user
 * to the generic error boundary. Every write through here degrades to a
 * no-op on quota failure instead.
 */
const safeSetLocalStorage = (
  key: string,
  value: string,
  { notifyOnFailure = true }: { notifyOnFailure?: boolean } = {},
): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    if (!isQuotaExceeded(error)) throw error;
    if (notifyOnFailure) reportSaveFailure();
    return false;
  }
};

/**
 * History entries are ordered newest-first and each can carry a full plan
 * image — if the full list doesn't fit the remaining quota, keep halving it
 * (dropping the oldest half each time) rather than losing today's save
 * entirely just because old history doesn't fit anymore.
 */
const persistHistory = (entries: PlanHistoryEntry[]): void => {
  let candidates = entries;
  while (candidates.length > 0) {
    // Shrinking history is expected degradation, not a failed save.
    if (safeSetLocalStorage(HISTORY_KEY, JSON.stringify(candidates), { notifyOnFailure: false })) return;
    // `floor`, not `ceil` — at length 1, `ceil(1/2)` is still 1, which
    // would never shrink further and loop forever instead of terminating.
    candidates = candidates.slice(0, Math.floor(candidates.length / 2));
  }
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    // Best effort — leaving a stale value behind is harmless; readHistory
    // already tolerates unparseable/missing data.
  }
};

const DEFAULT_DRAWING_PRESETS: Record<AnnotationTool, DrawingPreset> = {
  line: { color: '#f43f5e', lineWidth: 0.28, textSize: 2.5, arrowSize: 6, text: 'NOTE' },
  arrow: { color: '#f43f5e', lineWidth: 0.28, textSize: 2.5, arrowSize: 6, text: 'NOTE' },
  rect: { color: '#f43f5e', lineWidth: 0.28, textSize: 2.5, arrowSize: 6, text: 'NOTE' },
  circle: { color: '#f43f5e', lineWidth: 0.28, textSize: 2.5, arrowSize: 6, text: 'NOTE' },
  text: { color: '#f43f5e', lineWidth: 0.28, textSize: 2.5, arrowSize: 6, text: 'NOTE' },
  ruler: { color: '#22d3ee', lineWidth: 0.28, textSize: 2.2, arrowSize: 6, text: 'NOTE' },
};

const readDrawingPresets = (): Record<AnnotationTool, DrawingPreset> => {
  try {
    const raw = localStorage.getItem(DRAWING_PRESET_KEY);
    if (!raw) return DEFAULT_DRAWING_PRESETS;
    const parsed = JSON.parse(raw) as Partial<Record<AnnotationTool, Partial<DrawingPreset>>>;
    return (Object.keys(DEFAULT_DRAWING_PRESETS) as AnnotationTool[]).reduce((acc, tool) => {
      acc[tool] = { ...DEFAULT_DRAWING_PRESETS[tool], ...(parsed[tool] ?? {}) };
      return acc;
    }, {} as Record<AnnotationTool, DrawingPreset>);
  } catch {
    return DEFAULT_DRAWING_PRESETS;
  }
};

const LAYERS: Array<{ id: 'assets' | LayerId; labelKey: string; color: string; emoji: string }> = [
  { id: 'assets', labelKey: 'facilityMap.assets', color: '#10b981', emoji: '🔧' },
  { id: 'fire', labelKey: 'facilityMap.fire', color: '#ef4444', emoji: '🔥' },
  { id: 'tornado', labelKey: 'facilityMap.tornado', color: '#f59e0b', emoji: '🌪️' },
  { id: 'flood', labelKey: 'facilityMap.flood', color: '#3b82f6', emoji: '💧' },
  { id: 'emergency', labelKey: 'facilityMap.exits', color: '#22d3ee', emoji: '🚪' },
  { id: 'utility', labelKey: 'facilityMap.utility', color: '#a78bfa', emoji: '⚡' },
];

const ZONES: Array<{ id: ZoneType; labelKey: string; color: string; emoji: string }> = [
  { id: 'production', labelKey: 'facilityMap.production', color: '#3b82f6', emoji: '🏭' },
  { id: 'storage', labelKey: 'facilityMap.storage', color: '#8b5cf6', emoji: '📦' },
  { id: 'utility', labelKey: 'facilityMap.utility', color: '#06b6d4', emoji: '⚡' },
  { id: 'restricted', labelKey: 'facilityMap.restricted', color: '#ef4444', emoji: '⛔' },
  { id: 'hazard', labelKey: 'facilityMap.hazard', color: '#f97316', emoji: '☢️' },
  { id: 'emergency', labelKey: 'facilityMap.emergency', color: '#22c55e', emoji: '🚨' },
  { id: 'office', labelKey: 'facilityMap.office', color: '#64748b', emoji: '🏢' },
  { id: 'custom', labelKey: 'facilityMap.custom', color: '#a855f7', emoji: '📎' },
];

const statusColor = (status?: string | null) => {
  switch ((status ?? '').toLowerCase()) {
    case 'active':
      return '#22c55e';
    case 'maintenance':
    case 'maintenance needed':
      return '#eab308';
    case 'inactive':
      return '#94a3b8';
    case 'retired':
      return '#ef4444';
    default:
      return '#38bdf8';
  }
};

const annotationToolTranslationKey = (type: Annotation['type']) => {
  switch (type) {
    case 'line':
      return 'facilityMap.toolLine';
    case 'arrow':
      return 'facilityMap.toolArrow';
    case 'rect':
      return 'facilityMap.toolRectangle';
    case 'circle':
      return 'facilityMap.toolCircle';
    case 'text':
      return 'facilityMap.toolText';
    case 'ruler':
      return 'facilityMap.toolRuler';
    default:
      return 'facilityMap.annotation';
  }
};

const buildingTranslationKey = (building: string) =>
  building === 'Warehouse Building' ? 'facilityMap.warehouseBuilding' : 'facilityMap.mainBuilding';

const floorTranslationKey = (floor: string) => {
  if (floor === 'Floor 2') return 'facilityMap.floor2';
  if (floor === 'Roof') return 'facilityMap.roof';
  return 'facilityMap.floor1';
};

const statusTranslationKey = (status?: string | null) => {
  switch ((status ?? '').toLowerCase()) {
    case 'active':
      return 'facilityMap.statusActive';
    case 'maintenance':
    case 'maintenance needed':
      return 'facilityMap.statusMaintenance';
    case 'inactive':
      return 'facilityMap.statusInactive';
    case 'retired':
      return 'facilityMap.statusRetired';
    default:
      return 'facilityMap.statusUnknown';
  }
};

// eslint-disable-next-line react-refresh/only-export-components -- pure plan helper shared with FacilityFloorPlan.sketchLock.test.ts
export const EMPTY_PLAN: FloorPlanState = {
  name: 'Plant 1 - Main Facility',
  building: 'Main Building',
  floor: 'Floor 1',
  imageDataUrl: '',
  canvasWidth: 1200,
  canvasHeight: 760,
  pins: [
    { equipmentId: 'CEV-CNC-001', x: 24, y: 29 },
    { equipmentId: 'CEV-CNC-002', x: 39, y: 31 },
    { equipmentId: 'CEV-PRS-003', x: 67, y: 32 },
    { equipmentId: 'CEV-CMP-002', x: 20, y: 71 },
    { equipmentId: 'CEV-INJ-004', x: 76, y: 70 },
  ],
  overlayPins: [
    { id: 'fire-demo-1', layer: 'fire', x: 51, y: 22 },
    { id: 'exit-demo-1', layer: 'emergency', x: 88, y: 52 },
    { id: 'utility-demo-1', layer: 'utility', x: 36, y: 78 },
  ],
  zones: [
    { id: 'zone-prod', type: 'production', x: 11, y: 14, w: 36, h: 29 },
    { id: 'zone-storage', type: 'storage', x: 57, y: 14, w: 31, h: 29 },
    { id: 'zone-utility', type: 'utility', x: 11, y: 58, w: 28, h: 25 },
    { id: 'zone-hazard', type: 'hazard', x: 56, y: 57, w: 33, h: 26 },
  ],
  annotations: [
    { id: 'route-demo', type: 'arrow', x1: 18, y1: 50, x2: 46, y2: 50 },
    { id: 'note-demo', type: 'text', x1: 71, y1: 50, x2: 71, y2: 50, text: 'QA HOLD' },
  ],
  sketches: [],
};

const demoLayoutFor = (building: string, floor: string): FloorPlanState => {
  const base = clonePlan(EMPTY_PLAN);
  base.building = building;
  base.floor = floor;
  base.imageDataUrl = '';

  if (building === 'Warehouse Building') {
    base.pins = [
      { equipmentId: 'CEV-CMP-002', x: 23, y: 28 },
      { equipmentId: 'CEV-INJ-004', x: 70, y: 31 },
      { equipmentId: 'CEV-OLD-009', x: 64, y: 70 },
    ];
    base.overlayPins = [
      { id: 'wh-exit', layer: 'emergency', x: 90, y: 48 },
      { id: 'wh-fire', layer: 'fire', x: 48, y: 18 },
    ];
    base.zones = [
      { id: 'wh-storage', type: 'storage', x: 10, y: 12, w: 42, h: 33 },
      { id: 'wh-qa', type: 'restricted', x: 57, y: 56, w: 31, h: 24 },
    ];
    base.annotations = [
      { id: 'wh-flow', type: 'arrow', x1: 18, y1: 52, x2: 82, y2: 52 },
      { id: 'wh-note', type: 'text', x1: 60, y1: 50, x2: 60, y2: 50, text: 'QA' },
    ];
    return base;
  }

  if (floor === 'Floor 2') {
    base.pins = [
      { equipmentId: 'CEV-CNC-001', x: 28, y: 34 },
      { equipmentId: 'CEV-PRS-003', x: 61, y: 35 },
      { equipmentId: 'CEV-OLD-009', x: 72, y: 69 },
    ];
    base.overlayPins = [
      { id: 'f2-fire', layer: 'fire', x: 51, y: 22 },
      { id: 'f2-exit', layer: 'emergency', x: 88, y: 50 },
    ];
    base.zones = [
      { id: 'f2-production', type: 'production', x: 13, y: 15, w: 36, h: 31 },
      { id: 'f2-office', type: 'office', x: 57, y: 14, w: 30, h: 25 },
      { id: 'f2-restricted', type: 'restricted', x: 58, y: 58, w: 29, h: 23 },
    ];
    base.annotations = [
      { id: 'f2-route', type: 'line', x1: 20, y1: 53, x2: 80, y2: 53 },
    ];
    return base;
  }

  if (floor === 'Roof') {
    base.pins = [
      { equipmentId: 'CEV-CMP-002', x: 25, y: 34 },
      { equipmentId: 'CEV-INJ-004', x: 68, y: 34 },
    ];
    base.overlayPins = [
      { id: 'roof-utility', layer: 'utility', x: 44, y: 70 },
      { id: 'roof-flood', layer: 'flood', x: 76, y: 68 },
    ];
    base.zones = [
      { id: 'roof-utility-zone', type: 'utility', x: 12, y: 17, w: 35, h: 29 },
      { id: 'roof-hazard-zone', type: 'hazard', x: 56, y: 17, w: 31, h: 29 },
    ];
    base.annotations = [
      { id: 'roof-note', type: 'text', x1: 44, y1: 52, x2: 44, y2: 52, text: 'HVAC / MEP' },
    ];
    return base;
  }

  return base;
};

// eslint-disable-next-line react-refresh/only-export-components -- pure plan helper shared with FacilityFloorPlan.sketchLock.test.ts
export const ensurePlanShape = (value: Partial<FloorPlanState>): FloorPlanState => ({
  ...EMPTY_PLAN,
  ...value,
  pins: value.pins ?? [],
  overlayPins: value.overlayPins ?? [],
  zones: value.zones ?? [],
  annotations: value.annotations ?? [],
  sketchDocument: value.sketchDocument
    ? cloneSketchDocument(value.sketchDocument)
    : undefined,
  // Absent on plans saved before this field existed — defaults to
  // unlocked, same as every sketch already behaved.
  sketchLocked: value.sketchLocked ?? false,
  sketches: (value.sketches ?? []).map((layer) => ({
    ...layer,
    document: cloneSketchDocument(layer.document),
  })),
  canvasWidth: value.canvasWidth ?? 1200,
  canvasHeight: value.canvasHeight ?? 760,
});

const clonePlan = (plan: FloorPlanState): FloorPlanState =>
  JSON.parse(JSON.stringify(plan)) as FloorPlanState;

const makeId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function DemoBlueprint({ t }: { t: (key: string) => string }) {
  return (
    <svg
      viewBox="0 0 1200 760"
      className="h-full w-full"
      preserveAspectRatio="none"
      aria-label={t('facilityMap.demoPlanAria')}
    >
      <rect width="1200" height="760" fill="#f8fafc" />
      <g stroke="#94a3b8" strokeWidth="2" fill="none">
        <rect x="85" y="75" width="1030" height="610" />
        <path d="M85 365H1115M530 75V365M650 365V685" />
        <rect x="115" y="115" width="365" height="205" />
        <rect x="575" y="115" width="490" height="205" />
        <rect x="115" y="410" width="260" height="220" />
        <rect x="435" y="410" width="630" height="220" />
      </g>
      <g fill="#cbd5e1" stroke="#64748b" strokeWidth="1.5">
        <rect x="160" y="165" width="105" height="62" rx="6" />
        <rect x="315" y="165" width="105" height="62" rx="6" />
        <rect x="625" y="165" width="130" height="66" rx="6" />
        <rect x="810" y="165" width="130" height="66" rx="6" />
        <rect x="155" y="470" width="165" height="84" rx="6" />
        <rect x="505" y="470" width="150" height="84" rx="6" />
        <rect x="710" y="470" width="150" height="84" rx="6" />
        <rect x="900" y="470" width="115" height="84" rx="6" />
      </g>
      <g fill="#334155" fontFamily="system-ui, sans-serif" fontWeight="700">
        <text x="120" y="105" fontSize="20">{t('facilityMap.lineMachining')}</text>
        <text x="575" y="105" fontSize="20">{t('facilityMap.linePressAssembly')}</text>
        <text x="120" y="400" fontSize="20">{t('facilityMap.utility')}</text>
        <text x="440" y="400" fontSize="20">{t('facilityMap.warehouseQa')}</text>
      </g>
      <g fill="#64748b" fontFamily="system-ui, sans-serif" fontSize="14">
        <text x="160" y="270">{t('facilityMap.cncMilling')}</text>
        <text x="625" y="270">{t('facilityMap.pressAssembly')}</text>
        <text x="155" y="590">{t('facilityMap.compressorUtility')}</text>
        <text x="505" y="590">{t('facilityMap.storageInspection')}</text>
      </g>
    </svg>
  );
}

export default function FacilityFloorPlan() {
  const { formatDateTime } = useFormatTimestamp();
  const { t } = useI18n();

  useEffect(() => {
    setSaveFailureNotifier(() => {
      toast({
        variant: 'destructive',
        title: t('facilityMap.saveFailedTitle'),
        description: t('facilityMap.saveFailedDescription'),
      });
    });
    return () => {
      setSaveFailureNotifier(null);
    };
  }, [t]);

  // Self-serve sketch guide. The button shows a dot until the guide has been
  // opened once on this browser, so first-time users notice it.
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideSeen, setGuideSeen] = useState(() => {
    try {
      return localStorage.getItem(SKETCH_GUIDE_SEEN_KEY) === 'true';
    } catch {
      return true;
    }
  });
  const openGuide = useCallback(() => {
    setGuideOpen(true);
    setGuideSeen(true);
    try {
      localStorage.setItem(SKETCH_GUIDE_SEEN_KEY, 'true');
    } catch {
      // Private mode / blocked storage: the dot just shows again next visit.
    }
  }, []);
  const [plan, setPlan] = useState<FloorPlanState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return ensurePlanShape(JSON.parse(raw) as Partial<FloorPlanState>);

      const cacheRaw = localStorage.getItem(PLAN_CACHE_KEY);
      if (cacheRaw) {
        const cache = JSON.parse(cacheRaw) as Record<string, Partial<FloorPlanState>>;
        const cached = cache[planKey('Main Building', 'Floor 1')];
        if (cached) return ensurePlanShape(cached);
      }
      return EMPTY_PLAN;
    } catch {
      return EMPTY_PLAN;
    }
  });
  const [equipment] = useState<EquipmentRow[]>(DEMO_EQUIPMENT);
  const [query, setQuery] = useState('');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [selectedMarkerId, setSelectedMarkerId] = useState('');
  const [placeLayer, setPlaceLayer] = useState<LayerId | null>(null);
  const [zoneTool, setZoneTool] = useState<ZoneType | null>(null);
  const [drawTool, setDrawTool] = useState<DrawTool>('select');
  const [sketchMode, setSketchMode] = useState(false);
  // Untransformed portal target for InventorSketchOverlay's toolbar/properties
  // chrome — see the host div's comment where it's rendered. A ref alone
  // wouldn't re-render once the node mounts, so this uses a callback ref
  // backed by state instead.
  const [sketchChromeHost, setSketchChromeHost] = useState<HTMLDivElement | null>(null);
  const [sketchVisible, setSketchVisible] = useState(true);
  const [canvasHudVisible, setCanvasHudVisible] = useState(true);
  // Persisted on the plan (see FloorPlanState.sketchLocked) — unlike
  // sketchVisible, which stays local view-only state on purpose, lock is a
  // durable property of the sketch itself and must survive reload/remount.
  const sketchLocked = plan.sketchLocked ?? false;
  const [activeSketchId, setActiveSketchId] = useState<string>(DEFAULT_SKETCH_ID);
  const [sketchSessionKey, setSketchSessionKey] = useState(0);
  const [draggingSketchLayerId, setDraggingSketchLayerId] = useState('');
  const sketchLayerDragRef = useRef<{ startX: number; startY: number; snapshot: FloorPlanState } | null>(null);
  // Live (dx, dy) in the sketch's own model units, for InventorSketchOverlay's
  // `translateOffset` — it owns its own internal document/history and only
  // re-syncs from `plan` when `sketchSessionKey` bumps (once, at drag end),
  // so this is what makes a whole-sketch group move visually track the
  // cursor in real time instead of jumping only when the drag finishes.
  const [sketchDragOffset, setSketchDragOffset] = useState<{ dx: number; dy: number } | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const sketchSessionSnapshotRef = useRef<SketchDocument | null>(null);
  const sketchLatestDocumentRef = useRef<SketchDocument | null>(null);
  const [drawingPresets, setDrawingPresets] = useState<Record<AnnotationTool, DrawingPreset>>(() => readDrawingPresets());
  const [selectedObjectIds, setSelectedObjectIds] = useState<Set<string>>(new Set());
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [draggingAnnotationId, setDraggingAnnotationId] = useState('');
  const [annotationGrip, setAnnotationGrip] = useState<AnnotationGrip>(null);
  const [groupDragging, setGroupDragging] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [planManagerOpen, setPlanManagerOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [compareHistoryId, setCompareHistoryId] = useState<string | null>(null);
  const [planLibraryVersion, setPlanLibraryVersion] = useState(0);
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanBuilding, setNewPlanBuilding] = useState('Main Building');
  const [newPlanFloor, setNewPlanFloor] = useState('Floor 1');
  const [newPlanImageData, setNewPlanImageData] = useState('');
  const [newPlanCanvasSize, setNewPlanCanvasSize] = useState({ width: 1200, height: 760 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [fitTransform, setFitTransform] = useState({ scale: 1, x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [gridSize, setGridSize] = useState(5);
  const [hiddenLayers, setHiddenLayers] = useState<Set<'assets' | LayerId>>(new Set());
  const [draggingZoneId, setDraggingZoneId] = useState('');
  const [resizingZoneId, setResizingZoneId] = useState('');
  const [zoneResizeHandle, setZoneResizeHandle] = useState<ZoneResizeHandle | null>(null);
  const [draggingEquipmentId, setDraggingEquipmentId] = useState('');
  const [draggingOverlayId, setDraggingOverlayId] = useState('');
  const [zoneStart, setZoneStart] = useState<{ x: number; y: number } | null>(null);
  const [draftZone, setDraftZone] = useState<Zone | null>(null);
  const [draftAnnotation, setDraftAnnotation] = useState<Annotation | null>(null);
  const [undoStack, setUndoStack] = useState<FloorPlanState[]>([]);
  const [redoStack, setRedoStack] = useState<FloorPlanState[]>([]);
  const pointerStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const dragStartPlanRef = useRef<FloorPlanState | null>(null);
  const annotationStartRef = useRef<{ x: number; y: number } | null>(null);
  const annotationDragRef = useRef<{ startX: number; startY: number; snapshot: Annotation } | null>(null);
  const selectionShiftRef = useRef(false);
  const groupDragRef = useRef<{ startX: number; startY: number; snapshot: FloorPlanState } | null>(null);
  const zoneInteractionRef = useRef<{ startX: number; startY: number; zone: Zone } | null>(null);
  const touchRef = useRef<{
    distance: number;
    zoom: number;
    panX: number;
    panY: number;
    centerX: number;
    centerY: number;
  } | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const viewportTransitionRef = useRef<{
    stagePageX: number;
    stagePageY: number;
    scale: number;
  } | null>(null);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const sync = () => setIsMobileViewport(media.matches);
    sync();
    media.addEventListener?.('change', sync);
    return () => media.removeEventListener?.('change', sync);
  }, []);

  const recalculateFit = useCallback(() => {
    if (viewportTransitionRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const horizontalPadding = 32;
    const verticalPadding = 32;
    const availableWidth = Math.max(1, rect.width - horizontalPadding * 2);
    const availableHeight = Math.max(1, rect.height - verticalPadding * 2);
    const scale = Math.min(
      availableWidth / Math.max(1, plan.canvasWidth),
      availableHeight / Math.max(1, plan.canvasHeight),
    );

    const renderedWidth = plan.canvasWidth * scale;
    const renderedHeight = plan.canvasHeight * scale;
    setFitTransform({
      scale,
      x: (rect.width - renderedWidth) / 2,
      y: (rect.height - renderedHeight) / 2,
    });
  }, [plan.canvasHeight, plan.canvasWidth]);

  useEffect(() => {
    recalculateFit();
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => recalculateFit());
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [recalculateFit]);

  const effectiveScale = fitTransform.scale * zoom;

  const savePlan = useCallback((next: FloorPlanState) => {
    safeSetLocalStorage(STORAGE_KEY, JSON.stringify(next));
    const cache = readPlanCache();
    cache[planKey(next.building, next.floor)] = clonePlan(next);
    safeSetLocalStorage(PLAN_CACHE_KEY, JSON.stringify(cache));

    const history = readHistory();
    const entry: PlanHistoryEntry = {
      id: makeId('history'),
      key: planKey(next.building, next.floor),
      timestamp: Date.now(),
      snapshot: clonePlan(next),
    };
    persistHistory([entry, ...history].slice(0, 40));
    setPlanLibraryVersion((value) => value + 1);
  }, []);

  const commitPlan = useCallback((updater: (current: FloorPlanState) => FloorPlanState) => {
    setPlan((current) => {
      const next = updater(current);
      setUndoStack((stack) => [...stack.slice(-29), clonePlan(current)]);
      setRedoStack([]);
      savePlan(next);
      return next;
    });
  }, [savePlan]);

  const undo = () => {
    setUndoStack((stack) => {
      const previous = stack[stack.length - 1];
      if (!previous) return stack;
      setPlan((current) => {
        setRedoStack((redo) => [...redo.slice(-29), clonePlan(current)]);
        savePlan(previous);
        return clonePlan(previous);
      });
      return stack.slice(0, -1);
    });
    // The default sketch's InventorSketchOverlay instance persists across
    // plan-level undo/redo (it never unmounts the way a restored/removed
    // entry in `sketches` naturally does) — bump its session key so it
    // re-seeds from whatever `plan.sketchDocument` undo just restored,
    // instead of keeping its own stale internal copy.
    setSketchSessionKey((value) => value + 1);
  };

  const redo = () => {
    setRedoStack((stack) => {
      const next = stack[stack.length - 1];
      if (!next) return stack;
      setPlan((current) => {
        setUndoStack((undoHistory) => [...undoHistory.slice(-29), clonePlan(current)]);
        savePlan(next);
        return clonePlan(next);
      });
      return stack.slice(0, -1);
    });
    setSketchSessionKey((value) => value + 1);
  };

  const filteredEquipment = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return equipment.filter((item) => {
      if (!needle) return true;
      return `${item.name ?? ''} ${item.id} ${item.status ?? ''}`.toLowerCase().includes(needle);
    });
  }, [equipment, query]);

  const equipmentById = useMemo(
    () => new Map(equipment.map((item) => [item.id, item])),
    [equipment],
  );

  const selectedEquipment = useMemo(() => {
    if (!selectedMarkerId.startsWith('asset:')) return null;
    return equipmentById.get(selectedMarkerId.slice('asset:'.length)) ?? null;
  }, [equipmentById, selectedMarkerId]);

  const selectedZone = useMemo(() => {
    if (!selectedMarkerId.startsWith('zone:')) return null;
    return plan.zones.find((zone) => zone.id === selectedMarkerId.slice('zone:'.length)) ?? null;
  }, [plan.zones, selectedMarkerId]);

  const selectedOverlay = useMemo(() => {
    if (!selectedMarkerId.startsWith('overlay:')) return null;
    return plan.overlayPins.find((pin) => pin.id === selectedMarkerId.slice('overlay:'.length)) ?? null;
  }, [plan.overlayPins, selectedMarkerId]);

  const selectedAnnotation = useMemo(() => {
    if (!selectedMarkerId.startsWith('annotation:')) return null;
    return plan.annotations.find((annotation) => annotation.id === selectedMarkerId.slice('annotation:'.length)) ?? null;
  }, [plan.annotations, selectedMarkerId]);

  const allPlans = useMemo(() => {
    const cache = readPlanCache();
    cache[planKey(plan.building, plan.floor)] = clonePlan(plan);
    return Object.values(cache).sort((a, b) =>
      `${a.building} ${a.floor}`.localeCompare(`${b.building} ${b.floor}`),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps -- planLibraryVersion is a cache-bust key: these read localStorage, which React can't track
  }, [plan, planLibraryVersion]);

  const plansByBuilding = useMemo(() => {
    const groups = new Map<string, FloorPlanState[]>();
    allPlans.forEach((item) => {
      const current = groups.get(item.building) ?? [];
      current.push(item);
      groups.set(item.building, current);
    });
    return [...groups.entries()];
  }, [allPlans]);

  const planHistory = useMemo(
    () => readHistory().filter((entry) => entry.key === planKey(plan.building, plan.floor)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- planLibraryVersion is a cache-bust key: these read localStorage, which React can't track
    [plan.building, plan.floor, planLibraryVersion],
  );

  const compareSnapshot = useMemo(
    () => planHistory.find((entry) => entry.id === compareHistoryId)?.snapshot ?? null,
    [compareHistoryId, planHistory],
  );

  const unplacedEquipment = useMemo(
    () => filteredEquipment.filter((item) => !plan.pins.some((pin) => pin.equipmentId === item.id)),
    [filteredEquipment, plan.pins],
  );

  const layerById = useMemo(() => new Map(LAYERS.map((layer) => [layer.id, layer])), []);
  const zoneById = useMemo(() => new Map(ZONES.map((zone) => [zone.id, zone])), []);

  const currentDrawingTool: AnnotationTool =
    drawTool === 'line' || drawTool === 'arrow' || drawTool === 'rect' || drawTool === 'circle' || drawTool === 'text' || drawTool === 'ruler'
      ? drawTool
      : 'line';
  const currentDrawingPreset = drawingPresets[currentDrawingTool];

  const updateCurrentDrawingPreset = useCallback((patch: Partial<DrawingPreset>) => {
    setDrawingPresets((current) => {
      const next = {
        ...current,
        [currentDrawingTool]: { ...current[currentDrawingTool], ...patch },
      };
      safeSetLocalStorage(DRAWING_PRESET_KEY, JSON.stringify(next));
      return next;
    });
  }, [currentDrawingTool]);

  const setSingleSelection = useCallback((id: string, additive = false) => {
    setSelectedObjectIds((current) => {
      if (!additive) {
        setSelectedMarkerId(id);
        return new Set([id]);
      }
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelectedMarkerId(next.has(id) ? id : ([...next][0] ?? ''));
      return next;
    });
  }, []);

  const setLayerVisible = useCallback((layerId: 'assets' | LayerId, visible: boolean) => {
    setHiddenLayers((current) => {
      const next = new Set(current);
      if (visible) next.delete(layerId);
      else next.add(layerId);
      return next;
    });
    if (!visible) {
      if (placeLayer === layerId) setPlaceLayer(null);
      setSelectedObjectIds((current) => {
        const next = new Set(current);
        if (layerId === 'assets') {
          [...next].forEach((id) => {
            if (id.startsWith('asset:')) next.delete(id);
          });
        } else {
          const ids = new Set(plan.overlayPins.filter((pin) => pin.layer === layerId).map((pin) => `overlay:${pin.id}`));
          ids.forEach((id) => next.delete(id));
        }
        return next;
      });
    }
  }, [placeLayer, plan.overlayPins]);

  const selectAllLayers = useCallback(() => {
    setHiddenLayers(new Set());
  }, []);

  const deleteObjectsByIds = useCallback((ids: Set<string>) => {
    if (!ids.size) return;
    // A locked sketch is never deletable by the generic Delete key, even if
    // its `sketch:<id>` somehow ended up in the selection — defense in
    // depth alongside lock already excluding it from click/marquee-select.
    // Computed from the outer (already up to date) `plan`/`sketchLocked`,
    // same as every other decision in this handler and its siblings
    // (toggleSketchLayerLock, deleteSketchLayer, ...) — commitPlan's own
    // updater still re-derives the actual filtered data from `current` so
    // the write itself is never stale.
    const deletesDefaultSketch = ids.has(`sketch:${DEFAULT_SKETCH_ID}`) && !sketchLocked;
    commitPlan((current) => {
      const sketchResult = deleteSelectedSketchLayers(
        {
          defaultSketchId: DEFAULT_SKETCH_ID,
          defaultSketchDocument: current.sketchDocument,
          defaultSketchLocked: sketchLocked,
          sketches: current.sketches,
        },
        ids,
      );
      return {
        ...current,
        pins: current.pins.filter((pin) => !ids.has(`asset:${pin.equipmentId}`)),
        overlayPins: current.overlayPins.filter((pin) => !ids.has(`overlay:${pin.id}`)),
        zones: current.zones.filter((zone) => !ids.has(`zone:${zone.id}`)),
        annotations: current.annotations.filter((annotation) => !ids.has(`annotation:${annotation.id}`)),
        sketchDocument: sketchResult.sketchDocument,
        sketches: sketchResult.sketches,
      };
    });
    if (deletesDefaultSketch) {
      // The default sketch's InventorSketchOverlay instance never unmounts
      // (unlike an additional sketch removed from `sketches`, which
      // naturally remounts fresh on undo), so it needs an explicit nudge
      // to re-seed from the now-empty plan instead of keeping whatever it
      // already had loaded internally.
      // planKey(...) is the default sketch's storage key — same formula as
      // sketchLayerStorageKey(DEFAULT_SKETCH_ID), computed inline so this
      // callback doesn't depend on a `const` declared further down the
      // component body (and so its dependency array can name the actual
      // primitives it closes over, plan.building/plan.floor).
      saveSketchDocument(planKey(plan.building, plan.floor), createSketchDocument({
        displayUnit: plan.sketchDocument?.displayUnit,
        mmPerUnit: plan.sketchDocument?.mmPerUnit,
      }));
      setSketchSessionKey((value) => value + 1);
      if (activeSketchId === DEFAULT_SKETCH_ID) {
        setSketchMode(false);
      }
    }
    if ([...ids].some((id) => id.startsWith('sketch:') && id !== `sketch:${DEFAULT_SKETCH_ID}` && activeSketchId === id.slice('sketch:'.length))) {
      setSketchMode(false);
      setActiveSketchId(DEFAULT_SKETCH_ID);
    }
    setSelectedMarkerId('');
    setSelectedObjectIds(new Set());
  }, [activeSketchId, commitPlan, plan.building, plan.floor, plan.sketchDocument, sketchLocked]);

  const annotationBounds = useCallback((annotation: Annotation) => {
    if (annotation.type === 'text') {
      const width = Math.max(3, (annotation.text?.length ?? 4) * (annotation.textSize ?? 2.5) * 0.65);
      const height = Math.max(2, (annotation.textSize ?? 2.5) * 1.3);
      return { x1: annotation.x1, y1: annotation.y1 - height, x2: annotation.x1 + width, y2: annotation.y1 };
    }
    return {
      x1: Math.min(annotation.x1, annotation.x2),
      y1: Math.min(annotation.y1, annotation.y2),
      x2: Math.max(annotation.x1, annotation.x2),
      y2: Math.max(annotation.y1, annotation.y2),
    };
  }, []);

  const collectObjectsInSelection = useCallback((box: SelectionBox) => {
    const left = Math.min(box.startX, box.endX);
    const right = Math.max(box.startX, box.endX);
    const top = Math.min(box.startY, box.endY);
    const bottom = Math.max(box.startY, box.endY);
    const hit = (bounds: { x1: number; y1: number; x2: number; y2: number }) =>
      box.crossing
        ? bounds.x2 >= left && bounds.x1 <= right && bounds.y2 >= top && bounds.y1 <= bottom
        : bounds.x1 >= left && bounds.x2 <= right && bounds.y1 >= top && bounds.y2 <= bottom;

    const pointInside = (x: number, y: number) => x >= left && x <= right && y >= top && y <= bottom;
    const orientation = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) =>
      Math.sign((by - ay) * (cx - bx) - (bx - ax) * (cy - by));
    const segmentsIntersect = (
      ax: number, ay: number, bx: number, by: number,
      cx: number, cy: number, dx: number, dy: number,
    ) => {
      const o1 = orientation(ax, ay, bx, by, cx, cy);
      const o2 = orientation(ax, ay, bx, by, dx, dy);
      const o3 = orientation(cx, cy, dx, dy, ax, ay);
      const o4 = orientation(cx, cy, dx, dy, bx, by);
      return o1 !== o2 && o3 !== o4;
    };
    const segmentHitsRect = (x1: number, y1: number, x2: number, y2: number) => {
      if (!box.crossing) return pointInside(x1, y1) && pointInside(x2, y2);
      if (pointInside(x1, y1) || pointInside(x2, y2)) return true;
      return (
        segmentsIntersect(x1, y1, x2, y2, left, top, right, top) ||
        segmentsIntersect(x1, y1, x2, y2, right, top, right, bottom) ||
        segmentsIntersect(x1, y1, x2, y2, right, bottom, left, bottom) ||
        segmentsIntersect(x1, y1, x2, y2, left, bottom, left, top)
      );
    };

    const ids = new Set<string>();
    if (!hiddenLayers.has('assets')) {
      plan.pins.forEach((pin) => {
        if (hit({ x1: pin.x - 1.2, y1: pin.y - 1.2, x2: pin.x + 1.2, y2: pin.y + 1.2 })) ids.add(`asset:${pin.equipmentId}`);
      });
    }
    plan.overlayPins.forEach((pin) => {
      if (!hiddenLayers.has(pin.layer) && hit({ x1: pin.x - 1.2, y1: pin.y - 1.2, x2: pin.x + 1.2, y2: pin.y + 1.2 })) ids.add(`overlay:${pin.id}`);
    });
    plan.zones.forEach((zone) => {
      if (hit({ x1: zone.x, y1: zone.y, x2: zone.x + zone.w, y2: zone.y + zone.h })) ids.add(`zone:${zone.id}`);
    });
    plan.annotations.forEach((annotation) => {
      const selected =
        annotation.type === 'line' || annotation.type === 'arrow' || annotation.type === 'ruler'
          ? segmentHitsRect(annotation.x1, annotation.y1, annotation.x2, annotation.y2)
          : hit(annotationBounds(annotation));
      if (selected) ids.add(`annotation:${annotation.id}`);
    });

    // Locked sketches (CorelDRAW/Illustrator-style layer lock) are skipped
    // entirely — a marquee drag must never catch and drag them along.
    const sketchLayers: Array<{ id: string; visible: boolean; locked?: boolean; document: SketchDocument | undefined }> = [
      { id: DEFAULT_SKETCH_ID, visible: sketchVisible, locked: sketchLocked, document: plan.sketchDocument },
      ...plan.sketches.map((layer) => ({ id: layer.id, visible: layer.visible, locked: layer.locked, document: layer.document })),
    ];
    sketchLayers.forEach((layer) => {
      if (!layer.visible || layer.locked || !layer.document) return;
      const bounds = getSketchEntitiesBounds(layer.document.entities);
      if (!bounds) return;
      if (hit({
        x1: (bounds.minX / plan.canvasWidth) * 100,
        y1: (bounds.minY / plan.canvasHeight) * 100,
        x2: (bounds.maxX / plan.canvasWidth) * 100,
        y2: (bounds.maxY / plan.canvasHeight) * 100,
      })) {
        ids.add(`sketch:${layer.id}`);
      }
    });

    return ids;
  }, [annotationBounds, hiddenLayers, plan.annotations, plan.canvasHeight, plan.canvasWidth, plan.overlayPins, plan.pins, plan.sketchDocument, plan.sketches, plan.zones, sketchLocked, sketchVisible]);

  const snapValue = useCallback((value: number) => {
    if (!snapToGrid) return value;
    return Math.round(value / gridSize) * gridSize;
  }, [gridSize, snapToGrid]);

  const toPercentRaw = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || effectiveScale <= 0) return null;
    const rect = canvas.getBoundingClientRect();
    const localX = (clientX - rect.left - fitTransform.x - pan.x) / effectiveScale;
    const localY = (clientY - rect.top - fitTransform.y - pan.y) / effectiveScale;
    return {
      x: Math.max(0, Math.min(100, (localX / plan.canvasWidth) * 100)),
      y: Math.max(0, Math.min(100, (localY / plan.canvasHeight) * 100)),
    };
  }, [effectiveScale, fitTransform.x, fitTransform.y, pan.x, pan.y, plan.canvasHeight, plan.canvasWidth]);

  const toPercent = useCallback((clientX: number, clientY: number) => {
    const point = toPercentRaw(clientX, clientY);
    if (!point) return null;
    return { x: snapValue(point.x), y: snapValue(point.y) };
  }, [snapValue, toPercentRaw]);

  const beginGroupDrag = useCallback((event: React.MouseEvent, objectId: string) => {
    if (drawTool !== 'select' || selectedObjectIds.size < 2 || !selectedObjectIds.has(objectId)) return false;
    const point = toPercentRaw(event.clientX, event.clientY);
    if (!point) return false;
    dragStartPlanRef.current = clonePlan(plan);
    groupDragRef.current = { startX: point.x, startY: point.y, snapshot: clonePlan(plan) };
    setGroupDragging(true);
    return true;
  }, [drawTool, plan, selectedObjectIds, toPercentRaw]);

  const beginAnnotationDrag = useCallback((event: React.MouseEvent<SVGElement>, annotation: Annotation) => {
    if (!editMode || drawTool !== 'select') return;
    event.stopPropagation();
    const objectId = `annotation:${annotation.id}`;
    if (beginGroupDrag(event, objectId)) return;
    const point = toPercentRaw(event.clientX, event.clientY);
    if (!point) return;
    setSingleSelection(objectId, event.shiftKey);
    dragStartPlanRef.current = clonePlan(plan);
    annotationDragRef.current = { startX: point.x, startY: point.y, snapshot: { ...annotation } };
    setDraggingAnnotationId(annotation.id);
  }, [beginGroupDrag, drawTool, editMode, plan, setSingleSelection, toPercentRaw]);

  const beginAnnotationGrip = useCallback((
    event: React.MouseEvent<SVGCircleElement>,
    annotation: Annotation,
    handle: NonNullable<AnnotationGrip>['handle'],
  ) => {
    if (!editMode || drawTool !== 'select') return;
    event.stopPropagation();
    const point = toPercentRaw(event.clientX, event.clientY);
    if (!point) return;
    const objectId = `annotation:${annotation.id}`;
    setSingleSelection(objectId);
    dragStartPlanRef.current = clonePlan(plan);
    annotationDragRef.current = { startX: point.x, startY: point.y, snapshot: { ...annotation } };
    setAnnotationGrip({ id: annotation.id, handle });
  }, [drawTool, editMode, plan, setSingleSelection, toPercentRaw]);

  // Clicking any entity in a finished sketch (outside Sketch Mode) selects
  // and drags the WHOLE sketch as one rigid block — editing individual
  // points/lines is reserved for Enter/Edit Sketch. Mirrors beginAnnotationDrag.
  const beginSketchLayerDrag = useCallback((event: React.MouseEvent, layerId: string, locked?: boolean) => {
    if (!editMode || drawTool !== 'select' || locked) return;
    event.stopPropagation();
    const objectId = `sketch:${layerId}`;
    if (beginGroupDrag(event, objectId)) return;
    const point = toPercentRaw(event.clientX, event.clientY);
    if (!point) return;
    setSingleSelection(objectId, event.shiftKey);
    dragStartPlanRef.current = clonePlan(plan);
    sketchLayerDragRef.current = { startX: point.x, startY: point.y, snapshot: clonePlan(plan) };
    setDraggingSketchLayerId(layerId);
  }, [beginGroupDrag, drawTool, editMode, plan, setSingleSelection, toPercentRaw]);

  const placeAt = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!editMode || draggingEquipmentId || draggingOverlayId || isPanning || zoneStart) return;
    const point = toPercent(event.clientX, event.clientY);
    if (!point) return;

    if (selectedEquipmentId) {
      commitPlan((current) => ({
        ...current,
        pins: [
          ...current.pins.filter((pin) => pin.equipmentId !== selectedEquipmentId),
          { equipmentId: selectedEquipmentId, ...point },
        ],
      }));
      setSingleSelection(`asset:${selectedEquipmentId}`);
      setSelectedEquipmentId('');
      return;
    }

    if (placeLayer) {
      const id = makeId(placeLayer);
      commitPlan((current) => ({
        ...current,
        overlayPins: [...current.overlayPins, { id, layer: placeLayer, ...point }],
      }));
      setSingleSelection(`overlay:${id}`);
    }
  }, [
    commitPlan,
    draggingEquipmentId,
    draggingOverlayId,
    editMode,
    isPanning,
    placeLayer,
    selectedEquipmentId,
    setSingleSelection,
    toPercent,
    zoneStart,
  ]);

  const startPointer = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button === 1 || (editMode && drawTool === 'pan')) {
      event.preventDefault();
      pointerStart.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
      setIsPanning(true);
      return;
    }

    if (!editMode || sketchMode || event.button !== 0) return;
    const rawPoint = toPercentRaw(event.clientX, event.clientY);
    const point = toPercent(event.clientX, event.clientY);
    if (!rawPoint || !point) return;

    if (drawTool === 'select' && !selectedEquipmentId && !placeLayer && !zoneTool) {
      event.preventDefault();
      selectionShiftRef.current = event.shiftKey;
      setSelectionBox({
        startX: rawPoint.x,
        startY: rawPoint.y,
        endX: rawPoint.x,
        endY: rawPoint.y,
        crossing: false,
      });
      if (!event.shiftKey) {
        setSelectedObjectIds(new Set());
        setSelectedMarkerId('');
      }
      return;
    }

    if (['line', 'arrow', 'rect', 'circle', 'ruler'].includes(drawTool)) {
      event.preventDefault();
      annotationStartRef.current = point;
      setDraftAnnotation({
        id: 'draft-annotation',
        type: drawTool as Annotation['type'],
        x1: point.x,
        y1: point.y,
        x2: point.x,
        y2: point.y,
        color: currentDrawingPreset.color,
        lineWidth: currentDrawingPreset.lineWidth,
        textSize: currentDrawingPreset.textSize,
        arrowSize: currentDrawingPreset.arrowSize,
      });
      return;
    }

    if (drawTool === 'text') {
      event.preventDefault();
      const id = makeId('text');
      commitPlan((current) => ({
        ...current,
        annotations: [
          ...current.annotations,
          {
            id,
            type: 'text',
            x1: point.x,
            y1: point.y,
            x2: point.x,
            y2: point.y,
            text: currentDrawingPreset.text || t('facilityMap.defaultNote'),
            color: currentDrawingPreset.color,
            lineWidth: currentDrawingPreset.lineWidth,
            textSize: currentDrawingPreset.textSize,
            arrowSize: currentDrawingPreset.arrowSize,
          },
        ],
      }));
      setSingleSelection(`annotation:${id}`);
      return;
    }

    if (!zoneTool) return;
    event.preventDefault();
    setZoneStart(point);
    setDraftZone({
      id: 'draft',
      type: zoneTool,
      x: point.x,
      y: point.y,
      w: 0,
      h: 0,
    });
  };

  const onPointerMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning) {
      const start = pointerStart.current;
      setPan({
        x: start.panX + (event.clientX - start.x),
        y: start.panY + (event.clientY - start.y),
      });
      return;
    }

    const rawPoint = toPercentRaw(event.clientX, event.clientY);
    const point = toPercent(event.clientX, event.clientY);
    if (!rawPoint || !point) return;

    if (selectionBox && editMode && drawTool === 'select') {
      setSelectionBox((current) => current ? {
        ...current,
        endX: rawPoint.x,
        endY: rawPoint.y,
        crossing: rawPoint.x < current.startX,
      } : current);
      return;
    }

    if (groupDragging && groupDragRef.current && editMode) {
      const drag = groupDragRef.current;
      const dx = rawPoint.x - drag.startX;
      const dy = rawPoint.y - drag.startY;
      const snapshot = drag.snapshot;
      const dxModel = (dx / 100) * snapshot.canvasWidth;
      const dyModel = (dy / 100) * snapshot.canvasHeight;
      const translateSketch = (document: SketchDocument): SketchDocument => ({
        ...document,
        entities: document.entities.map((entity) => translateSketchEntity(entity, dxModel, dyModel)),
      });
      setSketchDragOffset({ dx: dxModel, dy: dyModel });
      setPlan({
        ...snapshot,
        pins: snapshot.pins.map((pin) =>
          selectedObjectIds.has(`asset:${pin.equipmentId}`) ? { ...pin, x: pin.x + dx, y: pin.y + dy } : pin,
        ),
        overlayPins: snapshot.overlayPins.map((pin) =>
          selectedObjectIds.has(`overlay:${pin.id}`) ? { ...pin, x: pin.x + dx, y: pin.y + dy } : pin,
        ),
        zones: snapshot.zones.map((zone) =>
          selectedObjectIds.has(`zone:${zone.id}`) ? { ...zone, x: zone.x + dx, y: zone.y + dy } : zone,
        ),
        annotations: snapshot.annotations.map((annotation) =>
          selectedObjectIds.has(`annotation:${annotation.id}`)
            ? { ...annotation, x1: annotation.x1 + dx, y1: annotation.y1 + dy, x2: annotation.x2 + dx, y2: annotation.y2 + dy }
            : annotation,
        ),
        sketchDocument: snapshot.sketchDocument && selectedObjectIds.has(`sketch:${DEFAULT_SKETCH_ID}`)
          ? translateSketch(snapshot.sketchDocument)
          : snapshot.sketchDocument,
        sketches: snapshot.sketches.map((layer) =>
          selectedObjectIds.has(`sketch:${layer.id}`)
            ? { ...layer, document: translateSketch(layer.document) }
            : layer,
        ),
      });
      return;
    }

    if (annotationGrip && annotationDragRef.current && editMode) {
      const original = annotationDragRef.current.snapshot;
      setPlan((current) => ({
        ...current,
        annotations: current.annotations.map((annotation) => {
          if (annotation.id !== annotationGrip.id) return annotation;
          if (annotationGrip.handle === 'start') return { ...annotation, x1: point.x, y1: point.y };
          if (annotationGrip.handle === 'end') return { ...annotation, x2: point.x, y2: point.y };
          const left = Math.min(original.x1, original.x2);
          const right = Math.max(original.x1, original.x2);
          const top = Math.min(original.y1, original.y2);
          const bottom = Math.max(original.y1, original.y2);
          if (annotationGrip.handle === 'nw') return { ...annotation, x1: point.x, y1: point.y, x2: right, y2: bottom };
          if (annotationGrip.handle === 'ne') return { ...annotation, x1: left, y1: point.y, x2: point.x, y2: bottom };
          if (annotationGrip.handle === 'se') return { ...annotation, x1: left, y1: top, x2: point.x, y2: point.y };
          return { ...annotation, x1: point.x, y1: top, x2: right, y2: point.y };
        }),
      }));
      return;
    }

    if (draggingAnnotationId && annotationDragRef.current && editMode) {
      const original = annotationDragRef.current.snapshot;
      const dx = rawPoint.x - annotationDragRef.current.startX;
      const dy = rawPoint.y - annotationDragRef.current.startY;
      setPlan((current) => ({
        ...current,
        annotations: current.annotations.map((annotation) =>
          annotation.id === draggingAnnotationId
            ? { ...annotation, x1: original.x1 + dx, y1: original.y1 + dy, x2: original.x2 + dx, y2: original.y2 + dy }
            : annotation,
        ),
      }));
      return;
    }

    if (draggingSketchLayerId && sketchLayerDragRef.current && editMode) {
      const drag = sketchLayerDragRef.current;
      const dx = rawPoint.x - drag.startX;
      const dy = rawPoint.y - drag.startY;
      const snapshot = drag.snapshot;
      const dxModel = (dx / 100) * snapshot.canvasWidth;
      const dyModel = (dy / 100) * snapshot.canvasHeight;
      const translateSketch = (document: SketchDocument): SketchDocument => ({
        ...document,
        entities: document.entities.map((entity) => translateSketchEntity(entity, dxModel, dyModel)),
      });
      setSketchDragOffset({ dx: dxModel, dy: dyModel });
      setPlan({
        ...snapshot,
        sketchDocument: draggingSketchLayerId === DEFAULT_SKETCH_ID && snapshot.sketchDocument
          ? translateSketch(snapshot.sketchDocument)
          : snapshot.sketchDocument,
        sketches: snapshot.sketches.map((layer) =>
          layer.id === draggingSketchLayerId ? { ...layer, document: translateSketch(layer.document) } : layer,
        ),
      });
      return;
    }

    if (draftAnnotation && annotationStartRef.current && editMode) {
      setDraftAnnotation((current) => current ? { ...current, x2: point.x, y2: point.y } : current);
      return;
    }

    if (zoneStart && zoneTool && editMode) {
      setDraftZone({
        id: 'draft',
        type: zoneTool,
        x: Math.min(zoneStart.x, point.x),
        y: Math.min(zoneStart.y, point.y),
        w: Math.abs(point.x - zoneStart.x),
        h: Math.abs(point.y - zoneStart.y),
      });
      return;
    }

    if (draggingZoneId && zoneInteractionRef.current && editMode) {
      const start = zoneInteractionRef.current;
      const dx = point.x - start.startX;
      const dy = point.y - start.startY;
      setPlan((current) => ({
        ...current,
        zones: current.zones.map((zone) =>
          zone.id === draggingZoneId
            ? {
                ...zone,
                x: Math.max(0, Math.min(100 - zone.w, start.zone.x + dx)),
                y: Math.max(0, Math.min(100 - zone.h, start.zone.y + dy)),
              }
            : zone,
        ),
      }));
      return;
    }

    if (resizingZoneId && zoneInteractionRef.current && zoneResizeHandle && editMode) {
      const start = zoneInteractionRef.current;
      const dx = point.x - start.startX;
      const dy = point.y - start.startY;
      setPlan((current) => ({
        ...current,
        zones: current.zones.map((zone) => {
          if (zone.id !== resizingZoneId) return zone;
          const original = start.zone;
          let x = original.x;
          let y = original.y;
          let w = original.w;
          let h = original.h;

          if (zoneResizeHandle.includes('e')) w = Math.max(3, original.w + dx);
          if (zoneResizeHandle.includes('s')) h = Math.max(3, original.h + dy);
          if (zoneResizeHandle.includes('w')) {
            x = Math.min(original.x + original.w - 3, original.x + dx);
            w = Math.max(3, original.w - (x - original.x));
          }
          if (zoneResizeHandle.includes('n')) {
            y = Math.min(original.y + original.h - 3, original.y + dy);
            h = Math.max(3, original.h - (y - original.y));
          }

          x = Math.max(0, x);
          y = Math.max(0, y);
          w = Math.min(100 - x, w);
          h = Math.min(100 - y, h);

          const snappedX = Math.max(0, Math.min(97, snapValue(x)));
          const snappedY = Math.max(0, Math.min(97, snapValue(y)));
          const snappedW = Math.max(3, Math.min(100 - snappedX, snapValue(w)));
          const snappedH = Math.max(3, Math.min(100 - snappedY, snapValue(h)));
          return { ...zone, x: snappedX, y: snappedY, w: snappedW, h: snappedH };
        }),
      }));
      return;
    }

    if (draggingEquipmentId && editMode) {
      setPlan((current) => ({
        ...current,
        pins: current.pins.map((pin) =>
          pin.equipmentId === draggingEquipmentId ? { ...pin, ...point } : pin,
        ),
      }));
      return;
    }

    if (draggingOverlayId && editMode) {
      setPlan((current) => ({
        ...current,
        overlayPins: current.overlayPins.map((pin) =>
          pin.id === draggingOverlayId ? { ...pin, ...point } : pin,
        ),
      }));
    }
  };

  const endPointerInteraction = () => {
    if (selectionBox) {
      const hits = collectObjectsInSelection(selectionBox);
      setSelectedObjectIds((current) => {
        if (!selectionShiftRef.current) {
          setSelectedMarkerId([...hits][0] ?? '');
          return hits;
        }
        const next = new Set(current);
        hits.forEach((id) => {
          if (next.has(id)) next.delete(id);
          else next.add(id);
        });
        setSelectedMarkerId([...next][0] ?? '');
        return next;
      });
    } else if (draftAnnotation) {
      const dx = Math.abs(draftAnnotation.x2 - draftAnnotation.x1);
      const dy = Math.abs(draftAnnotation.y2 - draftAnnotation.y1);
      if (dx > 0.3 || dy > 0.3) {
        const id = makeId('annotation');
        commitPlan((current) => ({
          ...current,
          annotations: [...current.annotations, { ...draftAnnotation, id }],
        }));
        setSingleSelection(`annotation:${id}`);
      }
    } else if (draftZone && draftZone.w > 0.5 && draftZone.h > 0.5) {
      commitPlan((current) => ({
        ...current,
        zones: [...current.zones, { ...draftZone, id: makeId('zone') }],
      }));
    } else if ((groupDragging || draggingAnnotationId || annotationGrip || draggingEquipmentId || draggingOverlayId || draggingZoneId || resizingZoneId || draggingSketchLayerId) && dragStartPlanRef.current) {
      const before = dragStartPlanRef.current;
      setUndoStack((stack) => [...stack.slice(-29), clonePlan(before)]);
      setRedoStack([]);
      setPlan((current) => {
        savePlan(current);
        return current;
      });
      // A whole-sketch group move happened purely at the plan level —
      // InventorSketchOverlay keeps its own internal document/history, so
      // bump its session key to make it re-seed from the moved geometry
      // that just landed in `plan`, instead of silently drifting back to
      // its own stale copy on the next render.
      if (draggingSketchLayerId || (groupDragging && [...selectedObjectIds].some((id) => id.startsWith('sketch:')))) {
        setSketchSessionKey((value) => value + 1);
      }
    }

    dragStartPlanRef.current = null;
    annotationStartRef.current = null;
    annotationDragRef.current = null;
    groupDragRef.current = null;
    sketchLayerDragRef.current = null;
    selectionShiftRef.current = false;
    setSelectionBox(null);
    setGroupDragging(false);
    setDraggingAnnotationId('');
    setDraggingSketchLayerId('');
    setSketchDragOffset(null);
    setAnnotationGrip(null);
    setDraftAnnotation(null);
    setZoneStart(null);
    setDraftZone(null);
    setDraggingEquipmentId('');
    setDraggingOverlayId('');
    setDraggingZoneId('');
    setResizingZoneId('');
    setZoneResizeHandle(null);
    zoneInteractionRef.current = null;
    setIsPanning(false);
  };

  const uploadPlan = (file?: File) => {
    if (!file || !editMode) return;
    const reader = new FileReader();
    reader.onload = () => {
      const imageDataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!imageDataUrl) return;

      const image = new Image();
      image.onload = () => {
        commitPlan((current) => ({
          ...current,
          imageDataUrl,
          canvasWidth: Math.max(1, image.naturalWidth || current.canvasWidth),
          canvasHeight: Math.max(1, image.naturalHeight || current.canvasHeight),
        }));
        setZoom(1);
        setPan({ x: 0, y: 0 });
      };
      image.onerror = () => {
        commitPlan((current) => ({ ...current, imageDataUrl }));
        setZoom(1);
        setPan({ x: 0, y: 0 });
      };
      image.src = imageDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const fitView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    requestAnimationFrame(recalculateFit);
  };

  const switchDemoLocation = (building: string, floor: string) => {
    savePlan(plan);
    let next = demoLayoutFor(building, floor);
    try {
      const raw = localStorage.getItem(PLAN_CACHE_KEY);
      const cache = raw ? JSON.parse(raw) as Record<string, Partial<FloorPlanState>> : {};
      const cached = cache[planKey(building, floor)];
      if (cached) next = ensurePlanShape(cached);
    } catch {
      // Fall back to deterministic demo content for the requested floor.
    }
    setUndoStack((stack) => [...stack.slice(-29), clonePlan(plan)]);
    setRedoStack([]);
    setPlan(next);
    savePlan(next);
    setSelectedMarkerId('');
    setSelectedEquipmentId('');
    setPlaceLayer(null);
    setZoneTool(null);
    setDrawTool('select');
    fitView();
  };

  const openPlanFromLibrary = (target: FloorPlanState) => {
    savePlan(plan);
    setPlan(clonePlan(target));
    safeSetLocalStorage(STORAGE_KEY, JSON.stringify(target));
    setPlanManagerOpen(false);
    setCompareHistoryId(null);
    fitView();
  };

  const handleNewPlanImage = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) return;
      const image = new Image();
      image.onload = () => {
        setNewPlanImageData(dataUrl);
        setNewPlanCanvasSize({
          width: Math.max(1, image.naturalWidth || 1200),
          height: Math.max(1, image.naturalHeight || 760),
        });
      };
      image.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const createPlan = (duplicateCurrent: boolean) => {
    const building = newPlanBuilding.trim() || 'Main Building';
    const floor = newPlanFloor.trim() || 'Floor 1';
    const name = newPlanName.trim() || `${building} - ${floor}`;
    const next = duplicateCurrent
      ? {
          ...clonePlan(plan),
          name,
          building,
          floor,
          ...(newPlanImageData
            ? {
                imageDataUrl: newPlanImageData,
                canvasWidth: newPlanCanvasSize.width,
                canvasHeight: newPlanCanvasSize.height,
              }
            : {}),
        }
      : {
          ...clonePlan(EMPTY_PLAN),
          name,
          building,
          floor,
          imageDataUrl: newPlanImageData,
          canvasWidth: newPlanCanvasSize.width,
          canvasHeight: newPlanCanvasSize.height,
          pins: [],
          overlayPins: [],
          zones: [],
          annotations: [],
          sketchDocument: undefined,
        };
    const cache = readPlanCache();
    cache[planKey(building, floor)] = clonePlan(next);
    safeSetLocalStorage(PLAN_CACHE_KEY, JSON.stringify(cache));
    setPlan(next);
    safeSetLocalStorage(STORAGE_KEY, JSON.stringify(next));
    setPlanLibraryVersion((value) => value + 1);
    setNewPlanName('');
    setNewPlanImageData('');
    setNewPlanCanvasSize({ width: 1200, height: 760 });
    setPlanManagerOpen(false);
    fitView();
  };

  const deleteCurrentPlan = () => {
    if (!window.confirm(t('facilityMap.deletePlanConfirm'))) return;
    const cache = readPlanCache();
    delete cache[planKey(plan.building, plan.floor)];
    safeSetLocalStorage(PLAN_CACHE_KEY, JSON.stringify(cache));
    const remaining = Object.values(cache);
    const next = remaining[0] ? ensurePlanShape(remaining[0]) : clonePlan(EMPTY_PLAN);
    setPlan(next);
    safeSetLocalStorage(STORAGE_KEY, JSON.stringify(next));
    setPlanLibraryVersion((value) => value + 1);
    setPlanManagerOpen(false);
    fitView();
  };

  const restoreHistoryEntry = (entry: PlanHistoryEntry) => {
    setPlan(clonePlan(entry.snapshot));
    savePlan(entry.snapshot);
    setHistoryOpen(false);
    setCompareHistoryId(null);
    fitView();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    const currentScale = effectiveScale;
    if (currentScale <= 0) return;
    const worldX = (pointerX - fitTransform.x - pan.x) / currentScale;
    const worldY = (pointerY - fitTransform.y - pan.y) / currentScale;
    const factor = event.deltaY < 0 ? 1.12 : 0.89;
    const nextZoom = Math.max(0.5, Math.min(3, zoom * factor));
    const nextScale = fitTransform.scale * nextZoom;
    setZoom(nextZoom);
    setPan({
      x: pointerX - fitTransform.x - worldX * nextScale,
      y: pointerY - fitTransform.y - worldY * nextScale,
    });
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length === 2) {
      const [a, b] = [event.touches[0], event.touches[1]];
      const dx = b.clientX - a.clientX;
      const dy = b.clientY - a.clientY;
      touchRef.current = {
        distance: Math.hypot(dx, dy),
        zoom,
        panX: pan.x,
        panY: pan.y,
        centerX: (a.clientX + b.clientX) / 2,
        centerY: (a.clientY + b.clientY) / 2,
      };
      return;
    }

    if (event.touches.length === 1 && (!editMode || drawTool === 'pan')) {
      const touch = event.touches[0];
      pointerStart.current = { x: touch.clientX, y: touch.clientY, panX: pan.x, panY: pan.y };
      setIsPanning(true);
    }
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length === 2 && touchRef.current) {
      event.preventDefault();
      const [a, b] = [event.touches[0], event.touches[1]];
      const dx = b.clientX - a.clientX;
      const dy = b.clientY - a.clientY;
      const nextZoom = Math.max(0.5, Math.min(3, touchRef.current.zoom * (Math.hypot(dx, dy) / touchRef.current.distance)));
      const centerX = (a.clientX + b.clientX) / 2;
      const centerY = (a.clientY + b.clientY) / 2;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const startCenterX = touchRef.current.centerX - rect.left;
      const startCenterY = touchRef.current.centerY - rect.top;
      const currentCenterX = centerX - rect.left;
      const currentCenterY = centerY - rect.top;
      const startScale = fitTransform.scale * touchRef.current.zoom;
      const nextScale = fitTransform.scale * nextZoom;
      if (startScale <= 0) return;
      const worldX = (startCenterX - fitTransform.x - touchRef.current.panX) / startScale;
      const worldY = (startCenterY - fitTransform.y - touchRef.current.panY) / startScale;
      setZoom(nextZoom);
      setPan({
        x: currentCenterX - fitTransform.x - worldX * nextScale,
        y: currentCenterY - fitTransform.y - worldY * nextScale,
      });
      return;
    }

    if (event.touches.length === 1 && isPanning) {
      event.preventDefault();
      const touch = event.touches[0];
      const start = pointerStart.current;
      setPan({
        x: start.panX + (touch.clientX - start.x),
        y: start.panY + (touch.clientY - start.y),
      });
    }
  };

  const handleTouchEnd = () => {
    touchRef.current = null;
    setIsPanning(false);
  };

  const deleteSelected = () => {
    if (!editMode) return;
    if (selectedObjectIds.size) {
      deleteObjectsByIds(selectedObjectIds);
      return;
    }
    if (selectedMarkerId) deleteObjectsByIds(new Set([selectedMarkerId]));
  };

  const sketchStorageKey = planKey(plan.building, plan.floor);
  const sketchLayerStorageKey = (sketchId: string) =>
    sketchId === DEFAULT_SKETCH_ID ? sketchStorageKey : `${sketchStorageKey}::sketch:${sketchId}`;
  const activeSketchStorageKey = sketchLayerStorageKey(activeSketchId);

  const enterSketch = (sketchId: string = DEFAULT_SKETCH_ID) => {
    const storageKey = sketchLayerStorageKey(sketchId);
    const initial = sketchId === DEFAULT_SKETCH_ID
      ? (plan.sketchDocument
          ? cloneSketchDocument(plan.sketchDocument)
          : loadSketchDocument(storageKey))
      : cloneSketchDocument(
          plan.sketches.find((layer) => layer.id === sketchId)?.document
            ?? loadSketchDocument(storageKey),
        );
    sketchSessionSnapshotRef.current = cloneSketchDocument(initial);
    sketchLatestDocumentRef.current = cloneSketchDocument(initial);
    saveSketchDocument(storageKey, initial);
    setActiveSketchId(sketchId);
    setSketchSessionKey((value) => value + 1);
    if (sketchId === DEFAULT_SKETCH_ID) setSketchVisible(true);
    setSketchMode(true);
    setDrawTool('select');
    setPlaceLayer(null);
    setZoneTool(null);
    setSelectedEquipmentId('');
    setSelectedObjectIds(new Set());
    setSelectedMarkerId('');
  };

  const finishSketch = (document?: SketchDocument) => {
    const nextDocument = document
      ? cloneSketchDocument(document)
      : sketchLatestDocumentRef.current
        ? cloneSketchDocument(sketchLatestDocumentRef.current)
        : null;
    if (!nextDocument) {
      setSketchMode(false);
      return;
    }

    saveSketchDocument(activeSketchStorageKey, nextDocument);
    commitPlan((current) =>
      activeSketchId === DEFAULT_SKETCH_ID
        ? { ...current, sketchDocument: cloneSketchDocument(nextDocument) }
        : {
            ...current,
            sketches: current.sketches.map((layer) =>
              layer.id === activeSketchId
                ? { ...layer, document: cloneSketchDocument(nextDocument) }
                : layer,
            ),
          },
    );
    sketchSessionSnapshotRef.current = null;
    sketchLatestDocumentRef.current = cloneSketchDocument(nextDocument);
    setSketchMode(false);
  };

  const cancelSketch = () => {
    const snapshot = sketchSessionSnapshotRef.current;
    if (snapshot) {
      saveSketchDocument(activeSketchStorageKey, snapshot);
      sketchLatestDocumentRef.current = cloneSketchDocument(snapshot);
    }
    sketchSessionSnapshotRef.current = null;
    setSketchSessionKey((value) => value + 1);
    setSketchMode(false);
  };

  const addSketchLayer = () => {
    const id = createSketchId('sketch-layer');
    const name = `${t('facilityMap.sketch')} ${plan.sketches.length + 2}`;
    const document = createSketchDocument({
      displayUnit: plan.sketchDocument?.displayUnit,
      mmPerUnit: plan.sketchDocument?.mmPerUnit,
    });
    commitPlan((current) => ({
      ...current,
      sketches: [...current.sketches, { id, name, visible: true, document }],
    }));
  };

  const renameSketchLayer = (id: string) => {
    const layer = plan.sketches.find((item) => item.id === id);
    if (!layer) return;
    const nextName = window.prompt(t('facilityMap.sketchRename'), layer.name);
    if (!nextName || !nextName.trim()) return;
    commitPlan((current) => ({
      ...current,
      sketches: current.sketches.map((item) =>
        item.id === id ? { ...item, name: nextName.trim() } : item,
      ),
    }));
  };

  const deleteSketchLayer = (id: string) => {
    if (!window.confirm(t('facilityMap.sketchDeleteConfirm'))) return;
    commitPlan((current) => ({
      ...current,
      sketches: current.sketches.filter((item) => item.id !== id),
    }));
    if (activeSketchId === id) {
      setSketchMode(false);
      setActiveSketchId(DEFAULT_SKETCH_ID);
    }
  };

  const toggleSketchLayerVisible = (id: string) => {
    if (id === DEFAULT_SKETCH_ID) {
      setSketchVisible((value) => !value);
      return;
    }
    commitPlan((current) => ({
      ...current,
      sketches: current.sketches.map((item) =>
        item.id === id ? { ...item, visible: !item.visible } : item,
      ),
    }));
  };

  const deselectSketch = (id: string) => {
    setSelectedObjectIds((current) => {
      if (!current.has(`sketch:${id}`)) return current;
      const next = new Set(current);
      next.delete(`sketch:${id}`);
      return next;
    });
  };

  const toggleSketchLayerLock = (id: string) => {
    if (id === DEFAULT_SKETCH_ID) {
      const next = !sketchLocked;
      commitPlan((current) => ({ ...current, sketchLocked: next }));
      // A lock that just engaged can't also leave the layer selected —
      // otherwise a still-selected-but-locked sketch could get dragged
      // along by a leftover multi-select group-move.
      if (next) deselectSketch(DEFAULT_SKETCH_ID);
      return;
    }
    const target = plan.sketches.find((item) => item.id === id);
    if (!target) return;
    const next = !target.locked;
    commitPlan((current) => ({
      ...current,
      sketches: current.sketches.map((item) =>
        item.id === id ? { ...item, locked: next } : item,
      ),
    }));
    if (next) deselectSketch(id);
  };

  const switchMode = (nextEditMode: boolean) => {
    if (nextEditMode === editMode) return;

    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      viewportTransitionRef.current = {
        stagePageX: rect.left + fitTransform.x + pan.x,
        stagePageY: rect.top + fitTransform.y + pan.y,
        scale: effectiveScale,
      };
    }

    setEditMode(nextEditMode);
    if (!nextEditMode) {
      setMobilePanelOpen(false);
      if (sketchMode) cancelSketch();
    }
    setSelectedEquipmentId('');
    setPlaceLayer(null);
    setZoneTool(null);
    setZoneStart(null);
    setDraftZone(null);
    setDrawTool('select');

    // Wait until the sidebar/grid layout has fully changed, then rebuild the
    // base fit transform while preserving the exact on-screen drawing camera.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const snapshot = viewportTransitionRef.current;
        const nextCanvas = canvasRef.current;
        if (!snapshot || !nextCanvas) {
          viewportTransitionRef.current = null;
          recalculateFit();
          return;
        }

        const rect = nextCanvas.getBoundingClientRect();
        const horizontalPadding = 32;
        const verticalPadding = 32;
        const availableWidth = Math.max(1, rect.width - horizontalPadding * 2);
        const availableHeight = Math.max(1, rect.height - verticalPadding * 2);
        const nextFitScale = Math.min(
          availableWidth / Math.max(1, plan.canvasWidth),
          availableHeight / Math.max(1, plan.canvasHeight),
        );
        const renderedWidth = plan.canvasWidth * nextFitScale;
        const renderedHeight = plan.canvasHeight * nextFitScale;
        const nextFit = {
          scale: nextFitScale,
          x: (rect.width - renderedWidth) / 2,
          y: (rect.height - renderedHeight) / 2,
        };

        const nextZoom = Math.max(0.25, Math.min(6, snapshot.scale / Math.max(nextFit.scale, 0.0001)));
        setFitTransform(nextFit);
        setZoom(nextZoom);
        setPan({
          x: snapshot.stagePageX - rect.left - nextFit.x,
          y: snapshot.stagePageY - rect.top - nextFit.y,
        });
        viewportTransitionRef.current = null;
      });
    });
  };

  useEffect(() => {
    const main = document.getElementById('main-content');
    const previousOverflow = main?.style.overflow;
    if (main) main.style.overflow = 'hidden';
    return () => {
      if (main) main.style.overflow = previousOverflow ?? '';
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.matches('input, textarea, select, [contenteditable="true"]')) return;
      if (target?.closest('[role="dialog"]')) {
        // Keep the browser's own help page from opening over a dialog.
        if (event.key === 'F1') event.preventDefault();
        return;
      }
      // In Sketch mode the overlay owns the keyboard (Esc, Ctrl+Z/Y, Delete,
      // tool letters, ? / F1). Handling them here too ran plan-level undo on
      // top of sketch undo, and plan undo re-seeds the sketch session — wiping
      // the in-progress sketch and its redo stack. Only fit-view stays global.
      if (sketchMode && (event.key.toLowerCase() !== 'f' || event.ctrlKey || event.metaKey)) return;
      if (event.key === 'F1' || (event.key === '?' && !event.ctrlKey && !event.metaKey)) {
        event.preventDefault();
        openGuide();
        return;
      }
      if (event.key === 'Escape') {
        setSelectedEquipmentId('');
        setSelectedMarkerId('');
        setSelectedObjectIds(new Set());
        setSelectionBox(null);
        setPlaceLayer(null);
        setZoneTool(null);
        setDrawTool('select');
        setDraftZone(null);
        setDraftAnnotation(null);
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo(); else undo();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
        return;
      }
      if (event.key.toLowerCase() === 'f' && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        fitView();
        return;
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && (selectedMarkerId || selectedObjectIds.size) && editMode) {
        event.preventDefault();
        deleteSelected();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const visibleAssetPins = !hiddenLayers.has('assets');
  const visibleOverlayPins = emergencyMode
    ? plan.overlayPins.filter((pin) => !hiddenLayers.has(pin.layer) && (pin.layer === 'fire' || pin.layer === 'emergency'))
    : plan.overlayPins.filter((pin) => !hiddenLayers.has(pin.layer));

  const placementHint = selectedEquipmentId
    ? t('facilityMap.clickPlaceEquipment')
    : placeLayer
      ? t('facilityMap.clickPlaceMarker', { name: t(layerById.get(placeLayer)?.labelKey ?? 'facilityMap.utility') })
      : zoneTool
        ? t('facilityMap.dragDrawZone', { name: t(zoneById.get(zoneTool)?.labelKey ?? 'facilityMap.custom') })
        : '';

  return (
    <div className={`flex h-full min-h-0 flex-col overflow-hidden bg-background ${isFullscreen ? 'fixed inset-0 z-[100] h-svh' : ''}`}>
      {!isFullscreen && (
      <div className="shrink-0 border-b bg-card px-4 py-3 md:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="mr-auto">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1 shrink-0" />
              <Building2 className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">{t('facilityMap.title')}</h1>
              <span className="rounded-full border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                {t('facilityMap.prototypeBadge')}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{t('facilityMap.subtitle')}</p>
          </div>

          <div className="flex items-center rounded-md border bg-background p-1">
            <button
              type="button"
              onClick={() => switchMode(false)}
              className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs ${!editMode ? 'bg-foreground text-background' : 'hover:bg-accent'}`}
            >
              <Eye className="h-3.5 w-3.5" />
              {t('facilityMap.viewMode')}
            </button>
            <button
              type="button"
              onClick={() => {
                switchMode(true);
                setMobilePanelOpen(true);
              }}
              className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs ${editMode ? 'bg-foreground text-background' : 'hover:bg-accent'}`}
            >
              <Pencil className="h-3.5 w-3.5" />
              {t('facilityMap.editMode')}
            </button>
          </div>

          <button
            type="button"
            onClick={undo}
            disabled={!undoStack.length}
            className="rounded-md border p-2 disabled:cursor-not-allowed disabled:opacity-40"
            title={t('facilityMap.undo')}
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!redoStack.length}
            className="rounded-md border p-2 disabled:cursor-not-allowed disabled:opacity-40"
            title={t('facilityMap.redo')}
          >
            <Redo2 className="h-4 w-4" />
          </button>

          {editMode && (
            <button
              type="button"
              onClick={() => {
                if (isMobileViewport) return;
                if (sketchMode) finishSketch();
                else enterSketch();
              }}
              disabled={isMobileViewport}
              title={isMobileViewport ? t('facilityMap.sketchReadOnlyMobile') : undefined}
              className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 ${
                sketchMode ? 'border-sky-400 bg-sky-500/15 text-sky-300' : 'hover:bg-accent'
              }`}
            >
              <Ruler className="h-4 w-4" />
              {sketchMode ? t('facilityMap.finishSketch') : t('facilityMap.enterSketch')}
            </button>
          )}

          <button
            type="button"
            onClick={openGuide}
            className="relative inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent"
            title={`${t('facilityMap.guide.title')} (F1)`}
          >
            <CircleHelp className="h-4 w-4" />
            {t('facilityMap.openGuide')}
            {!guideSeen && (
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-sky-500 ring-2 ring-background" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setSketchVisible((value) => !value)}
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
              sketchVisible ? 'border-cyan-400/40 text-cyan-300' : 'text-muted-foreground'
            }`}
            title={t('facilityMap.sketchToggleLayer')}
          >
            <Eye className="h-4 w-4" />
            {t('facilityMap.sketch')}
          </button>

          <button
            type="button"
            onClick={() => setCanvasHudVisible((value) => !value)}
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
              canvasHudVisible ? 'border-cyan-400/40 text-cyan-300' : 'text-muted-foreground'
            }`}
            title={t('facilityMap.canvasHudToggle')}
          >
            {canvasHudVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            HUD
          </button>

          {editMode && !sketchMode && (
            <div className="max-w-[70vw] overflow-x-auto rounded-md border bg-background p-1">
              <div className="flex min-w-max items-center gap-1">
              {([
                ['select', MousePointer2, 'facilityMap.toolSelect'],
                ['pan', Move, 'facilityMap.toolPan'],
                ['line', Minus, 'facilityMap.toolLine'],
                ['arrow', ArrowRight, 'facilityMap.toolArrow'],
                ['rect', Square, 'facilityMap.toolRectangle'],
                ['circle', Circle, 'facilityMap.toolCircle'],
                ['text', Type, 'facilityMap.toolText'],
                ['ruler', Ruler, 'facilityMap.toolRuler'],
                ['erase', Eraser, 'facilityMap.toolErase'],
              ] as const).map(([tool, Icon, key]) => (
                <button
                  key={tool}
                  type="button"
                  onClick={() => {
                    setDrawTool(tool);
                    setPlaceLayer(null);
                    setZoneTool(null);
                    setSelectedEquipmentId('');
                  }}
                  className={`rounded p-1.5 ${drawTool === tool ? 'bg-foreground text-background' : 'hover:bg-accent'}`}
                  title={t(key)}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setPlanManagerOpen(true)}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent"
            title={t('facilityMap.allPlans')}
          >
            <LayoutGrid className="h-4 w-4" />
            {t('facilityMap.plans')}
          </button>

          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent"
            title={t('facilityMap.history')}
          >
            <History className="h-4 w-4" />
            {t('facilityMap.history')}
          </button>

          <button
            type="button"
            onClick={() => setEmergencyMode((value) => !value)}
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
              emergencyMode ? 'border-red-500 bg-red-500/15 text-red-500' : 'hover:bg-accent'
            }`}
            title={t('facilityMap.emergencyMode')}
          >
            <Siren className="h-4 w-4" />
            {t('facilityMap.emergencyMode')}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent"
            title={t('facilityMap.print')}
          >
            <Printer className="h-4 w-4" />
            {t('facilityMap.print')}
          </button>

          {editMode && (
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent">
              <ImagePlus className="h-4 w-4" />
              {t('facilityMap.uploadPlan')}
              <input
                className="hidden"
                type="file"
                accept="image/*,.svg,image/svg+xml"
                onChange={(event) => uploadPlan(event.target.files?.[0])}
              />
            </label>
          )}

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent"
            onClick={() => savePlan(plan)}
          >
            <Save className="h-4 w-4" />
            {t('facilityMap.save')}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowLegend((value) => !value)}
            className="mr-1 inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs"
          >
            <ListFilter className="h-3.5 w-3.5" />
            {t('facilityMap.legend')}
          </button>
          <button
            type="button"
            onClick={() => setShowGrid((value) => !value)}
            className={`rounded-full border px-3 py-1.5 text-xs ${showGrid ? 'bg-foreground text-background' : 'bg-background'}`}
          >
            {t('facilityMap.grid')}
          </button>
          <button
            type="button"
            onClick={() => setSnapToGrid((value) => !value)}
            className={`rounded-full border px-3 py-1.5 text-xs ${snapToGrid ? 'bg-foreground text-background' : 'bg-background'}`}
          >
            {t('facilityMap.snap')}
          </button>
          <button
            type="button"
            onClick={selectAllLayers}
            className={`rounded-full border px-3 py-1.5 text-xs ${hiddenLayers.size === 0 ? 'bg-foreground text-background' : 'bg-background'}`}
          >
            {t('facilityMap.all')}
          </button>
          {LAYERS.map((layer) => (
            <button
              key={layer.id}
              type="button"
              onClick={() => setLayerVisible(layer.id, hiddenLayers.has(layer.id))}
              className={`rounded-full border px-3 py-1.5 text-xs ${!hiddenLayers.has(layer.id) ? 'ring-2 ring-ring' : 'opacity-45'}`}
              style={{ borderColor: layer.color, color: layer.color }}
            >
              {layer.emoji} {t(layer.labelKey)}
            </button>
          ))}
        </div>
      </div>
      )}

      <div className={`relative grid min-h-0 flex-1 overflow-hidden grid-cols-1 ${editMode ? 'lg:grid-cols-[300px_minmax(0,1fr)]' : 'lg:grid-cols-1'}`}>
        {editMode && (
          <aside className={`absolute inset-y-0 left-0 z-40 w-[min(86vw,320px)] min-h-0 overflow-y-auto overscroll-contain border-r bg-card p-3 shadow-2xl transition-transform lg:static lg:z-auto lg:w-auto lg:translate-x-0 lg:shadow-none ${
            mobilePanelOpen ? 'translate-x-0' : '-translate-x-full'
          }`}>
            <div className="mb-3 flex items-center justify-between lg:hidden">
              <div className="text-xs font-semibold">{t('facilityMap.editMode')}</div>
              <button
                type="button"
                onClick={() => setMobilePanelOpen(false)}
                className="rounded-md border px-2 py-1 text-xs"
              >
                ×
              </button>
            </div>
            <div className="mb-2 text-xs font-semibold">{t('facilityMap.location')}</div>
            <div className="mb-4 grid grid-cols-2 gap-2">
              <select
                value={plan.building}
                onChange={(event) => switchDemoLocation(event.target.value, plan.floor)}
                className="rounded-md border bg-background px-2 py-2 text-xs"
                aria-label={t('facilityMap.building')}
              >
                {DEMO_BUILDINGS.map((building) => (
                  <option key={building} value={building}>{t(buildingTranslationKey(building))}</option>
                ))}
              </select>
              <select
                value={plan.floor}
                onChange={(event) => switchDemoLocation(plan.building, event.target.value)}
                className="rounded-md border bg-background px-2 py-2 text-xs"
                aria-label={t('facilityMap.floor')}
              >
                {DEMO_FLOORS.map((floor) => (
                  <option key={floor} value={floor}>{t(floorTranslationKey(floor))}</option>
                ))}
              </select>
            </div>

            <div className="mb-2 text-xs font-semibold">{t('facilityMap.placeEquipment')}</div>
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('facilityMap.searchEquipment')}
                className="w-full rounded-md border bg-background py-2 pl-8 pr-2 text-sm"
              />
            </div>

            <div className="max-h-48 space-y-1 overflow-auto pr-1">
              {unplacedEquipment.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={hiddenLayers.has('assets')}
                  onClick={() => {
                    setSelectedEquipmentId(item.id);
                    setPlaceLayer(null);
                    setZoneTool(null);
                    setDrawTool('select');
                  }}
                  className={`w-full rounded-md border px-3 py-2 text-left transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40 ${
                    selectedEquipmentId === item.id ? 'border-primary bg-primary/10' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: statusColor(item.status) }}
                    />
                    <span className="truncate text-sm font-medium">{item.name || item.id}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-4 border-t pt-3">
              <div className="mb-2 text-xs font-semibold">{t('facilityMap.safetyUtilityMarkers')}</div>
              <div className="grid grid-cols-2 gap-1.5">
                {LAYERS.filter((layer) => layer.id !== 'assets').map((layer) => (
                  <button
                    key={layer.id}
                    type="button"
                    disabled={hiddenLayers.has(layer.id)}
                    onClick={() => {
                      setPlaceLayer(layer.id as LayerId);
                      setSelectedEquipmentId('');
                      setZoneTool(null);
                      setDrawTool('select');
                    }}
                    className={`rounded-md border px-2 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-35 ${
                      placeLayer === layer.id ? 'ring-2 ring-ring' : ''
                    }`}
                    style={{ borderColor: layer.color, color: layer.color }}
                  >
                    {layer.emoji} {t(layer.labelKey)}
                  </button>
                ))}
              </div>
              <div className="mt-2 text-[10px] text-muted-foreground">{t('facilityMap.layerEditHint')}</div>
            </div>

            <div className="mt-4 border-t pt-3">
              <div className="mb-2 text-xs font-semibold">{t('facilityMap.layerVisibility')}</div>
              <div className="space-y-1.5">
                {LAYERS.map((layer) => (
                  <div key={layer.id} className="flex items-center justify-between rounded-md border px-2 py-1.5 text-xs">
                    <span className="flex items-center gap-2">
                      <span>{layer.emoji}</span>
                      <span>{t(layer.labelKey)}</span>
                    </span>
                    <input
                      type="checkbox"
                      aria-label={t(layer.labelKey)}
                      checked={!hiddenLayers.has(layer.id)}
                      onChange={() => setLayerVisible(layer.id, hiddenLayers.has(layer.id))}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <label className="flex flex-1 items-center justify-between rounded-md border px-2 py-1.5 text-xs">
                  <span>{t('facilityMap.gridSize')}</span>
                  <select
                    value={gridSize}
                    onChange={(event) => setGridSize(Number(event.target.value))}
                    className="min-w-[88px] rounded-md border border-border bg-background px-2 py-1 text-right text-xs text-foreground shadow-sm outline-none focus:ring-2 focus:ring-ring"
                  >
                    {[0.5, 1, 2, 3, 4, 5, 10, 15, 20, 25].map((size) => (
                      <option
                        key={size}
                        value={size}
                        className="bg-background text-foreground"
                      >
                        {size}%
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {editMode && !sketchMode && (
            <div className="mt-4 border-t pt-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold">{t('facilityMap.sketches')}</span>
                <button
                  type="button"
                  onClick={addSketchLayer}
                  className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] hover:bg-accent"
                >
                  <Plus className="h-3 w-3" />
                  {t('facilityMap.addSketch')}
                </button>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between rounded-md border px-2 py-1.5 text-xs">
                  <label className="flex flex-1 items-center gap-2">
                    <input
                      type="checkbox"
                      checked={sketchVisible}
                      onChange={() => toggleSketchLayerVisible(DEFAULT_SKETCH_ID)}
                    />
                    <span className="truncate">{t('facilityMap.sketchDefaultName')}</span>
                  </label>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggleSketchLayerLock(DEFAULT_SKETCH_ID)}
                      className={`rounded-md p-1 hover:bg-accent ${sketchLocked ? 'text-amber-500' : ''}`}
                      title={sketchLocked ? t('facilityMap.sketchUnlock') : t('facilityMap.sketchLock')}
                    >
                      {sketchLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => enterSketch(DEFAULT_SKETCH_ID)}
                      disabled={isMobileViewport || sketchLocked}
                      className="rounded-md p-1 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                      title={t('facilityMap.sketchEdit')}
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                {plan.sketches.map((layer) => (
                  <div key={layer.id} className="flex items-center justify-between rounded-md border px-2 py-1.5 text-xs">
                    <label className="flex flex-1 items-center gap-2 overflow-hidden">
                      <input
                        type="checkbox"
                        checked={layer.visible}
                        onChange={() => toggleSketchLayerVisible(layer.id)}
                      />
                      <span className="truncate">{layer.name}</span>
                    </label>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleSketchLayerLock(layer.id)}
                        className={`rounded-md p-1 hover:bg-accent ${layer.locked ? 'text-amber-500' : ''}`}
                        title={layer.locked ? t('facilityMap.sketchUnlock') : t('facilityMap.sketchLock')}
                      >
                        {layer.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => enterSketch(layer.id)}
                        disabled={isMobileViewport || layer.locked}
                        className="rounded-md p-1 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                        title={t('facilityMap.sketchEdit')}
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => renameSketchLayer(layer.id)}
                        className="rounded-md p-1 hover:bg-accent"
                        title={t('facilityMap.sketchRename')}
                      >
                        <Type className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteSketchLayer(layer.id)}
                        disabled={layer.locked}
                        className="rounded-md p-1 text-red-500 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                        title={t('facilityMap.sketchDelete')}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
                {!plan.sketches.length && (
                  <div className="rounded-md border border-dashed px-2 py-2 text-center text-[10px] text-muted-foreground">
                    {t('facilityMap.noAdditionalSketches')}
                  </div>
                )}
              </div>
            </div>
            )}

            {!sketchMode && (
            <div className="mt-4 border-t pt-3">
              <div className="mb-2 text-xs font-semibold">{t('facilityMap.drawingTools')}</div>
              <div className="rounded-md border bg-muted/30 p-2 text-[11px] text-muted-foreground">
                {t('facilityMap.drawingHint')}
              </div>
              {['line', 'arrow', 'rect', 'circle', 'text', 'ruler'].includes(drawTool) && (
                <div className="mt-2 rounded-md border p-2">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('facilityMap.currentProperties')}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center justify-between gap-2 text-[11px]">
                    <span>{t('facilityMap.annotationColor')}</span>
                    <input
                      type="color"
                      value={currentDrawingPreset.color}
                      onChange={(event) => updateCurrentDrawingPreset({ color: event.target.value })}
                      className="h-7 w-10 rounded border bg-background"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-2 text-[11px]">
                    <span>{t('facilityMap.lineWeight')}</span>
                    <select
                      value={currentDrawingPreset.lineWidth}
                      onChange={(event) => updateCurrentDrawingPreset({ lineWidth: Number(event.target.value) })}
                      className="rounded border bg-background px-1.5 py-1 text-xs text-foreground"
                    >
                      {[0.15, 0.2, 0.28, 0.35, 0.5, 0.75, 1].map((width) => (
                        <option key={width} value={width}>{width}</option>
                      ))}
                    </select>
                  </label>
                  {drawTool === 'arrow' && (
                    <label className="col-span-2 flex items-center justify-between gap-2 text-[11px]">
                      <span>{t('facilityMap.arrowSize')}</span>
                      <select
                        value={currentDrawingPreset.arrowSize}
                        onChange={(event) => updateCurrentDrawingPreset({ arrowSize: Number(event.target.value) })}
                        className="rounded border bg-background px-1.5 py-1 text-xs text-foreground"
                      >
                        {[4, 5, 6, 8, 10, 12].map((size) => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  {(drawTool === 'text' || drawTool === 'ruler') && (
                    <label className="col-span-2 flex items-center justify-between gap-2 text-[11px]">
                      <span>{t('facilityMap.textSize')}</span>
                      <select
                        value={currentDrawingPreset.textSize}
                        onChange={(event) => updateCurrentDrawingPreset({ textSize: Number(event.target.value) })}
                        className="rounded border bg-background px-1.5 py-1 text-xs text-foreground"
                      >
                        {[1.5, 2, 2.5, 3, 4, 5, 6, 8].map((size) => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
                </div>
              )}
              {drawTool === 'text' && (
                <input
                  value={currentDrawingPreset.text}
                  onChange={(event) => updateCurrentDrawingPreset({ text: event.target.value })}
                  className="mt-2 w-full rounded-md border bg-background px-2 py-2 text-xs"
                  placeholder={t('facilityMap.textPlaceholder')}
                />
              )}
            </div>
            )}

            {!sketchMode && (
            <div className="mt-4 border-t pt-3">
              <div className="mb-2 text-xs font-semibold">{t('facilityMap.drawZones')}</div>
              <div className="grid grid-cols-2 gap-1.5">
                {ZONES.map((zone) => (
                  <button
                    key={zone.id}
                    type="button"
                    onClick={() => {
                      setZoneTool(zone.id);
                      setSelectedEquipmentId('');
                      setPlaceLayer(null);
                      setDrawTool('select');
                    }}
                    className={`rounded-md border px-2 py-2 text-xs ${
                      zoneTool === zone.id ? 'ring-2 ring-ring' : ''
                    }`}
                    style={{ borderColor: zone.color, color: zone.color }}
                  >
                    {zone.emoji} {t(zone.labelKey)}
                  </button>
                ))}
              </div>
            </div>
            )}

            {placementHint && !sketchMode && (
              <div className="mt-3 rounded-md border border-primary/40 bg-primary/5 p-2 text-xs">
                <MapPin className="mr-1 inline h-3.5 w-3.5" />
                {placementHint}
              </div>
            )}

            {selectedZone && (
              <div className="mt-3 rounded-md border p-2">
                <div className="mb-2 text-xs font-semibold">{t('facilityMap.zoneEditor')}</div>
                <input
                  value={selectedZone.customLabel ?? ''}
                  onChange={(event) => commitPlan((current) => ({
                    ...current,
                    zones: current.zones.map((zone) =>
                      zone.id === selectedZone.id ? { ...zone, customLabel: event.target.value } : zone,
                    ),
                  }))}
                  placeholder={t('facilityMap.zoneName')}
                  className="mb-2 w-full rounded-md border bg-background px-2 py-1.5 text-xs"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={selectedZone.customColor ?? zoneById.get(selectedZone.type)?.color ?? '#64748b'}
                    onChange={(event) => commitPlan((current) => ({
                      ...current,
                      zones: current.zones.map((zone) =>
                        zone.id === selectedZone.id ? { ...zone, customColor: event.target.value } : zone,
                      ),
                    }))}
                    className="h-8 w-10 rounded border bg-background"
                    aria-label={t('facilityMap.zoneColor')}
                  />
                  <select
                    value={selectedZone.type}
                    onChange={(event) => commitPlan((current) => ({
                      ...current,
                      zones: current.zones.map((zone) =>
                        zone.id === selectedZone.id ? { ...zone, type: event.target.value as ZoneType } : zone,
                      ),
                    }))}
                    className="flex-1 rounded-md border bg-background px-2 py-1.5 text-xs"
                  >
                    {ZONES.map((zone) => (
                      <option key={zone.id} value={zone.id}>{t(zone.labelKey)}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {selectedOverlay && (
              <div className="mt-3 rounded-md border p-2">
                <div className="mb-2 text-xs font-semibold">{t('facilityMap.markerEditor')}</div>
                <input
                  value={selectedOverlay.label ?? ''}
                  onChange={(event) => commitPlan((current) => ({
                    ...current,
                    overlayPins: current.overlayPins.map((pin) =>
                      pin.id === selectedOverlay.id ? { ...pin, label: event.target.value } : pin,
                    ),
                  }))}
                  placeholder={t('facilityMap.markerLabel')}
                  className="w-full rounded-md border bg-background px-2 py-1.5 text-xs"
                />
              </div>
            )}

            {selectedMarkerId && (
              <button
                type="button"
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-destructive/40 px-3 py-2 text-xs text-destructive hover:bg-destructive/10"
                onClick={deleteSelected}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t('facilityMap.deleteSelected')}
              </button>
            )}
          </aside>
        )}

        <section className="relative h-full min-h-0 min-w-0 overflow-hidden bg-slate-950">
          {editMode && (
            <button
              type="button"
              onClick={() => setMobilePanelOpen(true)}
              className="absolute left-3 top-3 z-30 rounded-md border border-white/15 bg-black/70 px-3 py-2 text-xs text-white backdrop-blur lg:hidden"
            >
              {t('facilityMap.editMode')}
            </button>
          )}
          {compareSnapshot && (
            <div className="absolute right-3 top-14 z-30 rounded-md border border-violet-400/40 bg-violet-500/20 px-3 py-2 text-xs text-violet-100 backdrop-blur">
              <GitCompare className="mr-1 inline h-3.5 w-3.5" />
              {t('facilityMap.comparingVersion')}
            </div>
          )}

          {emergencyMode && (
            <div className="absolute left-1/2 top-14 z-30 -translate-x-1/2 rounded-full border border-red-400/50 bg-red-600/90 px-5 py-2 text-xs font-bold tracking-[0.2em] text-white shadow-2xl">
              {t('facilityMap.emergencyModeActive')}
            </div>
          )}

          {canvasHudVisible && !sketchMode && (
            <div className="absolute left-1/2 top-3 z-20 hidden -translate-x-1/2 items-center gap-1 rounded-lg border border-white/10 bg-black/65 p-1 backdrop-blur md:flex">
              {DEMO_FLOORS.map((floor) => (
                <button
                  key={floor}
                  type="button"
                  onClick={() => switchDemoLocation(plan.building, floor)}
                  className={`rounded-md px-3 py-1.5 text-[11px] transition ${
                    plan.floor === floor ? 'bg-white text-slate-950' : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {t(floorTranslationKey(floor))}
                </button>
              ))}
            </div>
          )}

          {canvasHudVisible && !sketchMode && (
            <div className="absolute left-3 top-3 z-20 flex flex-wrap items-center gap-2">
              <div className="rounded-md border border-white/10 bg-black/60 px-3 py-2 text-xs text-white backdrop-blur">
                {t(buildingTranslationKey(plan.building))} · {t(floorTranslationKey(plan.floor))}
              </div>
              <div className="rounded-md border border-white/10 bg-black/60 px-3 py-2 text-xs text-white backdrop-blur">
                <Layers3 className="mr-1 inline h-3.5 w-3.5" />
                {t('facilityMap.itemsSummary', { assets: plan.pins.length, markers: plan.overlayPins.length, zones: plan.zones.length })}
              </div>
              {selectedObjectIds.size > 1 && (
                <div className="rounded-md border border-sky-400/40 bg-sky-500/15 px-3 py-2 text-xs text-sky-100 backdrop-blur">
                  {t('facilityMap.selectedCount', { count: selectedObjectIds.size })}
                </div>
              )}
              <div className={`rounded-md border px-3 py-2 text-xs backdrop-blur ${
                editMode ? 'border-amber-400/30 bg-amber-500/15 text-amber-200' : 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200'
              }`}>
                {editMode ? t('facilityMap.editing') : t('facilityMap.viewing')}
              </div>
            </div>
          )}

          {showLegend && (
            <div className="absolute bottom-20 right-3 z-[25] w-56 rounded-xl border border-white/10 bg-slate-950/85 p-3 text-white shadow-xl backdrop-blur">
              <div className="mb-2 text-xs font-semibold">{t('facilityMap.legend')}</div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px]">
                {[
                  ['#22c55e', t('facilityMap.statusActive')],
                  ['#eab308', t('facilityMap.statusMaintenance')],
                  ['#94a3b8', t('facilityMap.statusInactive')],
                  ['#ef4444', t('facilityMap.statusRetired')],
                ].map(([color, label]) => (
                  <div key={String(label)} className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: String(color) }} />
                    <span className="truncate text-slate-300">{label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-white/10 pt-2 text-[10px]">
                {ZONES.slice(0, 6).map((zone) => (
                  <div key={zone.id} className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: zone.color }} />
                    <span className="truncate text-slate-300">{t(zone.labelKey)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="absolute bottom-20 left-3 z-20 h-28 w-44 overflow-hidden rounded-lg border border-white/10 bg-white shadow-xl">
            <div className="absolute inset-0 bg-slate-100">
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {plan.annotations.map((annotation) => {
              const color = annotation.color ?? (annotation.type === 'ruler' ? '#22d3ee' : '#f43f5e');
              if (annotation.type === 'line' || annotation.type === 'arrow' || annotation.type === 'ruler') {
                return (
                  <line
                    key={annotation.id}
                    x1={annotation.x1}
                    y1={annotation.y1}
                    x2={annotation.x2}
                    y2={annotation.y2}
                    stroke={color}
                    strokeWidth={annotation.lineWidth ?? 0.35}
                    strokeDasharray={annotation.type === 'ruler' ? '1 0.7' : undefined}
                    vectorEffect="non-scaling-stroke"
                  />
                );
              }
              if (annotation.type === 'rect') {
                return (
                  <rect
                    key={annotation.id}
                    x={Math.min(annotation.x1, annotation.x2)}
                    y={Math.min(annotation.y1, annotation.y2)}
                    width={Math.abs(annotation.x2 - annotation.x1)}
                    height={Math.abs(annotation.y2 - annotation.y1)}
                    fill={`${color}18`}
                    stroke={color}
                    strokeWidth={annotation.lineWidth ?? 0.35}
                    vectorEffect="non-scaling-stroke"
                  />
                );
              }
              if (annotation.type === 'circle') {
                return (
                  <ellipse
                    key={annotation.id}
                    cx={(annotation.x1 + annotation.x2) / 2}
                    cy={(annotation.y1 + annotation.y2) / 2}
                    rx={Math.abs(annotation.x2 - annotation.x1) / 2}
                    ry={Math.abs(annotation.y2 - annotation.y1) / 2}
                    fill={`${color}18`}
                    stroke={color}
                    strokeWidth={annotation.lineWidth ?? 0.35}
                    vectorEffect="non-scaling-stroke"
                  />
                );
              }
              return (
                <text
                  key={annotation.id}
                  x={annotation.x1}
                  y={annotation.y1}
                  fill={color}
                  fontSize={annotation.textSize ?? 2.5}
                  fontWeight="700"
                >
                  {annotation.text}
                </text>
              );
            })}
          </svg>
          {plan.zones.map((zone) => (
                <div
                  key={zone.id}
                  className="absolute rounded-[2px]"
                  style={{
                    left: `${zone.x}%`,
                    top: `${zone.y}%`,
                    width: `${zone.w}%`,
                    height: `${zone.h}%`,
                    backgroundColor: `${zone.customColor ?? zoneById.get(zone.type)?.color ?? '#64748b'}35`,
                    border: `1px solid ${zone.customColor ?? zoneById.get(zone.type)?.color ?? '#64748b'}`,
                  }}
                />
              ))}
              {plan.pins.map((pin) => (
                <span
                  key={pin.equipmentId}
                  className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-900"
                  style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                />
              ))}
              <div
                className="absolute border-2 border-sky-500/80 bg-sky-400/10"
                style={{
                  left: `${Math.max(0, Math.min(82, 8 - pan.x / 80))}%`,
                  top: `${Math.max(0, Math.min(72, 8 - pan.y / 80))}%`,
                  width: `${Math.max(18, 84 / zoom)}%`,
                  height: `${Math.max(22, 84 / zoom)}%`,
                }}
              />
            </div>
            <div className="absolute left-1 top-1 rounded bg-black/65 px-1.5 py-0.5 text-[9px] text-white">
              {t('facilityMap.miniMap')}
            </div>
          </div>

          {editMode && selectedObjectIds.size > 1 && (
            <div className="absolute right-3 top-3 z-30 w-72 rounded-xl border border-sky-400/30 bg-slate-950/92 p-4 text-white shadow-2xl backdrop-blur">
              <div className="mb-2 text-sm font-semibold">{t('facilityMap.selectionSet')}</div>
              <div className="text-xs text-slate-300">{t('facilityMap.selectedCount', { count: selectedObjectIds.size })}</div>
              <p className="mt-2 text-[11px] text-slate-400">{t('facilityMap.selectionMoveHint')}</p>
              <button
                type="button"
                onClick={() => deleteObjectsByIds(selectedObjectIds)}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-red-400/30 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t('facilityMap.deleteSelected')}
              </button>
            </div>
          )}

          {editMode && selectedObjectIds.size <= 1 && (selectedZone || selectedOverlay || selectedAnnotation) && (
            <div className="absolute right-3 top-3 z-30 w-72 max-h-[calc(100%_-_6rem)] overflow-auto rounded-xl border border-white/10 bg-slate-950/92 p-4 text-white shadow-2xl backdrop-blur">
              <div className="mb-3 text-sm font-semibold">{t('facilityMap.properties')}</div>

              {selectedZone && (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-[11px] text-slate-400">{t('facilityMap.zoneName')}</label>
                    <input
                      value={selectedZone.customLabel ?? ''}
                      onChange={(event) => commitPlan((current) => ({
                        ...current,
                        zones: current.zones.map((zone) => zone.id === selectedZone.id ? { ...zone, customLabel: event.target.value } : zone),
                      }))}
                      className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-2 text-xs"
                      placeholder={t('facilityMap.zoneName')}
                    />
                  </div>
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <select
                      value={selectedZone.type}
                      onChange={(event) => commitPlan((current) => ({
                        ...current,
                        zones: current.zones.map((zone) => zone.id === selectedZone.id ? { ...zone, type: event.target.value as ZoneType } : zone),
                      }))}
                      className="rounded-md border border-white/10 bg-slate-900 px-2 py-2 text-xs"
                    >
                      {ZONES.map((zone) => <option key={zone.id} value={zone.id}>{t(zone.labelKey)}</option>)}
                    </select>
                    <input
                      type="color"
                      value={selectedZone.customColor ?? zoneById.get(selectedZone.type)?.color ?? '#64748b'}
                      onChange={(event) => commitPlan((current) => ({
                        ...current,
                        zones: current.zones.map((zone) => zone.id === selectedZone.id ? { ...zone, customColor: event.target.value } : zone),
                      }))}
                      className="h-9 w-11 rounded-md border border-white/10 bg-transparent"
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-1 text-[10px] text-slate-400">
                    <div className="rounded bg-white/5 p-2">X<br/><span className="text-white">{selectedZone.x.toFixed(1)}</span></div>
                    <div className="rounded bg-white/5 p-2">Y<br/><span className="text-white">{selectedZone.y.toFixed(1)}</span></div>
                    <div className="rounded bg-white/5 p-2">W<br/><span className="text-white">{selectedZone.w.toFixed(1)}</span></div>
                    <div className="rounded bg-white/5 p-2">H<br/><span className="text-white">{selectedZone.h.toFixed(1)}</span></div>
                  </div>
                </div>
              )}

              {selectedOverlay && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{layerById.get(selectedOverlay.layer)?.emoji}</span>
                    <span className="text-xs">{t(layerById.get(selectedOverlay.layer)?.labelKey ?? 'facilityMap.utility')}</span>
                  </div>
                  <input
                    value={selectedOverlay.label ?? ''}
                    onChange={(event) => commitPlan((current) => ({
                      ...current,
                      overlayPins: current.overlayPins.map((pin) => pin.id === selectedOverlay.id ? { ...pin, label: event.target.value } : pin),
                    }))}
                    placeholder={t('facilityMap.markerLabel')}
                    className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-2 text-xs"
                  />
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400">
                    <div className="rounded bg-white/5 p-2">X<br/><span className="text-white">{selectedOverlay.x.toFixed(1)}%</span></div>
                    <div className="rounded bg-white/5 p-2">Y<br/><span className="text-white">{selectedOverlay.y.toFixed(1)}%</span></div>
                  </div>
                </div>
              )}

              {selectedAnnotation && (
                <div className="space-y-3">
                  <div className="text-xs text-slate-300">{t('facilityMap.annotation')} · {t(annotationToolTranslationKey(selectedAnnotation.type))}</div>
                  {(selectedAnnotation.type === 'text' || selectedAnnotation.type === 'ruler') && (
                    <input
                      value={selectedAnnotation.text ?? ''}
                      onChange={(event) => commitPlan((current) => ({
                        ...current,
                        annotations: current.annotations.map((annotation) => annotation.id === selectedAnnotation.id ? { ...annotation, text: event.target.value } : annotation),
                      }))}
                      className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-2 text-xs"
                    />
                  )}
                  <label className="flex items-center justify-between text-xs text-slate-300">
                    <span>{t('facilityMap.annotationColor')}</span>
                    <input
                      type="color"
                      value={selectedAnnotation.color ?? '#f43f5e'}
                      onChange={(event) => commitPlan((current) => ({
                        ...current,
                        annotations: current.annotations.map((annotation) => annotation.id === selectedAnnotation.id ? { ...annotation, color: event.target.value } : annotation),
                      }))}
                      className="h-8 w-10 rounded border border-white/10 bg-transparent"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-2 text-xs text-slate-300">
                    <span>{t('facilityMap.lineWeight')}</span>
                    <select
                      value={selectedAnnotation.lineWidth ?? 0.28}
                      onChange={(event) => commitPlan((current) => ({
                        ...current,
                        annotations: current.annotations.map((annotation) => annotation.id === selectedAnnotation.id ? { ...annotation, lineWidth: Number(event.target.value) } : annotation),
                      }))}
                      className="rounded border border-white/10 bg-slate-900 px-2 py-1 text-xs"
                    >
                      {[0.15, 0.2, 0.28, 0.35, 0.5, 0.75, 1].map((width) => (
                        <option key={width} value={width}>{width}</option>
                      ))}
                    </select>
                  </label>
                  {selectedAnnotation.type === 'arrow' && (
                    <label className="flex items-center justify-between gap-2 text-xs text-slate-300">
                      <span>{t('facilityMap.arrowSize')}</span>
                      <select
                        value={selectedAnnotation.arrowSize ?? 6}
                        onChange={(event) => commitPlan((current) => ({
                          ...current,
                          annotations: current.annotations.map((annotation) => annotation.id === selectedAnnotation.id ? { ...annotation, arrowSize: Number(event.target.value) } : annotation),
                        }))}
                        className="rounded border border-white/10 bg-slate-900 px-2 py-1 text-xs"
                      >
                        {[4, 5, 6, 8, 10, 12].map((size) => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  {(selectedAnnotation.type === 'text' || selectedAnnotation.type === 'ruler') && (
                    <label className="flex items-center justify-between gap-2 text-xs text-slate-300">
                      <span>{t('facilityMap.textSize')}</span>
                      <select
                        value={selectedAnnotation.textSize ?? 2.5}
                        onChange={(event) => commitPlan((current) => ({
                          ...current,
                          annotations: current.annotations.map((annotation) => annotation.id === selectedAnnotation.id ? { ...annotation, textSize: Number(event.target.value) } : annotation),
                        }))}
                        className="rounded border border-white/10 bg-slate-900 px-2 py-1 text-xs"
                      >
                        {[1.5, 2, 2.5, 3, 4, 5, 6, 8].map((size) => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={deleteSelected}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-red-400/30 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t('facilityMap.deleteSelected')}
              </button>
            </div>
          )}

          {selectedObjectIds.size <= 1 && selectedEquipment && (
            <div className="absolute right-3 top-3 z-30 w-72 rounded-xl border border-white/10 bg-slate-950/90 p-4 text-white shadow-2xl backdrop-blur">
              <div className="mb-3 flex items-start gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: statusColor(selectedEquipment.status) }}
                >
                  <Wrench className="h-5 w-5 text-slate-950" />
                </div>
                <div className="min-w-0">
                  <div className="truncate font-semibold">{selectedEquipment.name}</div>
                  <div className="text-[11px] text-slate-400">{selectedEquipment.id}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md bg-white/5 p-2">
                  <div className="text-slate-400">{t('facilityMap.status')}</div>
                  <div className="mt-1 font-medium">{t(statusTranslationKey(selectedEquipment.status))}</div>
                </div>
                <div className="rounded-md bg-white/5 p-2">
                  <div className="text-slate-400">{t('facilityMap.openWorkOrders')}</div>
                  <div className="mt-1 font-medium">{selectedEquipment.status === 'Maintenance' ? '2' : '0'}</div>
                </div>
                <div className="col-span-2 rounded-md bg-white/5 p-2">
                  <div className="text-slate-400">{t('facilityMap.nextPm')}</div>
                  <div className="mt-1 font-medium">{t('facilityMap.nextPmDemo')}</div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" className="rounded-md border border-white/10 px-3 py-2 text-xs hover:bg-white/10">
                  {t('facilityMap.viewEquipment')}
                </button>
                <button type="button" className="rounded-md bg-white px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-slate-200">
                  {t('facilityMap.createWorkOrder')}
                </button>
              </div>
            </div>
          )}

          <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-white/10 bg-black/70 p-1.5 text-white backdrop-blur">
            <button type="button" className="rounded p-2 hover:bg-white/10" onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))} title={t('facilityMap.zoomOut')}>
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="min-w-14 text-center text-xs">{Math.round(zoom * 100)}%</span>
            <button type="button" className="rounded p-2 hover:bg-white/10" onClick={() => setZoom((z) => Math.min(3, z + 0.1))} title={t('facilityMap.zoomIn')}>
              <ZoomIn className="h-4 w-4" />
            </button>
            <button type="button" className="rounded p-2 hover:bg-white/10" onClick={fitView} title={t('facilityMap.fitView')}>
              <Focus className="h-4 w-4" />
            </button>
            <button type="button" className="rounded p-2 hover:bg-white/10" onClick={fitView} title={t('facilityMap.resetView')}>
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded p-2 hover:bg-white/10"
              onClick={() => setIsFullscreen((value) => !value)}
              title={isFullscreen ? t('facilityMap.exitFullscreen') : t('facilityMap.fullscreen')}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <span className="mx-1 h-5 w-px bg-white/15" />
            <span className="flex items-center gap-1 px-2 text-[11px] text-white/70">
              <Move className="h-3.5 w-3.5" />
              {t('facilityMap.shiftDragPan')}
            </span>
          </div>

          {/* The floor-plan canvas is a pointer-driven application surface with global keyboard controls. */}
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
          <div
            ref={canvasRef}
            role="application"
            className={`absolute inset-0 select-none ${
              editMode && !sketchMode && (selectedEquipmentId || placeLayer || zoneTool || !['select', 'pan'].includes(drawTool))
                ? 'cursor-crosshair'
                : isPanning
                  ? 'cursor-grabbing'
                  : 'cursor-default'
            }`}
            onClick={placeAt}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') event.preventDefault();
            }}
            onMouseDown={startPointer}
            onMouseMove={onPointerMove}
            onMouseUp={endPointerInteraction}
            onMouseLeave={endPointerInteraction}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ touchAction: 'none' }}
          >
            {/*
              Sketch mode's toolbar/properties chrome portals into this node
              instead of rendering inline inside the pan/zoom-transformed
              plan layer below — this div sits at the untransformed viewport
              frame, so the chrome stays fixed and usable while the plan is
              panned or zoomed underneath it.
            */}
            <div ref={setSketchChromeHost} className="pointer-events-none absolute inset-0 z-30" />
            <div
              className="absolute origin-top-left"
              style={{
                width: `${plan.canvasWidth}px`,
                height: `${plan.canvasHeight}px`,
                transform: `translate(${fitTransform.x + pan.x}px, ${fitTransform.y + pan.y}px) scale(${effectiveScale})`,
              }}
            >
              {plan.imageDataUrl ? (
                <img
                  src={plan.imageDataUrl}
                  alt={plan.name}
                  draggable={false}
                  className="h-full w-full object-fill"
                />
              ) : (
                <DemoBlueprint t={t} />
              )}

              {showGrid && (
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    backgroundImage:
                      'linear-gradient(to right, rgba(15,23,42,0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.16) 1px, transparent 1px)',
                    backgroundSize: `${gridSize}% ${gridSize}%`,
                  }}
                />
              )}

              {[
                { id: DEFAULT_SKETCH_ID, visible: sketchVisible, locked: sketchLocked, document: plan.sketchDocument },
                ...plan.sketches.map((layer) => ({
                  id: layer.id,
                  visible: layer.visible,
                  locked: layer.locked,
                  document: layer.document as SketchDocument | undefined,
                })),
              ].map((layer) => {
                const isDraggingThisLayer =
                  draggingSketchLayerId === layer.id ||
                  (groupDragging && selectedObjectIds.has(`sketch:${layer.id}`));
                return (
                  <InventorSketchOverlay
                    key={layer.id}
                    enabled={editMode && sketchMode && activeSketchId === layer.id && !isMobileViewport}
                    interactive={editMode && !sketchMode && drawTool === 'select' && !isMobileViewport && !layer.locked}
                    translateOffset={isDraggingThisLayer && sketchDragOffset ? sketchDragOffset : undefined}
                    visible={layer.visible || (sketchMode && activeSketchId === layer.id)}
                    storageKey={sketchLayerStorageKey(layer.id)}
                    sessionKey={sketchSessionKey}
                    initialDocument={layer.document}
                    canvasWidth={plan.canvasWidth}
                    canvasHeight={plan.canvasHeight}
                    showGrid={showGrid}
                    snapToGrid={snapToGrid}
                    t={t}
                    onDocumentChange={(document) => {
                      if (activeSketchId !== layer.id) return;
                      sketchLatestDocumentRef.current = cloneSketchDocument(document);
                    }}
                    onGroupMouseDown={(event) => beginSketchLayerDrag(event, layer.id, layer.locked)}
                    onFinish={finishSketch}
                    onCancel={cancelSketch}
                    toolbarPortalTarget={sketchChromeHost}
                    onOpenGuide={openGuide}
                    guideUnseen={!guideSeen}
                  />
                );
              })}

              {selectionBox && (
                <>
                <div
                  className={`pointer-events-none absolute border ${
                    selectionBox.crossing
                      ? 'border-emerald-400 bg-emerald-400/15 border-dashed'
                      : 'border-sky-400 bg-sky-400/15'
                  }`}
                  style={{
                    left: `${Math.min(selectionBox.startX, selectionBox.endX)}%`,
                    top: `${Math.min(selectionBox.startY, selectionBox.endY)}%`,
                    width: `${Math.abs(selectionBox.endX - selectionBox.startX)}%`,
                    height: `${Math.abs(selectionBox.endY - selectionBox.startY)}%`,
                  }}
                />
                <div
                  className={`pointer-events-none absolute rounded px-1.5 py-0.5 text-[9px] font-semibold text-white ${
                    selectionBox.crossing ? 'bg-emerald-600' : 'bg-sky-600'
                  }`}
                  style={{
                    left: `${selectionBox.endX}%`,
                    top: `${selectionBox.endY}%`,
                  }}
                >
                  {selectionBox.crossing ? t('facilityMap.crossingSelection') : t('facilityMap.windowSelection')}
                </div>
                </>
              )}

              <svg
                className="absolute inset-0 h-full w-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                style={{ pointerEvents: 'none' }}
              >
                {[...plan.annotations, ...(draftAnnotation ? [draftAnnotation] : [])].map((annotation) => {
                  const isDraft = annotation.id === 'draft-annotation';
                  const objectId = `annotation:${annotation.id}`;
                  const annotationColorValue = annotation.color ?? (annotation.type === 'ruler' ? '#22d3ee' : '#f43f5e');
                  const annotationSelected = selectedObjectIds.has(objectId) || selectedMarkerId === objectId;
                  const baseWidth = annotation.lineWidth ?? 0.28;
                  const common = {
                    stroke: annotationColorValue,
                    strokeWidth: annotationSelected ? baseWidth + 0.12 : baseWidth,
                    vectorEffect: 'non-scaling-stroke' as const,
                    opacity: isDraft ? 0.7 : 1,
                    pointerEvents: ((drawTool === 'erase' || drawTool === 'select') && !isDraft ? 'stroke' : 'none') as React.CSSProperties['pointerEvents'],
                    cursor: drawTool === 'erase' ? 'crosshair' : drawTool === 'select' ? 'move' : 'default',
                    onMouseDown: (event: React.MouseEvent<SVGElement>) => {
                      if (!isDraft && drawTool === 'select') beginAnnotationDrag(event, annotation);
                    },
                    onClick: (event: React.MouseEvent<SVGElement>) => {
                      if (isDraft) return;
                      event.stopPropagation();
                      if (drawTool === 'erase') {
                        deleteObjectsByIds(new Set([objectId]));
                        return;
                      }
                      if (drawTool === 'select') setSingleSelection(objectId, event.shiftKey);
                    },
                  };

                  if (annotation.type === 'line' || annotation.type === 'arrow' || annotation.type === 'ruler') {
                    const distance = Math.hypot(annotation.x2 - annotation.x1, annotation.y2 - annotation.y1);
                    return (
                      <g key={annotation.id}>
                        {annotation.type === 'arrow' && (
                          <defs>
                            <marker
                              id={`facility-arrow-head-${annotation.id}`}
                              markerWidth={annotation.arrowSize ?? 6}
                              markerHeight={annotation.arrowSize ?? 6}
                              refX={(annotation.arrowSize ?? 6) - 1}
                              refY={(annotation.arrowSize ?? 6) / 2}
                              orient="auto"
                              viewBox={`0 0 ${annotation.arrowSize ?? 6} ${annotation.arrowSize ?? 6}`}
                            >
                              <path
                                d={`M0,0 L${annotation.arrowSize ?? 6},${(annotation.arrowSize ?? 6) / 2} L0,${annotation.arrowSize ?? 6} z`}
                                fill={annotationColorValue}
                              />
                            </marker>
                          </defs>
                        )}
                        <line
                          x1={annotation.x1}
                          y1={annotation.y1}
                          x2={annotation.x2}
                          y2={annotation.y2}
                          {...common}
                          markerEnd={annotation.type === 'arrow' ? `url(#facility-arrow-head-${annotation.id})` : undefined}
                          strokeDasharray={annotation.type === 'ruler' ? '1 0.7' : undefined}
                        />
                        {annotation.type === 'ruler' && (
                          <text
                            x={(annotation.x1 + annotation.x2) / 2}
                            y={(annotation.y1 + annotation.y2) / 2 - 1}
                            fill={annotationColorValue}
                            fontSize={annotation.textSize ?? 2.2}
                            textAnchor="middle"
                            pointerEvents="none"
                          >
                            {distance.toFixed(1)}%
                          </text>
                        )}
                      </g>
                    );
                  }

                  if (annotation.type === 'rect') {
                    return (
                      <rect
                        key={annotation.id}
                        x={Math.min(annotation.x1, annotation.x2)}
                        y={Math.min(annotation.y1, annotation.y2)}
                        width={Math.abs(annotation.x2 - annotation.x1)}
                        height={Math.abs(annotation.y2 - annotation.y1)}
                        fill={`${annotationColorValue}18`}
                        {...common}
                        pointerEvents={(drawTool === 'erase' || drawTool === 'select') && !isDraft ? 'all' : 'none'}
                      />
                    );
                  }

                  if (annotation.type === 'circle') {
                    const rx = Math.abs(annotation.x2 - annotation.x1) / 2;
                    const ry = Math.abs(annotation.y2 - annotation.y1) / 2;
                    return (
                      <ellipse
                        key={annotation.id}
                        cx={(annotation.x1 + annotation.x2) / 2}
                        cy={(annotation.y1 + annotation.y2) / 2}
                        rx={rx}
                        ry={ry}
                        fill={`${annotationColorValue}18`}
                        {...common}
                        pointerEvents={(drawTool === 'erase' || drawTool === 'select') && !isDraft ? 'all' : 'none'}
                      />
                    );
                  }

                  return (
                    <text
                      key={annotation.id}
                      x={annotation.x1}
                      y={annotation.y1}
                      fill={annotationColorValue}
                      fontSize={annotation.textSize ?? 2.5}
                      fontWeight="700"
                      stroke={annotationSelected ? '#ffffff' : 'none'}
                      strokeWidth={annotationSelected ? 0.08 : 0}
                      style={{ pointerEvents: (drawTool === 'erase' || drawTool === 'select') && !isDraft ? 'auto' : 'none', cursor: drawTool === 'erase' ? 'crosshair' : 'move' }}
                      onMouseDown={(event) => {
                        if (!isDraft && drawTool === 'select') beginAnnotationDrag(event, annotation);
                      }}
                      onClick={(event) => {
                        if (isDraft) return;
                        event.stopPropagation();
                        if (drawTool === 'erase') {
                          deleteObjectsByIds(new Set([objectId]));
                          return;
                        }
                        if (drawTool === 'select') setSingleSelection(objectId, event.shiftKey);
                      }}
                    >
                      {annotation.text}
                    </text>
                  );
                })}

                {selectedAnnotation && selectedObjectIds.size <= 1 && drawTool === 'select' && (() => {
                  const color = selectedAnnotation.color ?? '#0ea5e9';
                  const gripProps = {
                    r: 0.75,
                    fill: '#ffffff',
                    stroke: color,
                    strokeWidth: 0.28,
                    vectorEffect: 'non-scaling-stroke' as const,
                    style: { pointerEvents: 'all' as const, cursor: 'pointer' },
                  };

                  if (selectedAnnotation.type === 'line' || selectedAnnotation.type === 'arrow' || selectedAnnotation.type === 'ruler') {
                    return (
                      <>
                        <circle
                          cx={selectedAnnotation.x1}
                          cy={selectedAnnotation.y1}
                          {...gripProps}
                          onMouseDown={(event) => beginAnnotationGrip(event, selectedAnnotation, 'start')}
                        />
                        <circle
                          cx={selectedAnnotation.x2}
                          cy={selectedAnnotation.y2}
                          {...gripProps}
                          onMouseDown={(event) => beginAnnotationGrip(event, selectedAnnotation, 'end')}
                        />
                      </>
                    );
                  }

                  if (selectedAnnotation.type === 'rect' || selectedAnnotation.type === 'circle') {
                    const left = Math.min(selectedAnnotation.x1, selectedAnnotation.x2);
                    const right = Math.max(selectedAnnotation.x1, selectedAnnotation.x2);
                    const top = Math.min(selectedAnnotation.y1, selectedAnnotation.y2);
                    const bottom = Math.max(selectedAnnotation.y1, selectedAnnotation.y2);
                    return (
                      <>
                        <circle cx={left} cy={top} {...gripProps} onMouseDown={(event) => beginAnnotationGrip(event, selectedAnnotation, 'nw')} />
                        <circle cx={right} cy={top} {...gripProps} onMouseDown={(event) => beginAnnotationGrip(event, selectedAnnotation, 'ne')} />
                        <circle cx={right} cy={bottom} {...gripProps} onMouseDown={(event) => beginAnnotationGrip(event, selectedAnnotation, 'se')} />
                        <circle cx={left} cy={bottom} {...gripProps} onMouseDown={(event) => beginAnnotationGrip(event, selectedAnnotation, 'sw')} />
                      </>
                    );
                  }

                  return (
                    <circle
                      cx={selectedAnnotation.x1}
                      cy={selectedAnnotation.y1}
                      {...gripProps}
                      onMouseDown={(event) => beginAnnotationGrip(event, selectedAnnotation, 'start')}
                    />
                  );
                })()}
              </svg>

              {plan.zones.map((zone) => {
                const meta = zoneById.get(zone.type);
                const objectId = `zone:${zone.id}`;
                const selected = selectedObjectIds.has(objectId) || selectedMarkerId === objectId;
                return (
                  <button
                    key={zone.id}
                    type="button"
                    className={`absolute z-[20] rounded-md border-2 text-left ${
                      selected ? 'ring-2 ring-white' : ''
                    }`}
                    style={{
                      left: `${zone.x}%`,
                      top: `${zone.y}%`,
                      width: `${zone.w}%`,
                      height: `${zone.h}%`,
                      borderColor: zone.customColor ?? meta?.color,
                      backgroundColor: `${zone.customColor ?? meta?.color ?? '#64748b'}${emergencyMode && ['hazard', 'emergency', 'restricted'].includes(zone.type) ? '55' : emergencyMode ? '08' : '22'}`,
                      opacity: emergencyMode && !['hazard', 'emergency', 'restricted'].includes(zone.type) ? 0.25 : 1,
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (drawTool === 'erase') {
                        deleteObjectsByIds(new Set([objectId]));
                        return;
                      }
                      setSingleSelection(objectId, event.shiftKey);
                    }}
                    onMouseDown={(event) => {
                      event.stopPropagation();
                      if (!editMode || drawTool !== 'select') return;
                      if (beginGroupDrag(event, objectId)) return;
                      setSingleSelection(objectId, event.shiftKey);
                      dragStartPlanRef.current = clonePlan(plan);
                      zoneInteractionRef.current = { startX: zone.x, startY: zone.y, zone: { ...zone } };
                      const point = toPercent(event.clientX, event.clientY);
                      if (point) zoneInteractionRef.current = { startX: point.x, startY: point.y, zone: { ...zone } };
                      setDraggingZoneId(zone.id);
                    }}
                    title={meta ? t(meta.labelKey) : undefined}
                  >
                    <span
                      className="absolute left-1 top-1 rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
                      style={{ backgroundColor: zone.customColor ?? meta?.color }}
                    >
                      {meta?.emoji} {zone.customLabel || (meta ? t(meta.labelKey) : '')}
                    </span>
                    {editMode && selected && drawTool === 'select' && (
                      <>
                        {([
                          ['nw', '-5px', '-5px', 'nwse-resize'],
                          ['n', '50%', '-5px', 'ns-resize'],
                          ['ne', 'calc(100% - 5px)', '-5px', 'nesw-resize'],
                          ['e', 'calc(100% - 5px)', '50%', 'ew-resize'],
                          ['se', 'calc(100% - 5px)', 'calc(100% - 5px)', 'nwse-resize'],
                          ['s', '50%', 'calc(100% - 5px)', 'ns-resize'],
                          ['sw', '-5px', 'calc(100% - 5px)', 'nesw-resize'],
                          ['w', '-5px', '50%', 'ew-resize'],
                        ] as const).map(([handle, left, top, cursor]) => (
                          <button
                            type="button"
                            key={handle}
                            aria-label={t('facilityMap.resizeZone')}
                            className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-white bg-slate-950 shadow"
                            style={{ left, top, cursor }}
                            onMouseDown={(event) => {
                              event.stopPropagation();
                              dragStartPlanRef.current = clonePlan(plan);
                              const point = toPercent(event.clientX, event.clientY);
                              if (!point) return;
                              zoneInteractionRef.current = { startX: point.x, startY: point.y, zone: { ...zone } };
                              setZoneResizeHandle(handle);
                              setResizingZoneId(zone.id);
                            }}
                            title={t('facilityMap.resizeZone')}
                          />
                        ))}
                      </>
                    )}
                  </button>
                );
              })}

              {draftZone && (() => {
                const meta = zoneById.get(draftZone.type);
                return (
                  <div
                    className="pointer-events-none absolute z-[20] rounded-md border-2 border-dashed"
                    style={{
                      left: `${draftZone.x}%`,
                      top: `${draftZone.y}%`,
                      width: `${draftZone.w}%`,
                      height: `${draftZone.h}%`,
                      borderColor: meta?.color,
                      backgroundColor: `${meta?.color ?? '#64748b'}1f`,
                    }}
                  />
                );
              })()}

              {visibleAssetPins && plan.pins.map((pin) => {
                const item = equipmentById.get(pin.equipmentId);
                const objectId = `asset:${pin.equipmentId}`;
                const selected = selectedObjectIds.has(objectId) || selectedMarkerId === objectId;
                return (
                  <button
                    key={pin.equipmentId}
                    type="button"
                    className={`group absolute z-[30] -translate-x-1/2 -translate-y-1/2 ${emergencyMode ? 'opacity-20' : ''}`}
                    style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (drawTool === 'erase') {
                        deleteObjectsByIds(new Set([objectId]));
                        return;
                      }
                      setSingleSelection(objectId, event.shiftKey);
                    }}
                    onMouseDown={(event) => {
                      event.stopPropagation();
                      if (!editMode || drawTool !== 'select') return;
                      if (beginGroupDrag(event, objectId)) return;
                      setSingleSelection(objectId, event.shiftKey);
                      dragStartPlanRef.current = clonePlan(plan);
                      setDraggingEquipmentId(pin.equipmentId);
                    }}
                    title={item?.name ?? pin.equipmentId}
                  >
                    <div style={{ transform: `scale(${1 / Math.max(effectiveScale, 0.0001)})`, transformOrigin: 'center' }}>
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-slate-950 shadow-xl ${
                          selected ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-950' : ''
                        }`}
                        style={{ backgroundColor: statusColor(item?.status) }}
                      >
                        <MapPin className="h-5 w-5 text-slate-950" />
                      </div>
                      <div className="pointer-events-none absolute left-1/2 top-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-black/85 px-2 py-1 text-[10px] text-white shadow group-hover:block">
                        {item?.name ?? pin.equipmentId}
                        {item?.status ? ` · ${t(statusTranslationKey(item.status))}` : ''}
                      </div>
                    </div>
                  </button>
                );
              })}

              {visibleOverlayPins.map((pin) => {
                const meta = layerById.get(pin.layer);
                const objectId = `overlay:${pin.id}`;
                const selected = selectedObjectIds.has(objectId) || selectedMarkerId === objectId;
                return (
                  <button
                    key={pin.id}
                    type="button"
                    className="absolute z-[30] -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (drawTool === 'erase') {
                        deleteObjectsByIds(new Set([objectId]));
                        return;
                      }
                      setSingleSelection(objectId, event.shiftKey);
                    }}
                    onMouseDown={(event) => {
                      event.stopPropagation();
                      if (!editMode || drawTool !== 'select') return;
                      if (beginGroupDrag(event, objectId)) return;
                      setSingleSelection(objectId, event.shiftKey);
                      dragStartPlanRef.current = clonePlan(plan);
                      setDraggingOverlayId(pin.id);
                    }}
                    title={meta ? t(meta.labelKey) : undefined}
                  >
                    <div style={{ transform: `scale(${1 / Math.max(effectiveScale, 0.0001)})`, transformOrigin: 'center' }}>
                      <div
                        className={`flex h-9 min-w-9 items-center justify-center rounded-full border-[3px] border-slate-950 px-2 text-base shadow-xl ${
                          selected ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-950' : ''
                        }`}
                        style={{ backgroundColor: meta?.color }}
                      >
                        {meta?.emoji}
                      </div>
                      {pin.label && (
                        <div className="pointer-events-none absolute left-1/2 top-10 -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-2 py-1 text-[10px] text-white">
                          {pin.label}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>
      {planManagerOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[88vh] w-full max-w-4xl overflow-auto rounded-2xl border bg-card p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{t('facilityMap.allPlans')}</h2>
                <p className="text-xs text-muted-foreground">{t('facilityMap.planManagerHint')}</p>
              </div>
              <button type="button" onClick={() => setPlanManagerOpen(false)} className="rounded-md border p-2">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-5 grid gap-2 rounded-xl border bg-muted/20 p-3 md:grid-cols-5">
              <input
                value={newPlanName}
                onChange={(event) => setNewPlanName(event.target.value)}
                placeholder={t('facilityMap.planName')}
                className="rounded-md border bg-background px-3 py-2 text-sm"
              />
              <input
                value={newPlanBuilding}
                onChange={(event) => setNewPlanBuilding(event.target.value)}
                placeholder={t('facilityMap.building')}
                className="rounded-md border bg-background px-3 py-2 text-sm"
              />
              <input
                value={newPlanFloor}
                onChange={(event) => setNewPlanFloor(event.target.value)}
                placeholder={t('facilityMap.floor')}
                className="rounded-md border bg-background px-3 py-2 text-sm"
              />
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border bg-background px-3 py-2 text-xs hover:bg-accent">
                <ImagePlus className="h-3.5 w-3.5" />
                {newPlanImageData ? t('facilityMap.blueprintReady') : t('facilityMap.blueprint')}
                <input
                  type="file"
                  accept="image/*,.svg,image/svg+xml"
                  className="hidden"
                  onChange={(event) => handleNewPlanImage(event.target.files?.[0])}
                />
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={() => createPlan(false)} className="flex-1 rounded-md bg-primary px-3 py-2 text-xs text-primary-foreground">
                  <Plus className="mr-1 inline h-3.5 w-3.5" />{t('facilityMap.addPlan')}
                </button>
                <button type="button" onClick={() => createPlan(true)} className="flex-1 rounded-md border px-3 py-2 text-xs">
                  <Copy className="mr-1 inline h-3.5 w-3.5" />{t('facilityMap.duplicate')}
                </button>
              </div>
            </div>

            <div className="space-y-5">
              {plansByBuilding.map(([building, items]) => (
                <div key={building}>
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <Building2 className="h-4 w-4" />
                    {building}
                    <span className="text-xs font-normal text-muted-foreground">({items.length})</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((item) => (
                      <button
                        key={planKey(item.building, item.floor)}
                        type="button"
                        onClick={() => openPlanFromLibrary(item)}
                        className={`rounded-xl border p-3 text-left transition hover:bg-accent ${
                          planKey(item.building, item.floor) === planKey(plan.building, plan.floor) ? 'ring-2 ring-primary' : ''
                        }`}
                      >
                        <div className="mb-2 aspect-[16/9] overflow-hidden rounded-md border bg-slate-100">
                          <div className="relative h-full w-full">
                            {item.imageDataUrl ? (
                              <img src={item.imageDataUrl} alt={item.name} className="h-full w-full object-fill" />
                            ) : (
                              <DemoBlueprint t={t} />
                            )}
                            {item.zones.slice(0, 6).map((zone) => (
                              <span
                                key={zone.id}
                                className="absolute rounded-sm border"
                                style={{
                                  left: `${zone.x}%`,
                                  top: `${zone.y}%`,
                                  width: `${zone.w}%`,
                                  height: `${zone.h}%`,
                                  borderColor: zone.customColor ?? zoneById.get(zone.type)?.color,
                                  backgroundColor: `${zone.customColor ?? zoneById.get(zone.type)?.color ?? '#64748b'}22`,
                                }}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="font-medium">{item.name || `${item.building} - ${item.floor}`}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{item.floor}</div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                          {t('facilityMap.itemsSummary', { assets: item.pins.length, markers: item.overlayPins.length, zones: item.zones.length })}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={deleteCurrentPlan}
                className="inline-flex items-center gap-2 rounded-md border border-destructive/40 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
                {t('facilityMap.deletePlan')}
              </button>
            </div>
          </div>
        </div>
      )}

      {historyOpen && (
        <div className="fixed inset-0 z-[120] flex justify-end bg-black/60 backdrop-blur-sm">
          <div className="h-full w-full max-w-md overflow-y-auto border-l bg-card p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold">{t('facilityMap.history')}</h2>
                <p className="text-xs text-muted-foreground">{t('facilityMap.historyHint')}</p>
              </div>
              <button type="button" onClick={() => setHistoryOpen(false)} className="rounded-md border p-2">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-3 rounded-lg border bg-primary/5 p-3 text-xs">
              <div className="font-medium">{t('facilityMap.currentVersion')}</div>
              <div className="mt-1 text-muted-foreground">{plan.building} · {plan.floor}</div>
            </div>

            <div className="space-y-2">
              {planHistory.length === 0 && (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  {t('facilityMap.noHistory')}
                </div>
              )}
              {planHistory.map((entry) => (
                <div key={entry.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">{formatDateTime(new Date(entry.timestamp))}</div>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {t('facilityMap.itemsSummary', {
                          assets: entry.snapshot.pins.length,
                          markers: entry.snapshot.overlayPins.length,
                          zones: entry.snapshot.zones.length,
                        })}
                      </div>
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        {t('facilityMap.sketchEntitiesSummary', { count: entry.snapshot.sketchDocument?.entities.length ?? 0 })}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCompareHistoryId(compareHistoryId === entry.id ? null : entry.id)}
                      className={`rounded-md border p-2 ${compareHistoryId === entry.id ? 'bg-primary text-primary-foreground' : ''}`}
                      title={t('facilityMap.compare')}
                    >
                      <GitCompare className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => restoreHistoryEntry(entry)}
                    className="mt-3 w-full rounded-md border px-3 py-2 text-xs hover:bg-accent"
                  >
                    {t('facilityMap.restore')}
                  </button>
                </div>
              ))}
            </div>

            {compareSnapshot && (
              <div className="sticky bottom-0 mt-4 rounded-xl border bg-card p-3 shadow-xl">
                <div className="text-xs font-semibold">{t('facilityMap.compare')}</div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded bg-muted p-2">
                    <div className="font-medium">{t('facilityMap.currentVersion')}</div>
                    <div>{plan.pins.length} / {plan.overlayPins.length} / {plan.zones.length}</div>
                    <div>{t('facilityMap.sketchCountSummary', { count: plan.sketchDocument?.entities.length ?? 0 })}</div>
                  </div>
                  <div className="rounded bg-muted p-2">
                    <div className="font-medium">{t('facilityMap.savedVersion')}</div>
                    <div>{compareSnapshot.pins.length} / {compareSnapshot.overlayPins.length} / {compareSnapshot.zones.length}</div>
                    <div>{t('facilityMap.sketchCountSummary', { count: compareSnapshot.sketchDocument?.entities.length ?? 0 })}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div id="facility-print-sheet" className="pointer-events-none fixed -left-[99999px] top-0 w-[1120px] bg-white p-8 text-slate-950">
        <div className="mb-4">
          <div className="text-2xl font-bold">{t('facilityMap.title')}</div>
          <div className="text-sm">{plan.name} · {plan.building} · {plan.floor}</div>
        </div>
        <div
          className="relative w-full overflow-hidden border bg-white"
          style={{ aspectRatio: `${plan.canvasWidth} / ${plan.canvasHeight}` }}
        >
          {plan.imageDataUrl ? (
            <img src={plan.imageDataUrl} alt={plan.name} className="h-full w-full object-fill" />
          ) : (
            <DemoBlueprint t={t} />
          )}
          <SketchPrintLayer
            document={plan.sketchDocument}
            canvasWidth={plan.canvasWidth}
            canvasHeight={plan.canvasHeight}
          />
          {plan.zones.map((zone) => (
            <div
              key={zone.id}
              className="absolute border-2"
              style={{
                left: `${zone.x}%`,
                top: `${zone.y}%`,
                width: `${zone.w}%`,
                height: `${zone.h}%`,
                borderColor: zone.customColor ?? zoneById.get(zone.type)?.color,
                backgroundColor: `${zone.customColor ?? zoneById.get(zone.type)?.color ?? '#64748b'}22`,
              }}
            />
          ))}
          {plan.pins.map((pin) => (
            <div
              key={pin.equipmentId}
              className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-black bg-emerald-500"
              style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
            />
          ))}
          {plan.overlayPins.map((pin) => (
            <div
              key={pin.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 text-lg"
              style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
            >
              {layerById.get(pin.layer)?.emoji}
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-4 gap-3 text-xs">
          {[
            ['#22c55e', t('facilityMap.statusActive')],
            ['#eab308', t('facilityMap.statusMaintenance')],
            ['#94a3b8', t('facilityMap.statusInactive')],
            ['#ef4444', t('facilityMap.statusRetired')],
          ].map(([color, label]) => (
            <div key={String(label)} className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: String(color) }} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #facility-print-sheet, #facility-print-sheet * { visibility: visible !important; }
          #facility-print-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 16mm !important;
          }
        }
      `}</style>

      <SketchGuideDialog open={guideOpen} onOpenChange={setGuideOpen} t={t} />
    </div>
  );
}
