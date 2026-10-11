import { Link } from 'react-router-dom';
import { History } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import EmptyState from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import type { ToolingTabProps } from '@/features/tooling/components/toolingTabProps';
import { useToolingEvents } from '@/features/tooling/hooks/useTooling';
import type { ToolingEvent } from '@/features/tooling/types';
import { useI18n } from '@/i18n';

const USABILITY_EVENTS = new Set<ToolingEvent['event_type']>(['usability_changed', 'returned_to_service']);
const USABILITY_VALUES = new Set(['available', 'quarantined', 'under_repair', 'pending_inspection', 'blocked', 'retired']);
const APPROVAL_VALUES = new Set(['pending', 'approved', 'rejected']);

function formatTimestamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function ToolingHistoryTab({ tool, canManage }: ToolingTabProps) {
  const { t } = useI18n();
  const { data: events = [], isLoading, error } = useToolingEvents(tool.id);

  /** Translate enum values for usability / approval events; keep others raw. */
  const displayValue = (event: ToolingEvent, value: string | null): string | null => {
    if (value == null || value === '') return null;
    if (USABILITY_EVENTS.has(event.event_type) && USABILITY_VALUES.has(value)) return t(`tooling.usability.${value}`);
    if (event.event_type === 'approved' && APPROVAL_VALUES.has(value)) return t(`tooling.approval.${value}`);
    return value;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('toolingMaster.history.title')}</CardTitle>
        <CardDescription>{t('toolingMaster.history.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          {t('toolingMaster.history.auditNote')}
          {canManage && (
            <>
              {' '}
              <Link
                to="/dashboard/organization/audit-log"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {t('toolingMaster.history.openAudit')}
              </Link>
            </>
          )}
        </p>

        {isLoading ? (
          <div className="space-y-2" aria-busy="true" aria-label={t('tooling.loading')}>
            {[0, 1, 2].map((row) => (
              <Skeleton key={row} className="h-16 w-full" />
            ))}
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertDescription>{t('toolingMaster.history.loadFailed')}</AlertDescription>
          </Alert>
        ) : events.length === 0 ? (
          <EmptyState icon={History} title={t('toolingMaster.history.empty')} />
        ) : (
          <ol className="relative space-y-4 border-l border-border pl-5" data-testid="tooling-history">
            {events.map((event) => {
              const from = displayValue(event, event.from_value);
              const to = displayValue(event, event.to_value);
              return (
                <li key={event.id} className="relative">
                  <span
                    className="absolute -left-[1.6rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary"
                    aria-hidden="true"
                  />
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                    <p className="text-sm font-medium">{t(`tooling.events.${event.event_type}`)}</p>
                    <time dateTime={event.created_at} className="shrink-0 text-xs text-muted-foreground">
                      {formatTimestamp(event.created_at)}
                    </time>
                  </div>
                  {(from || to) && (
                    <p className="mt-1 break-words text-sm">
                      {from && (
                        <>
                          <span className="text-muted-foreground">{t('toolingMaster.history.from')}: </span>
                          <span>{from}</span>
                        </>
                      )}
                      {from && to && <span className="mx-1.5 text-muted-foreground" aria-hidden="true">→</span>}
                      {to && (
                        <>
                          <span className="text-muted-foreground">{t('toolingMaster.history.to')}: </span>
                          <span>{to}</span>
                        </>
                      )}
                    </p>
                  )}
                  {event.reason && (
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm">
                      <span className="text-muted-foreground">{t('toolingMaster.history.reason')}: </span>
                      {event.reason}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('toolingMaster.history.by', { name: event.actor_name ?? t('toolingMaster.history.system') })}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
