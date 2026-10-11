import { useState, type FormEvent, type ReactNode } from 'react';
import { AlertTriangle, Gauge, OctagonAlert, Pencil, Plus, Settings2, Scale } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import type { ToolingTabProps } from '@/features/tooling/components/toolingTabProps';
import {
  useCorrectToolingUsage,
  useRecordToolingLimitDisposition,
  useRecordToolingUsage,
  useSetToolingLifeLimits,
  useToolingUsageLogs,
} from '@/features/tooling/hooks/useTooling';
import {
  TOOLING_USAGE_UNITS,
  type ToolingLimitDisposition,
  type ToolingOverview,
  type ToolingUsageLog,
  type ToolingUsageUnit,
} from '@/features/tooling/types';
import { toolingErrorMessage } from '@/features/tooling/utils/toolingErrors';
import {
  formatToolingNumber,
  toolingLifePercent,
  toolingLifeTone,
  toolingRemainingLife,
  type ToolingLifeTone,
} from '@/features/tooling/utils/toolingLife';
import { useFormatTimestamp } from '@/hooks/useFormatTimestamp';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

/** Empty → null, invalid → undefined. */
function parseOptionalNumber(value: string): number | null | undefined {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function numberInputValue(value: number | null): string {
  return value == null ? '' : String(value);
}

function isUsageUnit(value: string): value is ToolingUsageUnit {
  return (TOOLING_USAGE_UNITS as readonly string[]).includes(value);
}

const TONE_BAR: Record<ToolingLifeTone, string> = {
  ok: '[&>div]:bg-emerald-500',
  warning: '[&>div]:bg-amber-500',
  limit: '[&>div]:bg-destructive',
  none: '[&>div]:bg-muted-foreground',
};

function FieldError({ show, message }: { show: boolean; message: string }) {
  if (!show) return null;
  return (
    <p className="text-sm text-destructive" role="alert">
      {message}
    </p>
  );
}

function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  onSubmit,
  pending,
  submitLabel,
  submitVariant = 'default',
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onSubmit: (event: FormEvent) => void;
  pending: boolean;
  submitLabel: string;
  submitVariant?: 'default' | 'destructive';
  children: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {children}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              {t('tooling.cancel')}
            </Button>
            <Button type="submit" variant={submitVariant} disabled={pending}>
              {pending ? t('tooling.saving') : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type DialogProps = { tool: ToolingOverview; open: boolean; onOpenChange: (open: boolean) => void };

// ---------------------------------------------------------------------------
// Record usage
// ---------------------------------------------------------------------------

function RecordUsageDialog({ tool, open, onOpenChange }: DialogProps) {
  const { t, language } = useI18n();
  const record = useRecordToolingUsage(tool.id);
  const [quantity, setQuantity] = useState('');
  const [production, setProduction] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const quantityValue = parseOptionalNumber(quantity);
  const quantityInvalid = quantityValue == null || quantityValue <= 0;
  const productionValue = parseOptionalNumber(production);
  const productionInvalid = productionValue === undefined || (productionValue !== null && productionValue < 0);
  const unit = t(`tooling.units.${tool.usage_unit}`);
  const projected = quantityInvalid ? null : Number(tool.cumulative_usage) + (quantityValue as number);
  const willReachLimit = projected != null && tool.life_limit != null && projected >= Number(tool.life_limit);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (quantityInvalid || productionInvalid) return;
    record.mutate(
      { quantity: quantityValue as number, productionQuantity: productionValue ?? null, notes: notes.trim() || null },
      {
        onSuccess: () => {
          toast.success(t('toolingOps.usage.recordSuccess'));
          onOpenChange(false);
        },
        onError: (error) => toast.error(toolingErrorMessage(error, t)),
      },
    );
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('toolingOps.usage.recordTitle')}
      description={t('toolingOps.usage.recordDescription')}
      onSubmit={handleSubmit}
      pending={record.isPending}
      submitLabel={t('toolingOps.usage.recordSubmit')}
    >
      <div className="space-y-1.5">
        <Label htmlFor="tooling-usage-quantity">{t('toolingOps.usage.quantity', { unit })}</Label>
        <Input
          id="tooling-usage-quantity"
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          aria-invalid={submitted && quantityInvalid}
        />
        <FieldError show={submitted && quantityInvalid} message={t('toolingOps.usage.quantityPositive')} />
        {projected != null && (
          <p className="text-xs text-muted-foreground">
            {t('toolingOps.usage.projected', { value: formatToolingNumber(projected, language), unit })}
          </p>
        )}
        {willReachLimit && <p className="text-xs text-destructive">{t('toolingOps.usage.willReachLimit')}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="tooling-usage-production">
          {t('toolingOps.usage.productionQuantity')} <span className="text-muted-foreground">({t('tooling.optional')})</span>
        </Label>
        <Input
          id="tooling-usage-production"
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          value={production}
          onChange={(e) => setProduction(e.target.value)}
          aria-invalid={submitted && productionInvalid}
        />
        <FieldError show={submitted && productionInvalid} message={t('toolingOps.common.invalidNumber')} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="tooling-usage-notes">
          {t('tooling.notes')} <span className="text-muted-foreground">({t('tooling.optional')})</span>
        </Label>
        <Textarea id="tooling-usage-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={1000} />
      </div>
    </FormDialog>
  );
}

// ---------------------------------------------------------------------------
// Correct usage (admin)
// ---------------------------------------------------------------------------

function CorrectUsageDialog({ tool, open, onOpenChange }: DialogProps) {
  const { t, language } = useI18n();
  const correct = useCorrectToolingUsage(tool.id);
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const deltaValue = parseOptionalNumber(delta);
  const deltaInvalid = deltaValue == null || deltaValue === 0;
  const resulting = deltaInvalid ? null : Number(tool.cumulative_usage) + (deltaValue as number);
  const negative = resulting != null && resulting < 0;
  const reasonMissing = reason.trim().length === 0;
  const unit = t(`tooling.units.${tool.usage_unit}`);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (deltaInvalid || negative || reasonMissing) return;
    correct.mutate(
      { delta: deltaValue as number, reason: reason.trim() },
      {
        onSuccess: () => {
          toast.success(t('toolingOps.correct.success'));
          onOpenChange(false);
        },
        onError: (error) => toast.error(toolingErrorMessage(error, t)),
      },
    );
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('toolingOps.correct.title')}
      description={t('toolingOps.correct.description')}
      onSubmit={handleSubmit}
      pending={correct.isPending}
      submitLabel={t('toolingOps.correct.submit')}
    >
      <div className="space-y-1.5">
        <Label htmlFor="tooling-correct-delta">{t('toolingOps.correct.delta', { unit })}</Label>
        <Input
          id="tooling-correct-delta"
          type="number"
          inputMode="decimal"
          step="any"
          value={delta}
          onChange={(e) => setDelta(e.target.value)}
          aria-invalid={submitted && (deltaInvalid || negative)}
        />
        <p className="text-xs text-muted-foreground">{t('toolingOps.correct.deltaHelp')}</p>
        <FieldError show={submitted && deltaInvalid} message={t('toolingOps.correct.deltaNonZero')} />
        {resulting != null && (
          <p className={cn('text-sm', negative ? 'text-destructive' : 'text-muted-foreground')} role={negative ? 'alert' : undefined}>
            {negative
              ? t('toolingOps.correct.negative')
              : t('toolingOps.correct.preview', {
                  from: formatToolingNumber(tool.cumulative_usage, language),
                  to: formatToolingNumber(resulting, language),
                  unit,
                })}
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="tooling-correct-reason">{t('tooling.reason')}</Label>
        <Textarea
          id="tooling-correct-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={1000}
          aria-invalid={submitted && reasonMissing}
        />
        <FieldError show={submitted && reasonMissing} message={t('tooling.reasonRequired')} />
      </div>
    </FormDialog>
  );
}

// ---------------------------------------------------------------------------
// Life limits (admin)
// ---------------------------------------------------------------------------

function LifeLimitsDialog({ tool, open, onOpenChange }: DialogProps) {
  const { t } = useI18n();
  const setLimits = useSetToolingLifeLimits(tool.id);
  const [unit, setUnit] = useState<ToolingUsageUnit>(tool.usage_unit);
  const [warning, setWarning] = useState(numberInputValue(tool.warning_limit));
  const [life, setLife] = useState(numberInputValue(tool.life_limit));
  const [maintenance, setMaintenance] = useState(numberInputValue(tool.maintenance_interval));
  const [inspectionDays, setInspectionDays] = useState(numberInputValue(tool.inspection_interval_days));
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const unitLocked = Number(tool.cumulative_usage) > 0;
  const warningValue = parseOptionalNumber(warning);
  const lifeValue = parseOptionalNumber(life);
  const maintenanceValue = parseOptionalNumber(maintenance);
  const inspectionValue = parseOptionalNumber(inspectionDays);

  const positiveOrEmpty = (value: number | null | undefined) => value === null || (value !== undefined && value > 0);
  const warningInvalid = !positiveOrEmpty(warningValue);
  const lifeInvalid = !positiveOrEmpty(lifeValue);
  const maintenanceInvalid = !positiveOrEmpty(maintenanceValue);
  const inspectionInvalid =
    !positiveOrEmpty(inspectionValue) || (inspectionValue != null && !Number.isInteger(inspectionValue));
  const orderInvalid =
    !warningInvalid && !lifeInvalid && warningValue != null && lifeValue != null && warningValue > lifeValue;
  const raisesReachedLimit =
    tool.life_limit_reached && !lifeInvalid && (lifeValue == null || lifeValue > Number(tool.life_limit));
  const hasError = warningInvalid || lifeInvalid || maintenanceInvalid || inspectionInvalid || orderInvalid || raisesReachedLimit;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (hasError) return;
    setLimits.mutate(
      {
        usageUnit: unitLocked ? tool.usage_unit : unit,
        warningLimit: warningValue ?? null,
        lifeLimit: lifeValue ?? null,
        maintenanceInterval: maintenanceValue ?? null,
        inspectionIntervalDays: inspectionValue ?? null,
        reason: reason.trim() || null,
      },
      {
        onSuccess: () => {
          toast.success(t('toolingOps.limits.success'));
          onOpenChange(false);
        },
        onError: (error) => toast.error(toolingErrorMessage(error, t)),
      },
    );
  };

  const numberField = (
    id: string,
    label: string,
    value: string,
    onChange: (value: string) => void,
    invalid: boolean,
    help?: string,
    step: string = 'any',
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label} <span className="text-muted-foreground">({t('tooling.optional')})</span>
      </Label>
      <Input
        id={id}
        type="number"
        inputMode={step === '1' ? 'numeric' : 'decimal'}
        min={0}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={submitted && invalid}
      />
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
      <FieldError show={submitted && invalid} message={t('toolingOps.limits.positiveOrEmpty')} />
    </div>
  );

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('toolingOps.limits.title')}
      description={t('toolingOps.limits.description')}
      onSubmit={handleSubmit}
      pending={setLimits.isPending}
      submitLabel={t('tooling.save')}
    >
      {tool.life_limit_reached && (
        <Alert>
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertDescription>{t('toolingOps.limits.reachedHint')}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="tooling-limits-unit">{t('toolingOps.limits.unit')}</Label>
        <Select value={unitLocked ? tool.usage_unit : unit} onValueChange={(value) => isUsageUnit(value) && setUnit(value)} disabled={unitLocked}>
          <SelectTrigger id="tooling-limits-unit" aria-label={t('toolingOps.limits.unit')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TOOLING_USAGE_UNITS.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`tooling.unitLabels.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {unitLocked && <p className="text-xs text-muted-foreground">{t('toolingOps.limits.unitLocked')}</p>}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {numberField('tooling-limits-warning', t('toolingOps.limits.warningLimit'), warning, setWarning, warningInvalid)}
        {numberField('tooling-limits-life', t('toolingOps.limits.lifeLimit'), life, setLife, lifeInvalid)}
      </div>
      <FieldError show={submitted && orderInvalid} message={t('toolingOps.limits.warningAboveLife')} />
      <FieldError show={submitted && raisesReachedLimit} message={t('toolingOps.limits.raiseNeedsDisposition')} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {numberField(
          'tooling-limits-maintenance',
          t('toolingOps.limits.maintenanceInterval'),
          maintenance,
          setMaintenance,
          maintenanceInvalid,
          t('toolingOps.limits.maintenanceIntervalHelp'),
        )}
        {numberField(
          'tooling-limits-inspection',
          t('toolingOps.limits.inspectionIntervalDays'),
          inspectionDays,
          setInspectionDays,
          inspectionInvalid,
          t('toolingOps.limits.inspectionIntervalHelp'),
          '1',
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="tooling-limits-reason">
          {t('tooling.reason')} <span className="text-muted-foreground">({t('tooling.optional')})</span>
        </Label>
        <Textarea id="tooling-limits-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={1000} />
      </div>
    </FormDialog>
  );
}

// ---------------------------------------------------------------------------
// Limit disposition (admin)
// ---------------------------------------------------------------------------

function DispositionDialog({ tool, open, onOpenChange }: DialogProps) {
  const { t, language } = useI18n();
  const record = useRecordToolingLimitDisposition(tool.id);
  const [disposition, setDisposition] = useState<ToolingLimitDisposition>('extend_life');
  const [newLimit, setNewLimit] = useState('');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const limitValue = parseOptionalNumber(newLimit);
  const limitInvalid = disposition === 'extend_life' && (limitValue == null || limitValue <= Number(tool.cumulative_usage));
  const reasonMissing = reason.trim().length === 0;
  const unit = t(`tooling.units.${tool.usage_unit}`);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (limitInvalid || reasonMissing) return;
    if (disposition === 'retire' && tool.is_issued) {
      toast.error(t('tooling.errors.TOOLING_ISSUED_RETURN_FIRST'));
      return;
    }
    record.mutate(
      { disposition, newLifeLimit: disposition === 'extend_life' ? (limitValue as number) : null, reason: reason.trim() },
      {
        onSuccess: () => {
          toast.success(disposition === 'retire' ? t('toolingOps.disposition.retireSuccess') : t('toolingOps.disposition.extendSuccess'));
          onOpenChange(false);
        },
        onError: (error) => toast.error(toolingErrorMessage(error, t)),
      },
    );
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('toolingOps.disposition.title')}
      description={t('toolingOps.disposition.description', {
        usage: formatToolingNumber(tool.cumulative_usage, language),
        limit: formatToolingNumber(tool.life_limit, language),
        unit,
      })}
      onSubmit={handleSubmit}
      pending={record.isPending}
      submitLabel={t('toolingOps.disposition.submit')}
      submitVariant={disposition === 'retire' ? 'destructive' : 'default'}
    >
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-medium">{t('toolingOps.disposition.choice')}</legend>
        <RadioGroup
          value={disposition}
          onValueChange={(value) => setDisposition(value === 'retire' ? 'retire' : 'extend_life')}
          className="space-y-2"
        >
          <div className="flex items-start gap-2">
            <RadioGroupItem id="tooling-disposition-extend" value="extend_life" className="mt-0.5" />
            <div>
              <Label htmlFor="tooling-disposition-extend">{t('toolingOps.disposition.extend')}</Label>
              <p className="text-xs text-muted-foreground">{t('toolingOps.disposition.extendHelp')}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <RadioGroupItem id="tooling-disposition-retire" value="retire" className="mt-0.5" />
            <div>
              <Label htmlFor="tooling-disposition-retire">{t('toolingOps.disposition.retire')}</Label>
              <p className="text-xs text-muted-foreground">{t('toolingOps.disposition.retireHelp')}</p>
            </div>
          </div>
        </RadioGroup>
      </fieldset>
      {disposition === 'extend_life' && (
        <div className="space-y-1.5">
          <Label htmlFor="tooling-disposition-limit">{t('toolingOps.disposition.newLimit', { unit })}</Label>
          <Input
            id="tooling-disposition-limit"
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={newLimit}
            onChange={(e) => setNewLimit(e.target.value)}
            aria-invalid={submitted && limitInvalid}
          />
          <FieldError
            show={submitted && limitInvalid}
            message={t('toolingOps.disposition.newLimitInvalid', {
              usage: formatToolingNumber(tool.cumulative_usage, language),
              unit,
            })}
          />
        </div>
      )}
      {disposition === 'retire' && tool.is_issued && (
        <p className="text-sm text-destructive">{t('tooling.errors.TOOLING_ISSUED_RETURN_FIRST')}</p>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="tooling-disposition-reason">{t('tooling.reason')}</Label>
        <Textarea
          id="tooling-disposition-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={1000}
          aria-invalid={submitted && reasonMissing}
        />
        <FieldError show={submitted && reasonMissing} message={t('tooling.reasonRequired')} />
      </div>
    </FormDialog>
  );
}

// ---------------------------------------------------------------------------
// Tool life card
// ---------------------------------------------------------------------------

function Metric({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="min-w-0 rounded-md border p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn('mt-1 break-words text-lg font-semibold tabular-nums', emphasis && 'text-destructive')}>{value}</dd>
    </div>
  );
}

function ToolLifeCard({ tool }: { tool: ToolingOverview }) {
  const { t, language } = useI18n();
  const unit = t(`tooling.units.${tool.usage_unit}`);
  const percent = toolingLifePercent(tool);
  const remaining = toolingRemainingLife(tool);
  const tone = toolingLifeTone(tool);
  const withUnit = (value: number | null) =>
    value == null ? t('toolingOps.life.notSet') : `${formatToolingNumber(value, language)} ${unit}`;
  const maintenancePercent =
    tool.maintenance_interval && tool.maintenance_interval > 0
      ? Math.min(100, (Number(tool.usage_since_maintenance) / Number(tool.maintenance_interval)) * 100)
      : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Gauge className="h-4 w-4" aria-hidden="true" />
          {t('toolingOps.life.title')}
        </CardTitle>
        <CardDescription>
          {t('toolingOps.life.unitLine', { unit: t(`tooling.unitLabels.${tool.usage_unit}`) })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label={t('toolingOps.life.cumulative')} value={withUnit(Number(tool.cumulative_usage))} />
          <Metric label={t('toolingOps.life.warningLimit')} value={withUnit(tool.warning_limit)} />
          <Metric label={t('toolingOps.life.lifeLimit')} value={withUnit(tool.life_limit)} />
          <Metric
            label={t('toolingOps.life.remaining')}
            value={withUnit(remaining)}
            emphasis={remaining != null && remaining <= 0}
          />
        </dl>

        {percent != null ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span>{t('toolingOps.life.consumed')}</span>
              <span className="tabular-nums">{t('toolingOps.life.percent', { value: formatToolingNumber(percent, language) })}</span>
            </div>
            <Progress
              value={Math.min(100, percent)}
              className={cn('h-3', TONE_BAR[tone])}
              aria-label={t('toolingOps.life.consumed')}
              data-testid="tooling-life-progress"
              data-tone={tone}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('toolingOps.life.noLimit')}</p>
        )}

        <div className="space-y-1.5 rounded-md border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span>{t('toolingOps.life.sinceMaintenance')}</span>
            <span className="tabular-nums">
              {tool.maintenance_interval != null
                ? t('toolingOps.life.sinceMaintenanceOf', {
                    value: formatToolingNumber(tool.usage_since_maintenance, language),
                    interval: formatToolingNumber(tool.maintenance_interval, language),
                    unit,
                  })
                : withUnit(Number(tool.usage_since_maintenance))}
            </span>
          </div>
          {maintenancePercent != null && (
            <Progress
              value={maintenancePercent}
              className={cn('h-2', tool.maintenance_due ? TONE_BAR.warning : TONE_BAR.ok)}
              aria-label={t('toolingOps.life.sinceMaintenance')}
            />
          )}
          {tool.maintenance_interval == null && (
            <p className="text-xs text-muted-foreground">{t('toolingOps.life.noMaintenanceInterval')}</p>
          )}
          {tool.maintenance_due && (
            <Badge variant="outline" className="border-orange-500/40 text-orange-700 dark:text-orange-300">
              {t('tooling.status.maintenanceDue')}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Ledger
// ---------------------------------------------------------------------------

function UsageLedger({ logs, loading, failed }: { logs: ToolingUsageLog[]; loading: boolean; failed: boolean }) {
  const { t, language } = useI18n();
  const { formatDateTime } = useFormatTimestamp();
  const none = t('tooling.none');
  const signed = (log: ToolingUsageLog) => {
    const value = Number(log.quantity);
    const formatted = formatToolingNumber(Math.abs(value), language);
    return `${value < 0 ? '−' : '+'}${formatted} ${t(`tooling.units.${log.usage_unit}`)}`;
  };
  const typeBadge = (log: ToolingUsageLog) =>
    log.entry_type === 'correction' ? (
      <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300">
        {t('toolingOps.ledger.correction')}
      </Badge>
    ) : (
      <Badge variant="secondary">{t('toolingOps.ledger.usage')}</Badge>
    );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('toolingOps.ledger.title')}</CardTitle>
        <CardDescription>{t('toolingOps.ledger.description')}</CardDescription>
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
        ) : logs.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t('toolingOps.ledger.empty')}</p>
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('toolingOps.ledger.time')}</TableHead>
                    <TableHead>{t('toolingOps.ledger.type')}</TableHead>
                    <TableHead className="text-right">{t('toolingOps.ledger.quantity')}</TableHead>
                    <TableHead className="text-right">{t('toolingOps.ledger.production')}</TableHead>
                    <TableHead className="text-right">{t('toolingOps.ledger.cumulativeAfter')}</TableHead>
                    <TableHead>{t('toolingOps.ledger.reason')}</TableHead>
                    <TableHead>{t('toolingOps.ledger.recordedBy')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">{formatDateTime(log.recorded_at)}</TableCell>
                      <TableCell>{typeBadge(log)}</TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums">{signed(log)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {log.production_quantity == null ? none : formatToolingNumber(log.production_quantity, language)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatToolingNumber(log.cumulative_after, language)}</TableCell>
                      <TableCell className="max-w-[18rem] break-words">{log.reason ?? none}</TableCell>
                      <TableCell>{log.recorded_by_name ?? none}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <ul className="space-y-3 md:hidden">
              {logs.map((log) => (
                <li key={log.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold tabular-nums">{signed(log)}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(log.recorded_at)}</p>
                    </div>
                    {typeBadge(log)}
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-2">
                    <div>
                      <dt className="text-xs text-muted-foreground">{t('toolingOps.ledger.cumulativeAfter')}</dt>
                      <dd className="tabular-nums">{formatToolingNumber(log.cumulative_after, language)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">{t('toolingOps.ledger.production')}</dt>
                      <dd className="tabular-nums">
                        {log.production_quantity == null ? none : formatToolingNumber(log.production_quantity, language)}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-xs text-muted-foreground">{t('toolingOps.ledger.reason')}</dt>
                      <dd className="break-words">{log.reason ?? none}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-xs text-muted-foreground">{t('toolingOps.ledger.recordedBy')}</dt>
                      <dd className="break-words">{log.recorded_by_name ?? none}</dd>
                    </div>
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

type DialogKind = 'record' | 'correct' | 'limits' | 'disposition' | null;

export function ToolingUsageTab({ tool, canManage, canOperate }: ToolingTabProps) {
  const { t } = useI18n();
  const [dialog, setDialog] = useState<DialogKind>(null);
  const { data: logs = [], isLoading, error } = useToolingUsageLogs(tool.id);
  const retired = tool.usability_state === 'retired';
  const closeDialog = (open: boolean) => {
    if (!open) setDialog(null);
  };

  return (
    <div className="space-y-4">
      {tool.life_limit_reached ? (
        <Alert variant="destructive" data-testid="tooling-life-limit-alert">
          <OctagonAlert className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>{t('toolingOps.life.limitReachedTitle')}</AlertTitle>
          <AlertDescription>
            {canManage ? t('toolingOps.life.limitReachedAdmin') : t('toolingOps.life.limitReachedOperator')}
          </AlertDescription>
        </Alert>
      ) : tool.warning_reached ? (
        <Alert className="border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200" data-testid="tooling-life-warning-alert">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>{t('toolingOps.life.warningTitle')}</AlertTitle>
          <AlertDescription>{t('toolingOps.life.warningDescription')}</AlertDescription>
        </Alert>
      ) : null}

      <ToolLifeCard tool={tool} />

      {(canOperate || canManage) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {canOperate && (
            <Button onClick={() => setDialog('record')} disabled={retired} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              {t('toolingOps.usage.recordButton')}
            </Button>
          )}
          {canManage && (
            <>
              <Button variant="outline" onClick={() => setDialog('correct')} className="w-full sm:w-auto">
                <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                {t('toolingOps.correct.button')}
              </Button>
              <Button variant="outline" onClick={() => setDialog('limits')} disabled={retired} className="w-full sm:w-auto">
                <Settings2 className="mr-2 h-4 w-4" aria-hidden="true" />
                {t('toolingOps.limits.button')}
              </Button>
              {tool.life_limit_reached && !retired && (
                <Button variant="destructive" onClick={() => setDialog('disposition')} className="w-full sm:w-auto">
                  <Scale className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t('toolingOps.disposition.button')}
                </Button>
              )}
            </>
          )}
        </div>
      )}
      {retired && (canOperate || canManage) && (
        <p className="text-xs text-muted-foreground">{t('toolingOps.usage.retiredHint')}</p>
      )}
      {!canManage && canOperate && <p className="text-xs text-muted-foreground">{t('toolingOps.usage.adminOnlyHint')}</p>}

      <UsageLedger logs={logs} loading={isLoading} failed={Boolean(error)} />

      {dialog === 'record' && <RecordUsageDialog tool={tool} open onOpenChange={closeDialog} />}
      {dialog === 'correct' && <CorrectUsageDialog tool={tool} open onOpenChange={closeDialog} />}
      {dialog === 'limits' && <LifeLimitsDialog tool={tool} open onOpenChange={closeDialog} />}
      {dialog === 'disposition' && <DispositionDialog tool={tool} open onOpenChange={closeDialog} />}
    </div>
  );
}
