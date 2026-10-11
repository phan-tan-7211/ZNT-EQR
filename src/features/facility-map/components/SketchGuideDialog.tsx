import type { ReactNode } from 'react';
import {
  ArrowUpRight,
  BookOpen,
  Circle as CircleIcon,
  Keyboard,
  Lightbulb,
  Minus,
  MousePointer2,
  Ruler,
  Rows3,
  Scissors,
  Spline,
  Split,
  Square,
  Waypoints,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Translate = (key: string, params?: Record<string, string | number>) => string;

export type SketchGuideDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  t: Translate;
};

// ---------------------------------------------------------------------------
// Small presentational helpers
// ---------------------------------------------------------------------------

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex min-w-[1.75rem] items-center justify-center rounded-md border border-b-2 border-border bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold text-foreground shadow-sm">
      {children}
    </kbd>
  );
}

function Illustration({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="flex items-center justify-center rounded-lg border bg-muted/40 p-3">
      <svg viewBox="0 0 200 110" role="img" aria-label={label} className="h-24 w-full max-w-[220px]">
        {children}
      </svg>
    </div>
  );
}

// Shared SVG class names so every illustration uses the same visual language
// (and stays readable in both light and dark themes).
const STROKE = 'stroke-sky-600 dark:stroke-sky-400';
const STROKE_MUTED = 'stroke-muted-foreground/50';
const FILL_POINT = 'fill-sky-600 dark:fill-sky-400';
const TEXT = 'fill-foreground text-[10px] font-semibold';
const TEXT_MUTED = 'fill-muted-foreground text-[9px]';

function ClickMarker({ x, y, n }: { x: number; y: number; n: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={4} className={FILL_POINT} />
      <circle cx={x} cy={y - 14} r={7} className="fill-background stroke-sky-600 dark:stroke-sky-400" strokeWidth={1.5} />
      <text x={x} y={y - 10.5} textAnchor="middle" className={TEXT}>{n}</text>
    </g>
  );
}

function Cursor({ x, y }: { x: number; y: number }) {
  return (
    <path
      d={`M${x} ${y} l0 13 l3.5 -3.5 l3 6 l2 -1 l-3 -6 l5 0 z`}
      className="fill-foreground stroke-background"
      strokeWidth={0.8}
    />
  );
}

// ---------------------------------------------------------------------------
// Illustrations
// ---------------------------------------------------------------------------

function EnterSketchArt({ label, button }: { label: string; button: string }) {
  return (
    <Illustration label={label}>
      <rect x={20} y={38} width={160} height={34} rx={7} className="fill-sky-500/15 stroke-sky-600 dark:stroke-sky-400" strokeWidth={1.5} />
      <path d="M38 48 l12 12 M38 60 l4 0 M38 56 l0 4" className={STROKE} strokeWidth={2} fill="none" strokeLinecap="round" />
      <text x={110} y={59} textAnchor="middle" className={TEXT}>{button}</text>
      <Cursor x={150} y={58} />
    </Illustration>
  );
}

function KeyToolArt({ label }: { label: string }) {
  const keys = ['L', 'R', 'C'];
  return (
    <Illustration label={label}>
      {keys.map((key, index) => (
        <g key={key} transform={`translate(${30 + index * 52} 28)`}>
          <rect width={38} height={38} rx={7} className="fill-muted stroke-border" strokeWidth={1.5} />
          <rect y={34} width={38} height={6} rx={3} className="fill-border" />
          <text x={19} y={25} textAnchor="middle" className="fill-foreground text-[16px] font-bold">{key}</text>
        </g>
      ))}
      <path d="M50 88 L72 88 M102 88 L124 88 M154 88 L176 88" className={STROKE_MUTED} strokeWidth={1} />
    </Illustration>
  );
}

function ChainArt({ label }: { label: string }) {
  return (
    <Illustration label={label}>
      <polyline points="30,85 30,30 120,30" className={STROKE} strokeWidth={2.5} fill="none" strokeLinejoin="round" />
      <line x1={120} y1={30} x2={165} y2={70} className={STROKE} strokeWidth={2} strokeDasharray="5 4" />
      <ClickMarker x={30} y={85} n={1} />
      <ClickMarker x={30} y={30} n={2} />
      <ClickMarker x={120} y={30} n={3} />
      <Cursor x={165} y={70} />
    </Illustration>
  );
}

