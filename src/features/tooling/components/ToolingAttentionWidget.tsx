import { useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertOctagon,
  AlertTriangle,
  CalendarX,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  UserCheck,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrganization } from '@/contexts/OrganizationContext';
import { SelectedTeamContext, UNASSIGNED_TEAM_ID, type SelectedTeamId } from '@/contexts/selected-team-context';
import { useToolingList } from '@/features/tooling/hooks/useTooling';
import type { ToolingOverview, ToolingUsabilityState } from '@/features/tooling/types';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

const PREVIEW_LIMIT = 5;

/** Out-of-service states that need someone to act (retired tools are excluded entirely). */
const OUT_OF_SERVICE_STATES: readonly ToolingUsabilityState[] = [
  'quarantined',
  'under_repair',
  'pending_inspection',
  'blocked',
];

type AttentionReason =
  | { kind: 'lifeLimit' }
  | { kind: 'inspectionOverdue' }
  | { kind: 'outOfService'; state: ToolingUsabilityState }
  | { kind: 'warning' }
  | { kind: 'maintenanceDue' };
type AttentionKind = AttentionReason['kind'];

type Tone = 'danger' | 'warning' | 'caution' | 'info';

/** Lower rank = more severe; drives the preview order. */
const REASON_RANK: Record<AttentionKind, number> = {
  lifeLimit: 0,
  inspectionOverdue: 1,
  outOfService: 2,
  warning: 3,
  maintenanceDue: 4,
};

const REASON_TONE: Record<AttentionKind, Tone> = {
  lifeLimit: 'danger',
  inspectionOverdue: 'danger',
  outOfService: 'caution',
  warning: 'warning',
  maintenanceDue: 'caution',
};

const TONE_TEXT: Record<Tone, string> = {
  danger: 'text-destructive',
  warning: 'text-amber-700 dark:text-amber-300',
  caution: 'text-orange-700 dark:text-orange-300',
  info: 'text-sky-700 dark:text-sky-300',
};

const TONE_TILE: Record<Tone, string> = {
  danger: 'border-destructive/40 bg-destructive/5',
  warning: 'border-amber-500/40 bg-amber-500/5',
  caution: 'border-orange-500/40 bg-orange-500/5',
  info: 'border-sky-500/40 bg-sky-500/5',
};

const TONE_BADGE: Record<Tone, string> = {
  danger: 'border-destructive/40 bg-destructive/10 text-destructive',
  warning: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  caution: 'border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-300',
  info: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300',
};

const TONE_STRIPE: Record<Tone, string> = {
  danger: 'bg-destructive',
  warning: 'bg-amber-500',
  caution: 'bg-orange-500',
  info: 'bg-sky-500',
};

/** TopBar team scope, like the other dashboard widgets (null / missing = all teams). */
function inSelectedTeam(tool: ToolingOverview, selectedTeamId: SelectedTeamId | undefined): boolean {
  if (selectedTeamId === null || selectedTeamId === undefined) return true;
  if (selectedTeamId === UNASSIGNED_TEAM_ID) return tool.team_id === null;
  return tool.team_id === selectedTeamId;
}

function attentionReasons(tool: ToolingOverview): AttentionReason[] {
  if (tool.usability_state === 'retired') return [];
  const reasons: AttentionReason[] = [];
  if (tool.life_limit_reached) reasons.push({ kind: 'lifeLimit' });
  if (tool.inspection_overdue) reasons.push({ kind: 'inspectionOverdue' });
  if (OUT_OF_SERVICE_STATES.includes(tool.usability_state)) {
    reasons.push({ kind: 'outOfService', state: tool.usability_state });
  }
  if (tool.warning_reached && !tool.life_limit_reached) reasons.push({ kind: 'warning' });
  if (tool.maintenance_due) reasons.push({ kind: 'maintenanceDue' });
  return reasons;
}

interface AttentionItem {
  tool: ToolingOverview;
  reasons: AttentionReason[];
}

