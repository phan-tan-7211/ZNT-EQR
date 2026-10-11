import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import type { ToolingOverview, ToolingUsabilityState } from '@/features/tooling/types';

const USABILITY_CLASS: Record<ToolingUsabilityState, string> = {
  available: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  quarantined: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  under_repair: 'border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-300',
  pending_inspection: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  blocked: 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300',
  retired: 'border-muted-foreground/30 bg-muted text-muted-foreground',
};

export function ToolingUsabilityBadge({ state, className }: { state: ToolingUsabilityState; className?: string }) {
  const { t } = useI18n();
  return (
    <Badge variant="outline" className={cn(USABILITY_CLASS[state], className)} data-testid="tooling-usability-badge">
      {t(`tooling.usability.${state}`)}
    </Badge>
  );
}

/**
 * Compact status cluster used in the list and detail header: usability,
 * approval, issued state and life / due indicators.
 */
export function ToolingStatusBadges({
  tool,
  className,
}: {
  tool: Pick<
    ToolingOverview,
    | 'usability_state'
    | 'approval_status'
    | 'is_issued'
    | 'warning_reached'
    | 'life_limit_reached'
    | 'maintenance_due'
    | 'inspection_overdue'
  >;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <ToolingUsabilityBadge state={tool.usability_state} />
      {tool.approval_status !== 'approved' && (
        <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300">
          {t('tooling.approval.pending')}
        </Badge>
      )}
      <Badge variant={tool.is_issued ? 'default' : 'secondary'} data-testid="tooling-issued-badge">
        {tool.is_issued ? t('tooling.status.issued') : t('tooling.status.inStorage')}
      </Badge>
      {tool.life_limit_reached ? (
        <Badge variant="destructive">{t('tooling.status.lifeLimit')}</Badge>
      ) : tool.warning_reached ? (
        <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300">
          {t('tooling.status.warning')}
        </Badge>
      ) : null}
      {tool.maintenance_due && (
        <Badge variant="outline" className="border-orange-500/40 text-orange-700 dark:text-orange-300">
          {t('tooling.status.maintenanceDue')}
        </Badge>
      )}
      {tool.inspection_overdue && <Badge variant="destructive">{t('tooling.status.inspectionOverdue')}</Badge>}
    </div>
  );
}