function FinishArt({ label, esc, finish }: { label: string; esc: string; finish: string }) {
  return (
    <Illustration label={label}>
      <g transform="translate(18 34)">
        <rect width={52} height={40} rx={7} className="fill-muted stroke-border" strokeWidth={1.5} />
        <rect y={36} width={52} height={6} rx={3} className="fill-border" />
        <text x={26} y={25} textAnchor="middle" className="fill-foreground text-[13px] font-bold">{esc}</text>
      </g>
      <path d="M80 54 L96 54 M91 49 l5 5 l-5 5" className={STROKE_MUTED} strokeWidth={1.5} fill="none" />
      <rect x={104} y={36} width={80} height={36} rx={7} className="fill-emerald-500" />
      <path d="M114 54 l5 5 l9 -10" className="stroke-emerald-950" strokeWidth={2} fill="none" strokeLinecap="round" />
      <text x={154} y={58} textAnchor="middle" className="fill-emerald-950 text-[9px] font-bold">{finish}</text>
    </Illustration>
  );
}

function SnapArt({ label }: { label: string }) {
  return (
    <Illustration label={label}>
      <line x1={25} y1={80} x2={110} y2={30} className={STROKE_MUTED} strokeWidth={2} />
      <line x1={110} y1={30} x2={180} y2={80} className={STROKE_MUTED} strokeWidth={2} />
      <rect x={104} y={24} width={12} height={12} className="fill-none stroke-amber-500" strokeWidth={2} />
      <path d="M150 80 l7 -12 l7 12 z" className="fill-none stroke-amber-500" strokeWidth={2} transform="translate(-12 -22)" />
      <Cursor x={112} y={32} />
    </Illustration>
  );
}

function InputBoxArt({ label, length, angle }: { label: string; length: string; angle: string }) {
  return (
    <Illustration label={label}>
      <line x1={20} y1={35} x2={95} y2={35} className={STROKE} strokeWidth={2.5} />
      <circle cx={20} cy={35} r={3.5} className={FILL_POINT} />
      <rect x={70} y={48} width={120} height={52} rx={6} className="fill-slate-950 stroke-sky-400/60" strokeWidth={1} />
      <text x={78} y={62} className="fill-slate-400 text-[8px]">{length}</text>
      <rect x={78} y={66} width={50} height={18} rx={3} className="fill-white/10 stroke-sky-400" strokeWidth={1.5} />
      <text x={84} y={79} className="fill-white text-[10px] font-semibold">1200|</text>
      <text x={136} y={62} className="fill-slate-400 text-[8px]">{angle}</text>
      <rect x={136} y={66} width={46} height={18} rx={3} className="fill-white/10 stroke-white/20" strokeWidth={1} />
      <text x={142} y={79} className="fill-white text-[10px]">0</text>
    </Illustration>
  );
}

function AngleArt({ label }: { label: string }) {
  return (
    <Illustration label={label}>
      <circle cx={100} cy={55} r={3.5} className={FILL_POINT} />
      {[
        [0, 160, 55, '0°'],
        [90, 100, 100, '90°'],
        [180, 40, 55, '180°'],
        [270, 100, 12, '270°'],
      ].map(([deg, x, y, text]) => (
        <g key={deg as number}>
          <line x1={100} y1={55} x2={x as number} y2={y as number} className={deg === 0 ? STROKE : STROKE_MUTED} strokeWidth={deg === 0 ? 2.5 : 1.5} />
          <text
            x={(x as number) + (deg === 0 ? 4 : deg === 180 ? -4 : 0)}
            y={(y as number) + (deg === 90 ? 9 : deg === 270 ? -2 : 3)}
            textAnchor={deg === 0 ? 'start' : deg === 180 ? 'end' : 'middle'}
            className={deg === 0 ? TEXT : TEXT_MUTED}
          >
            {text}
          </text>
        </g>
      ))}
    </Illustration>
  );
}

function ConstraintArt({ label }: { label: string }) {
  const glyph = (x: number, y: number, text: string) => (
    <g>
      <rect x={x - 8} y={y - 8} width={16} height={16} rx={3} className="fill-violet-500/15 stroke-violet-500" strokeWidth={1.2} />
      <text x={x} y={y + 3.5} textAnchor="middle" className="fill-violet-600 text-[10px] font-bold dark:fill-violet-300">{text}</text>
    </g>
  );
  return (
    <Illustration label={label}>
      <polyline points="35,85 35,30 165,30" className={STROKE} strokeWidth={2.5} fill="none" />
      {glyph(100, 16, 'H')}
      {glyph(20, 58, 'V')}
      <circle cx={35} cy={30} r={5} className="fill-violet-500" />
    </Illustration>
  );
}

