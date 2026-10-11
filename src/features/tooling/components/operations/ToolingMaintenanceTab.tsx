import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Ban, CalendarClock, ClipboardCheck, ClipboardList, Hammer, Plus, Search, Trash2, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import EmptyState from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { ToolingUsabilityBadge } from '@/features/tooling/components/ToolingStatusBadges';
import type { ToolingTabProps } from '@/features/tooling/components/toolingTabProps';
import {
  useRecordToolingVerification,
  useSetToolingUsability,
  useToolingVerifications,
  useToolingWorkOrders,
} from '@/features/tooling/hooks/useTooling';
import {
  TOOLING_VERIFICATION_RESULTS,
  TOOLING_VERIFICATION_TYPES,
  type ToolingOutOfServiceState,
  type ToolingOverview,
  type ToolingVerification,
  type ToolingVerificationResult,
  type ToolingVerificationType,
  type ToolingWorkOrderSummary,
} from '@/features/tooling/types';
import { toolingErrorMessage } from '@/features/tooling/utils/toolingErrors';
import { formatToolingNumber } from '@/features/tooling/utils/toolingLife';
import { useFormatTimestamp } from '@/hooks/useFormatTimestamp';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

const NONE = '__none__';

/** Admin-only out-of-service transitions offered here (quarantine lives on Issue / Return). */
const ADMIN_OUT_OF_SERVICE: ReadonlyArray<{ state: Exclude<ToolingOutOfServiceState, 'quarantined'>; icon: typeof Wrench }> = [
  { state: 'under_repair', icon: Hammer },
  { state: 'pending_inspection', icon: Search },
  { state: 'blocked', icon: Ban },
  { state: 'retired', icon: Trash2 },
];

const WORK_ORDER_STATUSES = ['submitted', 'accepted', 'assigned', 'in_progress', 'on_hold', 'completed', 'cancelled'] as const;
const WORK_ORDER_PRIORITIES = ['low', 'medium', 'high'] as const;

const RESULT_CLASS: Record<ToolingVerificationResult, string> = {
  pass: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  fail: 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300',
  conditional: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
};

function isVerificationType(value: string): value is ToolingVerificationType {
  return (TOOLING_VERIFICATION_TYPES as readonly string[]).includes(value);
}

function isVerificationResult(value: string): value is ToolingVerificationResult {
  return (TOOLING_VERIFICATION_RESULTS as readonly string[]).includes(value);
}

/** Date-only values (YYYY-MM-DD) are anchored at noon UTC so time zones never shift the day. */
function dateOnly(value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value;
}

function FieldError({ show, message }: { show: boolean; message: string }) {
  if (!show) return null;
  return (
    <p className="text-sm text-destructive" role="alert">
      {message}
    </p>
  );
}

function useWorkOrderLabels() {
  const { t } = useI18n();
  return {
    status: (status: string) =>
      (WORK_ORDER_STATUSES as readonly string[]).includes(status) ? t(`toolingOps.workOrders.statuses.${status}`) : status,
    priority: (priority: string) =>
      (WORK_ORDER_PRIORITIES as readonly string[]).includes(priority) ? t(`toolingOps.workOrders.priorities.${priority}`) : priority,
  };
}

// ---------------------------------------------------------------------------
// Due indicators
// ---------------------------------------------------------------------------