interface AttentionSummary {
  total: number;
  counts: Record<AttentionKind, number>;
  issued: number;
  items: AttentionItem[];
}

function summarize(tools: ToolingOverview[]): AttentionSummary {
  const counts: Record<AttentionKind, number> = {
    lifeLimit: 0,
    inspectionOverdue: 0,
    outOfService: 0,
    warning: 0,
    maintenanceDue: 0,
  };
  let issued = 0;
  const items: AttentionItem[] = [];
  for (const tool of tools) {
    if (tool.is_issued) issued += 1;
    const reasons = attentionReasons(tool);
    if (reasons.length === 0) continue;
    for (const reason of reasons) counts[reason.kind] += 1;
    items.push({ tool, reasons });
  }
  items.sort(
    (a, b) =>
      REASON_RANK[a.reasons[0].kind] - REASON_RANK[b.reasons[0].kind] ||
      b.reasons.length - a.reasons.length ||
      (a.tool.management_code ?? a.tool.name).localeCompare(b.tool.management_code ?? b.tool.name),
  );
  return { total: tools.length, counts, issued, items };
}

const COUNT_TILES: ReadonlyArray<{ kind: AttentionKind; icon: LucideIcon }> = [
  { kind: 'lifeLimit', icon: AlertOctagon },
  { kind: 'warning', icon: AlertTriangle },
  { kind: 'inspectionOverdue', icon: CalendarX },
  { kind: 'maintenanceDue', icon: Wrench },
  { kind: 'outOfService', icon: ShieldAlert },
];

function CountTile({ label, count, tone, icon: Icon }: { label: string; count: number; tone: Tone; icon: LucideIcon }) {
  const active = count > 0;
  return (
    <div
      className={cn('min-w-0 rounded-md border p-2.5', active ? TONE_TILE[tone] : 'border-border')}
      data-testid="tooling-attention-count"
    >
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className={cn('h-3.5 w-3.5 shrink-0', active && TONE_TEXT[tone])} aria-hidden="true" />
        <span className="truncate">{label}</span>
      </dt>
      <dd className={cn('mt-1 text-xl font-semibold tabular-nums', active ? TONE_TEXT[tone] : 'text-foreground')}>
        {count}
      </dd>
    </div>
  );
}

function WidgetSkeleton({ label }: { label: string }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label={label} data-testid="tooling-attention-loading">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-11 w-full" />
        ))}
      </div>
    </div>
  );
}

const ROW_LINK_CLASS = cn(
  '-mx-3 flex min-h-[44px] items-center gap-3 py-2 pl-3 pr-2 transition-colors',
  'hover:bg-muted/60 dark:hover:bg-white/[0.04]',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
);

/**
 * Dashboard widget (`tooling-attention`): tools that need action (life limit /
 * warning, overdue inspection, maintenance due, out of service) plus the
 * currently issued count. Reads `tooling_overview` (RLS: org members), so each
 * role sees the same read-only data the Tooling list shows them, narrowed to
 * the TopBar team scope.
 */