function TrimArt({ label }: { label: string }) {
  return (
    <Illustration label={label}>
      <line x1={60} y1={15} x2={60} y2={95} className={STROKE_MUTED} strokeWidth={2} />
      <line x1={140} y1={15} x2={140} y2={95} className={STROKE_MUTED} strokeWidth={2} />
      <line x1={20} y1={55} x2={60} y2={55} className={STROKE} strokeWidth={2.5} />
      <line x1={60} y1={55} x2={140} y2={55} className="stroke-red-500" strokeWidth={2.5} strokeDasharray="6 4" />
      <line x1={140} y1={55} x2={180} y2={55} className={STROKE} strokeWidth={2.5} />
      <Cursor x={98} y={57} />
    </Illustration>
  );
}

function OffsetArt({ label }: { label: string }) {
  return (
    <Illustration label={label}>
      <rect x={60} y={35} width={80} height={45} rx={2} className="fill-none stroke-sky-600 dark:stroke-sky-400" strokeWidth={2.5} />
      <rect x={48} y={23} width={104} height={69} rx={3} className="fill-none stroke-emerald-500" strokeWidth={2} strokeDasharray="5 4" />
      <path d="M100 35 L100 23" className="stroke-emerald-500" strokeWidth={1} />
      <Cursor x={155} y={60} />
    </Illustration>
  );
}