function Indicator({ label, value, tone }: { label: string; value: string; tone?: 'danger' | 'warning' }) {
  return (
    <div
      className={cn(
        'min-w-0 rounded-md border p-3',
        tone === 'danger' && 'border-destructive/50 bg-destructive/5',
        tone === 'warning' && 'border-orange-500/40 bg-orange-500/5',
      )}
    >
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'mt-1 break-words text-sm font-semibold',
          tone === 'danger' && 'text-destructive',
          tone === 'warning' && 'text-orange-700 dark:text-orange-300',
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function DueIndicators({ tool }: { tool: ToolingOverview }) {
  const { t, language } = useI18n();
  const { formatDate, formatDateTime } = useFormatTimestamp();
  const unit = t(`tooling.units.${tool.usage_unit}`);

  const maintenanceValue =
    tool.maintenance_interval == null
      ? t('toolingOps.due.noMaintenanceInterval')
      : tool.maintenance_due
        ? t('toolingOps.due.maintenanceDueNow', {
            value: formatToolingNumber(tool.usage_since_maintenance, language),
            interval: formatToolingNumber(tool.maintenance_interval, language),
            unit,
          })
        : t('toolingOps.due.maintenanceIn', {
            value: formatToolingNumber(Number(tool.maintenance_interval) - Number(tool.usage_since_maintenance), language),
            unit,
          });

  const inspectionValue = tool.next_inspection_due
    ? tool.inspection_overdue
      ? t('toolingOps.due.overdueSince', { date: formatDate(dateOnly(tool.next_inspection_due)) })
      : formatDate(dateOnly(tool.next_inspection_due))
    : t('toolingOps.due.notScheduled');

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="h-4 w-4" aria-hidden="true" />
          {t('toolingOps.due.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Indicator
            label={t('toolingOps.due.maintenance')}
            value={maintenanceValue}
            tone={tool.maintenance_due ? 'warning' : undefined}
          />
          <Indicator
            label={t('toolingOps.due.nextInspection')}
            value={inspectionValue}
            tone={tool.inspection_overdue ? 'danger' : undefined}
          />
          <Indicator
            label={t('toolingOps.due.lastInspection')}
            value={tool.last_inspection_at ? formatDateTime(tool.last_inspection_at) : t('toolingOps.due.never')}
          />
          <Indicator
            label={t('toolingOps.due.lastMaintenance')}
            value={tool.last_maintenance_at ? formatDateTime(tool.last_maintenance_at) : t('toolingOps.due.never')}
          />
        </dl>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Linked work orders
// ---------------------------------------------------------------------------

function WorkOrdersCard({
  tool,
  canOperate,
  workOrders,
  loading,
  failed,
}: {
  tool: ToolingOverview;
  canOperate: boolean;
  workOrders: ToolingWorkOrderSummary[];
  loading: boolean;
  failed: boolean;
}) {
  const { t } = useI18n();
  const { formatDate } = useFormatTimestamp();
  const labels = useWorkOrderLabels();
  const createPath = `/dashboard/equipment/${tool.id}?createWorkOrder=1`;
  const createButton = canOperate ? (
    <Button asChild size="sm" className="w-full sm:w-auto">
      <Link to={createPath}>
        <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
        {t('toolingOps.workOrders.create')}
      </Link>
    </Button>
  ) : null;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 pb-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4" aria-hidden="true" />
            {t('toolingOps.workOrders.title')}
          </CardTitle>
          <CardDescription>{t('toolingOps.workOrders.description')}</CardDescription>
        </div>
        {workOrders.length > 0 && createButton}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2" aria-busy="true" aria-label={t('toolingOps.common.loading')}>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : failed ? (
          <Alert variant="destructive">
            <AlertDescription>{t('toolingOps.common.loadFailed')}</AlertDescription>
          </Alert>
        ) : workOrders.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={t('toolingOps.workOrders.emptyTitle')}
            description={t('toolingOps.workOrders.emptyDescription')}
            action={createButton}
            className="py-8"
          />
        ) : (
          <ul className="divide-y rounded-md border">
            {workOrders.map((wo) => (
              <li key={wo.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <Link
                    to={`/dashboard/work-orders/${wo.id}`}
                    className="break-words font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {wo.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {t('toolingOps.workOrders.created', { date: formatDate(wo.created_date) })}
                    {wo.completed_date ? ` · ${t('toolingOps.workOrders.completed', { date: formatDate(wo.completed_date) })}` : ''}
                    {!wo.completed_date && wo.due_date ? ` · ${t('toolingOps.workOrders.due', { date: formatDate(dateOnly(wo.due_date)) })}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {wo.has_pm && <Badge variant="outline">{t('toolingOps.workOrders.pm')}</Badge>}
                  <Badge variant={wo.status === 'completed' ? 'secondary' : 'default'}>{labels.status(wo.status)}</Badge>
                  <Badge variant={wo.priority === 'high' ? 'destructive' : 'outline'}>
                    {t('toolingOps.workOrders.priorityLabel', { priority: labels.priority(wo.priority) })}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Out-of-service dialog (admin)
// ---------------------------------------------------------------------------

function OutOfServiceDialog({
  tool,
  state,
  onOpenChange,
}: {
  tool: ToolingOverview;
  state: Exclude<ToolingOutOfServiceState, 'quarantined'>;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const setUsability = useSetToolingUsability(tool.id);
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const reasonMissing = reason.trim().length === 0;
  const stateLabel = t(`tooling.usability.${state}`);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (reasonMissing) return;
    setUsability.mutate(
      { state, reason: reason.trim() },
      {
        onSuccess: () => {
          toast.success(t('toolingOps.outOfService.success', { state: stateLabel }));
          onOpenChange(false);
        },
        onError: (error) => toast.error(toolingErrorMessage(error, t)),
      },
    );
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <DialogHeader>
            <DialogTitle>{t(`toolingOps.outOfService.actions.${state}`)}</DialogTitle>
            <DialogDescription>{t(`toolingOps.outOfService.descriptions.${state}`)}</DialogDescription>
          </DialogHeader>
          <p className="text-sm">
            {t('toolingOps.outOfService.transition', {
              from: t(`tooling.usability.${tool.usability_state}`),
              to: stateLabel,
            })}
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="tooling-oos-reason">{t('tooling.reason')}</Label>
            <Textarea
              id="tooling-oos-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={1000}
              aria-invalid={submitted && reasonMissing}
            />
            <FieldError show={submitted && reasonMissing} message={t('tooling.reasonRequired')} />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={setUsability.isPending}>
              {t('tooling.cancel')}
            </Button>
            <Button type="submit" variant={state === 'retired' ? 'destructive' : 'default'} disabled={setUsability.isPending}>
              {setUsability.isPending ? t('tooling.saving') : t('tooling.confirm')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Record inspection dialog
// ---------------------------------------------------------------------------

function RecordInspectionDialog({
  tool,
  canManage,
  workOrders,
  onOpenChange,
}: {
  tool: ToolingOverview;
  canManage: boolean;
  workOrders: ToolingWorkOrderSummary[];
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const record = useRecordToolingVerification(tool.id);
  const [type, setType] = useState<ToolingVerificationType>(
    tool.usability_state === 'under_repair' ? 'post_repair' : 'periodic',
  );
  const [result, setResult] = useState<ToolingVerificationResult | ''>('');
  const [findings, setFindings] = useState('');
  const [workOrderId, setWorkOrderId] = useState(NONE);
  const [maintenanceCompleted, setMaintenanceCompleted] = useState(false);
  const [nextDue, setNextDue] = useState('');
  const [returnToService, setReturnToService] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const resultMissing = result === '';
  const outOfService = tool.usability_state !== 'available' && tool.usability_state !== 'retired';
  const rtsBlockedByLimit = tool.life_limit_reached;
  const rtsEnabled = canManage && result === 'pass' && outOfService && !rtsBlockedByLimit;
  const failWhileIssued = result === 'fail' && tool.is_issued;
  const nextDueInvalid = nextDue !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(nextDue);

  const rtsHint = !outOfService
    ? t('toolingOps.inspection.rtsNotNeeded')
    : rtsBlockedByLimit
      ? t('toolingOps.inspection.rtsBlockedByLimit')
      : result !== 'pass'
        ? t('toolingOps.inspection.rtsRequiresPass')
        : t('toolingOps.inspection.rtsHelp');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (result === '' || failWhileIssued || nextDueInvalid) return;
    const releasing = rtsEnabled && returnToService;
    record.mutate(
      {
        verificationType: type,
        result,
        findings: findings.trim() || null,
        workOrderId: workOrderId === NONE ? null : workOrderId,
        maintenanceCompleted,
        returnToService: releasing,
        nextDue: nextDue || null,
      },
      {
        onSuccess: () => {
          toast.success(releasing ? t('toolingOps.inspection.successReleased') : t('toolingOps.inspection.success'));
          onOpenChange(false);
        },
        onError: (error) => toast.error(toolingErrorMessage(error, t)),
      },
    );
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <DialogHeader>
            <DialogTitle>{t('toolingOps.inspection.title')}</DialogTitle>
            <DialogDescription>{t('toolingOps.inspection.description')}</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tooling-inspection-type">{t('toolingOps.inspection.type')}</Label>
              <Select value={type} onValueChange={(value) => isVerificationType(value) && setType(value)}>
                <SelectTrigger id="tooling-inspection-type" aria-label={t('toolingOps.inspection.type')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TOOLING_VERIFICATION_TYPES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`tooling.verificationTypes.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tooling-inspection-result">{t('toolingOps.inspection.result')}</Label>
              <Select
                value={result}
                onValueChange={(value) => {
                  if (!isVerificationResult(value)) return;
                  setResult(value);
                  if (value !== 'pass') setReturnToService(false);
                }}
              >
                <SelectTrigger
                  id="tooling-inspection-result"
                  aria-label={t('toolingOps.inspection.result')}
                  aria-invalid={submitted && resultMissing}
                >
                  <SelectValue placeholder={t('toolingOps.inspection.resultPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {TOOLING_VERIFICATION_RESULTS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`tooling.verificationResults.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError show={submitted && resultMissing} message={t('toolingOps.inspection.resultRequired')} />
            </div>
          </div>

          {result === 'fail' && (
            <p className={cn('text-xs', failWhileIssued ? 'text-destructive' : 'text-muted-foreground')} role={failWhileIssued ? 'alert' : undefined}>
              {failWhileIssued ? t('tooling.errors.TOOLING_ISSUED_RETURN_FIRST') : t('toolingOps.inspection.failQuarantines')}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="tooling-inspection-findings">
              {t('toolingOps.inspection.findings')} <span className="text-muted-foreground">({t('tooling.optional')})</span>
            </Label>
            <Textarea id="tooling-inspection-findings" value={findings} onChange={(e) => setFindings(e.target.value)} rows={3} maxLength={4000} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tooling-inspection-wo">
              {t('toolingOps.inspection.workOrder')} <span className="text-muted-foreground">({t('tooling.optional')})</span>
            </Label>
            <Select value={workOrderId} onValueChange={setWorkOrderId}>
              <SelectTrigger id="tooling-inspection-wo" aria-label={t('toolingOps.inspection.workOrder')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{t('toolingOps.common.noneOption')}</SelectItem>
                {workOrders.map((wo) => (
                  <SelectItem key={wo.id} value={wo.id}>
                    {wo.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-start gap-2 rounded-md border p-3">
            <Checkbox
              id="tooling-inspection-maintenance"
              checked={maintenanceCompleted}
              onCheckedChange={(checked) => setMaintenanceCompleted(checked === true)}
              className="mt-0.5"
            />
            <div className="space-y-1">
              <Label htmlFor="tooling-inspection-maintenance">{t('toolingOps.inspection.maintenanceCompleted')}</Label>
              <p className="text-xs text-muted-foreground">{t('toolingOps.inspection.maintenanceHelp')}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tooling-inspection-next">
              {t('toolingOps.inspection.nextDue')} <span className="text-muted-foreground">({t('tooling.optional')})</span>
            </Label>
            <Input
              id="tooling-inspection-next"
              type="date"
              value={nextDue}
              onChange={(e) => setNextDue(e.target.value)}
              aria-invalid={submitted && nextDueInvalid}
            />
            <p className="text-xs text-muted-foreground">{t('toolingOps.inspection.nextDueHelp')}</p>
            <FieldError show={submitted && nextDueInvalid} message={t('toolingOps.inspection.nextDueInvalid')} />
          </div>

          {canManage && (
            <div className={cn('flex items-start gap-2 rounded-md border p-3', rtsEnabled && 'border-emerald-500/40 bg-emerald-500/5')}>
              <Checkbox
                id="tooling-inspection-rts"
                checked={rtsEnabled && returnToService}
                disabled={!rtsEnabled}
                onCheckedChange={(checked) => setReturnToService(checked === true)}
                className="mt-0.5"
                aria-describedby="tooling-inspection-rts-help"
              />
              <div className="space-y-1">
                <Label htmlFor="tooling-inspection-rts" className={cn(!rtsEnabled && 'text-muted-foreground')}>
                  {t('toolingOps.inspection.returnToService')}
                </Label>
                <p id="tooling-inspection-rts-help" className="text-xs text-muted-foreground">
                  {rtsHint}
                </p>
              </div>
            </div>
          )}
          {!canManage && outOfService && (
            <p className="text-xs text-muted-foreground">{t('toolingOps.inspection.rtsAdminOnly')}</p>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={record.isPending}>
              {t('tooling.cancel')}
            </Button>
            <Button type="submit" disabled={record.isPending}>
              {record.isPending ? t('tooling.saving') : t('toolingOps.inspection.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Inspection history
// ---------------------------------------------------------------------------

function ResultBadge({ result }: { result: ToolingVerificationResult }) {
  const { t } = useI18n();
  return (
    <Badge variant="outline" className={RESULT_CLASS[result]}>
      {t(`tooling.verificationResults.${result}`)}
    </Badge>
  );
}

function UsabilityTransition({ verification }: { verification: ToolingVerification }) {
  if (verification.usability_before === verification.usability_after) {
    return <ToolingUsabilityBadge state={verification.usability_after} />;
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <ToolingUsabilityBadge state={verification.usability_before} />
      <span aria-hidden="true">→</span>
      <ToolingUsabilityBadge state={verification.usability_after} />
    </span>
  );
}

function InspectionHistory({
  verifications,
  workOrders,
  loading,
  failed,
}: {
  verifications: ToolingVerification[];
  workOrders: ToolingWorkOrderSummary[];
  loading: boolean;
  failed: boolean;
}) {
  const { t } = useI18n();
  const { formatDateTime } = useFormatTimestamp();
  const none = t('tooling.none');
  const woTitle = (id: string) => workOrders.find((wo) => wo.id === id)?.title ?? t('toolingOps.inspections.openWorkOrder');

  const woLink = (verification: ToolingVerification) =>
    verification.work_order_id ? (
      <Link
        to={`/dashboard/work-orders/${verification.work_order_id}`}
        className="break-words text-primary underline-offset-4 hover:underline"
      >
        {woTitle(verification.work_order_id)}
      </Link>
    ) : (
      none
    );

  const approval = (verification: ToolingVerification) =>
    verification.returned_to_service && verification.approved_at
      ? t('toolingOps.inspections.approvedLine', {
          name: verification.approved_by_name ?? none,
          time: formatDateTime(verification.approved_at),
        })
      : none;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
          {t('toolingOps.inspections.title')}
        </CardTitle>
        <CardDescription>{t('toolingOps.inspections.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2" aria-busy="true" aria-label={t('toolingOps.common.loading')}>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : failed ? (
          <Alert variant="destructive">
            <AlertDescription>{t('toolingOps.common.loadFailed')}</AlertDescription>
          </Alert>
        ) : verifications.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t('toolingOps.inspections.empty')}</p>
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('toolingOps.inspections.time')}</TableHead>
                    <TableHead>{t('toolingOps.inspection.type')}</TableHead>
                    <TableHead>{t('toolingOps.inspection.result')}</TableHead>
                    <TableHead>{t('toolingOps.inspection.findings')}</TableHead>
                    <TableHead>{t('toolingOps.inspection.workOrder')}</TableHead>
                    <TableHead>{t('toolingOps.inspections.maintenance')}</TableHead>
                    <TableHead>{t('toolingOps.inspections.usability')}</TableHead>
                    <TableHead>{t('toolingOps.inspections.inspector')}</TableHead>
                    <TableHead>{t('toolingOps.inspections.returnToService')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {verifications.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="whitespace-nowrap">{formatDateTime(v.inspected_at)}</TableCell>
                      <TableCell>{t(`tooling.verificationTypes.${v.verification_type}`)}</TableCell>
                      <TableCell>
                        <ResultBadge result={v.result} />
                      </TableCell>
                      <TableCell className="max-w-[16rem] break-words">{v.findings ?? none}</TableCell>
                      <TableCell className="max-w-[12rem]">{woLink(v)}</TableCell>
                      <TableCell>{v.maintenance_completed ? t('tooling.yes') : t('tooling.no')}</TableCell>
                      <TableCell>
                        <UsabilityTransition verification={v} />
                      </TableCell>
                      <TableCell>{v.inspected_by_name ?? none}</TableCell>
                      <TableCell className="text-xs">{approval(v)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <ul className="space-y-3 md:hidden">
              {verifications.map((v) => (
                <li key={v.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="break-words font-medium">{t(`tooling.verificationTypes.${v.verification_type}`)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(v.inspected_at)} · {v.inspected_by_name ?? none}
                      </p>
                    </div>
                    <ResultBadge result={v.result} />
                  </div>
                  <dl className="mt-2 grid grid-cols-1 gap-2">
                    {v.findings && (
                      <div>
                        <dt className="text-xs text-muted-foreground">{t('toolingOps.inspection.findings')}</dt>
                        <dd className="break-words">{v.findings}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-xs text-muted-foreground">{t('toolingOps.inspections.usability')}</dt>
                      <dd>
                        <UsabilityTransition verification={v} />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">{t('toolingOps.inspections.maintenance')}</dt>
                      <dd>{v.maintenance_completed ? t('tooling.yes') : t('tooling.no')}</dd>
                    </div>
                    {v.work_order_id && (
                      <div>
                        <dt className="text-xs text-muted-foreground">{t('toolingOps.inspection.workOrder')}</dt>
                        <dd>{woLink(v)}</dd>
                      </div>
                    )}
                    {v.returned_to_service && (
                      <div>
                        <dt className="text-xs text-muted-foreground">{t('toolingOps.inspections.returnToService')}</dt>
                        <dd className="break-words">{approval(v)}</dd>
                      </div>
                    )}
                  </dl>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Tab
// ---------------------------------------------------------------------------

type DialogKind = { kind: 'inspection' } | { kind: 'oos'; state: Exclude<ToolingOutOfServiceState, 'quarantined'> } | null;

export function ToolingMaintenanceTab({ tool, canManage, canOperate }: ToolingTabProps) {
  const { t } = useI18n();
  const [dialog, setDialog] = useState<DialogKind>(null);
  const workOrdersQuery = useToolingWorkOrders(tool.id);
  const verificationsQuery = useToolingVerifications(tool.id);
  const workOrders = workOrdersQuery.data ?? [];
  const retired = tool.usability_state === 'retired';
  const closeDialog = (open: boolean) => {
    if (!open) setDialog(null);
  };

  return (
    <div className="space-y-4">
      <DueIndicators tool={tool} />

      {canOperate && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('toolingOps.inspection.sectionTitle')}</CardTitle>
            <CardDescription>{t('toolingOps.inspection.sectionDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={() => setDialog({ kind: 'inspection' })} disabled={retired} className="w-full sm:w-auto">
              <ClipboardCheck className="mr-2 h-4 w-4" aria-hidden="true" />
              {t('toolingOps.inspection.button')}
            </Button>
            {retired && <p className="text-xs text-muted-foreground">{t('toolingOps.inspection.retiredHint')}</p>}
          </CardContent>
        </Card>
      )}

      {canManage && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('toolingOps.outOfService.title')}</CardTitle>
            <CardDescription>{t('toolingOps.outOfService.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap">
              {ADMIN_OUT_OF_SERVICE.map(({ state, icon: Icon }) => (
                <Button
                  key={state}
                  variant={state === 'retired' ? 'destructive' : 'outline'}
                  onClick={() => setDialog({ kind: 'oos', state })}
                  disabled={tool.is_issued || retired || tool.usability_state === state}
                  aria-describedby={tool.is_issued || retired ? 'tooling-oos-disabled-reason' : undefined}
                >
                  <Icon className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t(`toolingOps.outOfService.actions.${state}`)}
                </Button>
              ))}
            </div>
            {(tool.is_issued || retired) && (
              <p id="tooling-oos-disabled-reason" className="text-xs text-muted-foreground">
                {retired ? t('toolingOps.outOfService.retiredHint') : t('toolingOps.outOfService.issuedHint')}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <WorkOrdersCard
        tool={tool}
        canOperate={canOperate}
        workOrders={workOrders}
        loading={workOrdersQuery.isLoading}
        failed={Boolean(workOrdersQuery.error)}
      />

      <InspectionHistory
        verifications={verificationsQuery.data ?? []}
        workOrders={workOrders}
        loading={verificationsQuery.isLoading}
        failed={Boolean(verificationsQuery.error)}
      />

      {dialog?.kind === 'inspection' && (
        <RecordInspectionDialog tool={tool} canManage={canManage} workOrders={workOrders} onOpenChange={closeDialog} />
      )}
      {dialog?.kind === 'oos' && <OutOfServiceDialog tool={tool} state={dialog.state} onOpenChange={closeDialog} />}
    </div>
  );
}