const ToolingAttentionWidget = () => {
  const { t } = useI18n();
  const { currentOrganization } = useOrganization();
  const selectedTeamId = useContext(SelectedTeamContext)?.selectedTeamId;
  const { data: tools, isLoading, error } = useToolingList(currentOrganization?.id);
  const summary = useMemo(
    () => summarize((tools ?? []).filter((tool) => inSelectedTeam(tool, selectedTeamId))),
    [tools, selectedTeamId],
  );
  const attentionCount = summary.items.length;
  const preview = summary.items.slice(0, PREVIEW_LIMIT);
  const remaining = attentionCount - preview.length;

  const reasonLabel = (reason: AttentionReason) =>
    reason.kind === 'outOfService'
      ? t(`tooling.usability.${reason.state}`)
      : t(`toolingInsights.widget.reasons.${reason.kind}`);

  return (
    <section aria-labelledby="tooling-attention-widget-title" className="h-full">
      <Card className="flex h-full flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle as="h2" id="tooling-attention-widget-title" className="flex items-center gap-2 text-base">
              <Wrench className="h-4 w-4" aria-hidden="true" />
              {t('toolingInsights.widget.title')}
            </CardTitle>
            {!isLoading && !error && attentionCount > 0 && (
              <Badge variant="destructive" className="shrink-0" data-testid="tooling-attention-total">
                {t('toolingInsights.widget.attentionBadge', { count: attentionCount })}
              </Badge>
            )}
          </div>
          <CardDescription className="opacity-75">{t('toolingInsights.widget.description')}</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 space-y-3 pb-4">
          {isLoading ? (
            <WidgetSkeleton label={t('toolingInsights.widget.loading')} />
          ) : error ? (
            <Alert variant="destructive">
              <AlertDescription>{t('toolingInsights.widget.loadFailed')}</AlertDescription>
            </Alert>
          ) : (
            <>
              <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label={t('toolingInsights.widget.summaryLabel')}>
                {COUNT_TILES.map(({ kind, icon }) => (
                  <CountTile
                    key={kind}
                    label={t(`toolingInsights.widget.counts.${kind}`)}
                    count={summary.counts[kind]}
                    tone={REASON_TONE[kind]}
                    icon={icon}
                  />
                ))}
                <CountTile
                  label={t('toolingInsights.widget.counts.issued')}
                  count={summary.issued}
                  tone="info"
                  icon={UserCheck}
                />
              </dl>

              {attentionCount === 0 ? (
                <div
                  className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3"
                  data-testid="tooling-attention-empty"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{t('toolingInsights.widget.allOkTitle')}</p>
                    <p className="text-xs text-muted-foreground">
                      {summary.total === 0
                        ? t('toolingInsights.widget.noToolsDescription')
                        : t('toolingInsights.widget.allOkDescription')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <ul className="divide-y divide-border/50" aria-label={t('toolingInsights.widget.listLabel')}>
                    {preview.map(({ tool, reasons }) => {
                      const [primary, ...rest] = reasons;
                      const tone = REASON_TONE[primary.kind];
                      return (
                        <li key={tool.id}>
                          <Link to={`/dashboard/tooling/${tool.id}`} className={ROW_LINK_CLASS} data-testid="tooling-attention-item">
                            <span className={cn('h-8 w-1 shrink-0 rounded-full', TONE_STRIPE[tone])} aria-hidden="true" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium leading-tight">{tool.name}</p>
                              {tool.management_code && (
                                <p className="truncate font-mono text-xs text-muted-foreground">{tool.management_code}</p>
                              )}
                            </div>
                            <div className="flex min-w-0 shrink-0 items-center gap-1">
                              <Badge variant="outline" className={cn('max-w-[9rem] truncate sm:max-w-none', TONE_BADGE[tone])}>
                                {reasonLabel(primary)}
                              </Badge>
                              {rest.length > 0 && (
                                <Badge variant="outline" title={rest.map(reasonLabel).join(', ')}>
                                  <span aria-hidden="true">
                                    {t('toolingInsights.widget.moreReasons', { count: rest.length })}
                                  </span>
                                  <span className="sr-only">
                                    {t('toolingInsights.widget.moreReasonsLabel', { count: rest.length })}
                                  </span>
                                </Badge>
                              )}
                            </div>
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" aria-hidden="true" />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                  {remaining > 0 && (
                    <p className="text-xs text-muted-foreground" data-testid="tooling-attention-more">
                      {t('toolingInsights.widget.moreTools', { count: remaining })}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
        {!isLoading && (
          <CardFooter className="border-t border-border/50 pt-0">
            <Link
              to="/dashboard/tooling"
              className="inline-flex min-h-[44px] touch-manipulation items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80 hover:underline active:text-primary/70"
            >
              {t('toolingInsights.widget.viewAll')}
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </CardFooter>
        )}
      </Card>
    </section>
  );
};

export default ToolingAttentionWidget;