function DimensionArt({ label }: { label: string }) {
  return (
    <Illustration label={label}>
      <line x1={30} y1={70} x2={170} y2={70} className={STROKE} strokeWidth={2.5} />
      <path d="M30 50 L170 50 M30 44 L30 56 M170 44 L170 56 M30 50 l7 -3 l0 6 z M170 50 l-7 -3 l0 6 z" className="stroke-amber-500 fill-amber-500" strokeWidth={1.2} />
      <rect x={78} y={38} width={44} height={16} rx={3} className="fill-background stroke-amber-500" strokeWidth={1} />
      <text x={100} y={50} textAnchor="middle" className={TEXT}>1200</text>
    </Illustration>
  );
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function StepCard({ n, title, body, art }: { n: number; title: string; body: string; art: ReactNode }) {
  return (
    <li className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
      {art}
      <div className="flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
          {n}
        </span>
        <div className="min-w-0">
          <h3 className="font-semibold leading-tight">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{body}</p>
        </div>
      </div>
    </li>
  );
}

function ToolRow({
  icon: Icon,
  name,
  shortcut,
  body,
}: {
  icon: typeof Minus;
  name: string;
  shortcut: string;
  body: string;
}) {
  return (
    <li className="flex items-start gap-3 rounded-lg border bg-card p-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-sky-500/15 text-sky-700 dark:text-sky-300">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{name}</span>
          <Kbd>{shortcut}</Kbd>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      </div>
    </li>
  );
}

function Tip({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function ShortcutTable({ title, rows }: { title: string; rows: Array<[ReactNode, string]> }) {
  return (
    <section className="rounded-xl border bg-card p-4">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <dl className="divide-y">
        {rows.map(([keys, description]) => (
          <div key={description} className="flex flex-row-reverse items-center justify-between gap-3 py-2">
            <dt className="flex shrink-0 flex-wrap items-center justify-end gap-1">{keys}</dt>
            <dd className="min-w-0 text-sm">{description}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Dialog
// ---------------------------------------------------------------------------

/**
 * In-app, self-serve guide for the Inventor-style sketch tools: a new user
 * should be able to open it from the "?" button (or F1 / ? inside Sketch)
 * and draw a correctly sized profile without being taught in person.
 */
export default function SketchGuideDialog({ open, onOpenChange, t }: SketchGuideDialogProps) {
  const g = (key: string, params?: Record<string, string | number>) => t(`facilityMap.guide.${key}`, params);
  const plus = <span className="text-xs text-muted-foreground">+</span>;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="gap-0 p-0">
        <DialogHeader className="border-b px-5 pb-4 pt-5 pr-12 text-left">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="h-5 w-5 text-primary" />
            {g('title')}
          </DialogTitle>
          <DialogDescription>{g('subtitle')}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="start" className="min-w-0 px-5 pb-5 pt-4">
          <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto">
            {(['start', 'draw', 'input', 'constraints', 'modify', 'shortcuts'] as const).map((tab) => (
              <TabsTrigger key={tab} value={tab} className="shrink-0">
                {g(`tab_${tab}`)}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="start" className="mt-4 space-y-4">
            <ol className="grid gap-3 sm:grid-cols-2">
              <StepCard n={1} title={g('step1Title')} body={g('step1Body')} art={<EnterSketchArt label={g('step1Title')} button={t('facilityMap.enterSketch')} />} />
              <StepCard n={2} title={g('step2Title')} body={g('step2Body')} art={<KeyToolArt label={g('step2Title')} />} />
              <StepCard n={3} title={g('step3Title')} body={g('step3Body')} art={<ChainArt label={g('step3Title')} />} />
              <StepCard n={4} title={g('step4Title')} body={g('step4Body')} art={<FinishArt label={g('step4Title')} esc="Esc" finish={t('facilityMap.finishSketch')} />} />
            </ol>
            <Tip>
              {g('reopenTip')} <Kbd>?</Kbd> / <Kbd>F1</Kbd>
            </Tip>
          </TabsContent>

          <TabsContent value="draw" className="mt-4 space-y-4">
            <ul className="grid gap-2 md:grid-cols-2">
              <ToolRow icon={Minus} name={t('facilityMap.toolLine')} shortcut="L" body={g('drawLine')} />
              <ToolRow icon={Waypoints} name={t('facilityMap.toolPolyline')} shortcut="P" body={g('drawPolyline')} />
              <ToolRow icon={Spline} name={t('facilityMap.toolArc')} shortcut="A" body={g('drawArc')} />
              <ToolRow icon={Square} name={t('facilityMap.toolRectangle')} shortcut="R" body={g('drawRect')} />
              <ToolRow icon={CircleIcon} name={t('facilityMap.toolCircle')} shortcut="C" body={g('drawCircle')} />
              <ToolRow icon={MousePointer2} name={t('facilityMap.toolSelect')} shortcut="Esc" body={g('drawSelect')} />
            </ul>
            <div className="grid items-center gap-3 rounded-xl border bg-card p-4 sm:grid-cols-[220px_1fr]">
              <SnapArt label={g('snapTitle')} />
              <div>
                <h3 className="font-semibold">{g('snapTitle')}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{g('snapBody')}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="input" className="mt-4 space-y-4">
            <div className="grid items-start gap-4 md:grid-cols-[240px_1fr]">
              <InputBoxArt label={g('inputTitle')} length={t('facilityMap.sketchLength')} angle={t('facilityMap.sketchAngle')} />
              <div>
                <h3 className="font-semibold">{g('inputTitle')}</h3>
                <ol className="mt-2 space-y-2 text-sm">
                  {(['inputStep1', 'inputStep2', 'inputStep3', 'inputStep4'] as const).map((key, index) => (
                    <li key={key} className="flex gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">{index + 1}</span>
                      <span className="text-muted-foreground">{g(key)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
            <div className="grid items-center gap-4 md:grid-cols-[240px_1fr]">
              <AngleArt label={g('angleTitle')} />
              <div>
                <h3 className="font-semibold">{g('angleTitle')}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{g('angleBody')}</p>
              </div>
            </div>
            <Tip>{g('unitsTip')}</Tip>
          </TabsContent>

          <TabsContent value="constraints" className="mt-4 space-y-4">
            <div className="grid items-start gap-4 md:grid-cols-[240px_1fr]">
              <ConstraintArt label={g('consTitle')} />
              <div>
                <h3 className="font-semibold">{g('consTitle')}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{g('consIntro')}</p>
                <ul className="mt-3 space-y-2 text-sm">
                  <li><span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded bg-violet-500/15 text-xs font-bold text-violet-700 dark:text-violet-300">H</span>{g('consH')}</li>
                  <li><span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded bg-violet-500/15 text-xs font-bold text-violet-700 dark:text-violet-300">V</span>{g('consV')}</li>
                  <li><span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded bg-violet-500/15 text-xs font-bold text-violet-700 dark:text-violet-300">●</span>{g('consC')}</li>
                </ul>
              </div>
            </div>
            <Tip>
              <Kbd>Ctrl</Kbd> {plus} {g('mouseClick')} — {g('consSkip')}
            </Tip>
            <div className="rounded-xl border bg-card p-4 text-sm">
              <p>{g('consManual')}</p>
              <p className="mt-2 text-muted-foreground">{g('consStatus')}</p>
            </div>
          </TabsContent>

          <TabsContent value="modify" className="mt-4 space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <figure className="space-y-2"><TrimArt label={t('facilityMap.sketchTrim')} /><figcaption className="text-center text-xs text-muted-foreground">{t('facilityMap.sketchTrim')}</figcaption></figure>
              <figure className="space-y-2"><OffsetArt label={t('facilityMap.sketchOffset')} /><figcaption className="text-center text-xs text-muted-foreground">{t('facilityMap.sketchOffset')}</figcaption></figure>
              <figure className="space-y-2"><DimensionArt label={t('facilityMap.sketchDimensionTool')} /><figcaption className="text-center text-xs text-muted-foreground">{t('facilityMap.sketchDimensionTool')}</figcaption></figure>
            </div>
            <ul className="grid gap-2 md:grid-cols-2">
              <ToolRow icon={Scissors} name={t('facilityMap.sketchTrim')} shortcut="X" body={g('modTrim')} />
              <ToolRow icon={ArrowUpRight} name={t('facilityMap.sketchExtend')} shortcut="E" body={g('modExtend')} />
              <ToolRow icon={Split} name={t('facilityMap.sketchBreak')} shortcut="B" body={g('modBreak')} />
              <ToolRow icon={Rows3} name={t('facilityMap.sketchOffset')} shortcut="O" body={g('modOffset')} />
              <ToolRow icon={Ruler} name={t('facilityMap.sketchDimensionTool')} shortcut="D" body={g('modDimension')} />
              <ToolRow icon={MousePointer2} name={t('facilityMap.toolSelect')} shortcut="Esc" body={g('modSelect')} />
            </ul>
          </TabsContent>

          <TabsContent value="shortcuts" className="mt-4">
            <div className="grid gap-3 md:grid-cols-2">
              <ShortcutTable
                title={g('groupTools')}
                rows={[
                  [<Kbd key="l">L</Kbd>, t('facilityMap.toolLine')],
                  [<Kbd key="p">P</Kbd>, t('facilityMap.toolPolyline')],
                  [<Kbd key="a">A</Kbd>, t('facilityMap.toolArc')],
                  [<Kbd key="r">R</Kbd>, t('facilityMap.toolRectangle')],
                  [<Kbd key="c">C</Kbd>, t('facilityMap.toolCircle')],
                  [<Kbd key="d">D</Kbd>, t('facilityMap.sketchDimensionTool')],
                  [<Kbd key="x">X</Kbd>, t('facilityMap.sketchTrim')],
                  [<Kbd key="e">E</Kbd>, t('facilityMap.sketchExtend')],
                  [<Kbd key="b">B</Kbd>, t('facilityMap.sketchBreak')],
                  [<Kbd key="o">O</Kbd>, t('facilityMap.sketchOffset')],
                ]}
              />
              <div className="space-y-3">
                <ShortcutTable
                  title={g('groupDrawing')}
                  rows={[
                    [<><Kbd>0</Kbd>…<Kbd>9</Kbd></>, g('keyType')],
                    [<Kbd key="tab">Tab</Kbd>, g('keyTab')],
                    [<Kbd key="enter">Enter</Kbd>, g('keyEnter')],
                    [<Kbd key="esc">Esc</Kbd>, g('keyEsc')],
                    [<Kbd key="rc">{g('mouseRight')}</Kbd>, g('keyRightClick')],
                    [<><Kbd>Ctrl</Kbd>{plus}<Kbd>{g('mouseClick')}</Kbd></>, g('keyCtrlClick')],
                    [<Kbd key="space">Space</Kbd>, g('keySpace')],
                  ]}
                />
                <ShortcutTable
                  title={g('groupEditing')}
                  rows={[
                    [<><Kbd>Ctrl</Kbd>{plus}<Kbd>Z</Kbd></>, g('keyUndo')],
                    [<><Kbd>Ctrl</Kbd>{plus}<Kbd>Y</Kbd></>, g('keyRedo')],
                    [<Kbd key="del">Delete</Kbd>, g('keyDelete')],
                    [<><Kbd>Ctrl</Kbd>{plus}<Kbd>D</Kbd></>, g('keyDuplicate')],
                    [<Kbd key="shift">Shift</Kbd>, g('keyShift')],
                  ]}
                />
                <ShortcutTable
                  title={g('groupView')}
                  rows={[
                    [<Kbd key="wheel">{g('mouseWheel')}</Kbd>, g('keyWheel')],
                    [<Kbd key="middle">{g('mouseMiddle')}</Kbd>, g('keyMiddle')],
                    [<Kbd key="f">F</Kbd>, g('keyFit')],
                    [<><Kbd>?</Kbd><Kbd>F1</Kbd></>, g('keyHelp')],
                  ]}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex flex-col-reverse gap-2 border-t px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Keyboard className="h-4 w-4 shrink-0" />
            {g('footer')}
          </p>
          <Button onClick={() => onOpenChange(false)}>{g('gotIt')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
