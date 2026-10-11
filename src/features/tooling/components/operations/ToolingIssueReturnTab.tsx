import { useMemo, useState, type FormEvent } from 'react';
import { AlertTriangle, ArrowLeftRight, LogIn, LogOut, ShieldAlert } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useOrganizationMembersQuery } from '@/features/organization/hooks/useOrganizationMembers';
import type { ToolingTabProps } from '@/features/tooling/components/toolingTabProps';
import {
  useIssueTooling,
  useMachineCandidates,
  useProductParts,
  useProductionOperations,
  useReturnTooling,
  useSetToolingUsability,
  useToolingAssignments,
  useToolingCompatibility,
  useTransferToolingLocation,
} from '@/features/tooling/hooks/useTooling';
import {
  TOOLING_CONDITIONS,
  type ToolingAssignment,
  type ToolingCompatibility,
  type ToolingCondition,
  type ToolingOverview,
} from '@/features/tooling/types';
import { toolingKeys } from '@/features/tooling/hooks/toolingKeys';
import { extractToolingErrorCode, toolingErrorMessage } from '@/features/tooling/utils/toolingErrors';
import { formatToolingNumber, toolingIssueBlockers } from '@/features/tooling/utils/toolingLife';
import { useAuth } from '@/hooks/useAuth';
import { useFormatTimestamp } from '@/hooks/useFormatTimestamp';
import { useI18n } from '@/i18n';

const NONE = '__none__';

type Option = { id: string; label: string };
type Translate = (key: string, params?: Record<string, string | number>) => string;

/** Empty → null, invalid → undefined. */
function parseOptionalNumber(value: string): number | null | undefined {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isConditionValue(value: string): value is ToolingCondition {
  return (TOOLING_CONDITIONS as readonly string[]).includes(value);
}

function machineLabel(machine: { name: string; management_code: string | null }): string {
  return machine.management_code ? `${machine.management_code} · ${machine.name}` : machine.name;
}

function codeLabel(code: string, name: string): string {
  return `${code} · ${name}`;
}

function isRuleEffective(rule: ToolingCompatibility, today: string): boolean {
  if (!rule.is_active || rule.approval_status !== 'approved') return false;
  if (rule.effective_from && rule.effective_from > today) return false;
  if (rule.effective_to && rule.effective_to < today) return false;
  return true;
}

function uniqueOptions(options: Option[]): Option[] {
  const seen = new Map<string, Option>();
  for (const option of options) if (!seen.has(option.id)) seen.set(option.id, option);
  return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label));
}

function assignmentContext(assignment: ToolingAssignment): string[] {
  const parts: string[] = [];
  if (assignment.product_part) parts.push(codeLabel(assignment.product_part.part_number, assignment.product_part.name));
  if (assignment.operation) parts.push(codeLabel(assignment.operation.code, assignment.operation.name));
  if (assignment.machine) parts.push(machineLabel(assignment.machine));
  return parts;
}

// ---------------------------------------------------------------------------
// Optional select with a "None" entry
// ---------------------------------------------------------------------------

function OptionalSelect({
  id,
  label,
  value,
  onChange,
  options,
  noneLabel,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  noneLabel: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} aria-label={label}>
          <SelectValue placeholder={noneLabel} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>{noneLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Issue dialog
// ---------------------------------------------------------------------------

function IssueToolDialog({ tool, open, onOpenChange }: { tool: ToolingOverview; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const issue = useIssueTooling(tool.id);
  const { data: members = [], isLoading: membersLoading } = useOrganizationMembersQuery(tool.organization_id);
  const { data: rules = [] } = useToolingCompatibility(tool.id);
  const { data: products = [] } = useProductParts(tool.organization_id);
  const { data: operations = [] } = useProductionOperations(tool.organization_id);
  const { data: machines = [] } = useMachineCandidates(tool.organization_id, open);

  const [recipient, setRecipient] = useState<string>(user?.id ?? '');
  const [productId, setProductId] = useState(NONE);
  const [operationId, setOperationId] = useState(NONE);
  const [machineId, setMachineId] = useState(NONE);
  const [location, setLocation] = useState('');
  const [condition, setCondition] = useState<ToolingCondition>(tool.condition);
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const activeMembers = useMemo(
    () => members.filter((member) => member.status === 'active').map((member) => ({ id: member.userId, label: member.name })),
    [members],
  );

  const effectiveRules = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return rules.filter((rule) => isRuleEffective(rule, today));
  }, [rules]);
  const restrictToRules = effectiveRules.length > 0;

  const productOptions = useMemo<Option[]>(() => {
    if (restrictToRules) {
      return uniqueOptions(
        effectiveRules.flatMap((rule) =>
          rule.product_part ? [{ id: rule.product_part.id, label: codeLabel(rule.product_part.part_number, rule.product_part.name) }] : [],
        ),
      );
    }
    return products.filter((p) => p.is_active).map((p) => ({ id: p.id, label: codeLabel(p.part_number, p.name) }));
  }, [restrictToRules, effectiveRules, products]);

  const operationOptions = useMemo<Option[]>(() => {
    if (restrictToRules) {
      return uniqueOptions(
        effectiveRules.flatMap((rule) =>
          rule.operation ? [{ id: rule.operation.id, label: codeLabel(rule.operation.code, rule.operation.name) }] : [],
        ),
      );
    }
    return operations.filter((o) => o.is_active).map((o) => ({ id: o.id, label: codeLabel(o.code, o.name) }));
  }, [restrictToRules, effectiveRules, operations]);

  const machineOptions = useMemo<Option[]>(() => {
    if (restrictToRules) {
      return uniqueOptions(
        effectiveRules.flatMap((rule) => (rule.machine ? [{ id: rule.machine.id, label: machineLabel(rule.machine) }] : [])),
      );
    }
    return machines.map((m) => ({ id: m.id, label: machineLabel(m) }));
  }, [restrictToRules, effectiveRules, machines]);

  const recipientMissing = !recipient;
  const recipientLabel = activeMembers.find((member) => member.id === recipient)?.label ?? '';

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (recipientMissing) return;
    issue.mutate(
      {
        issuedToUserId: recipient,
        productPartId: productId === NONE ? null : productId,
        operationId: operationId === NONE ? null : operationId,
        machineEquipmentId: machineId === NONE ? null : machineId,
        issueLocation: location.trim() || null,
        condition,
        notes: notes.trim() || null,
      },
      {
        onSuccess: () => {
          toast.success(t('toolingOps.issue.success', { name: recipientLabel || t('toolingOps.issue.recipientFallback') }));
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(toolingErrorMessage(error, t));
          if (extractToolingErrorCode(error) === 'TOOLING_ALREADY_ISSUED') {
            // Someone else issued it first: refresh the header, list and history.
            void Promise.all([
              queryClient.invalidateQueries({ queryKey: toolingKeys.detail(tool.id) }),
              queryClient.invalidateQueries({ queryKey: toolingKeys.scoped(tool.id) }),
              queryClient.invalidateQueries({ queryKey: [...toolingKeys.all, 'list'] }),
            ]);
            onOpenChange(false);
          }
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <DialogHeader>
            <DialogTitle>{t('toolingOps.issue.dialogTitle')}</DialogTitle>
            <DialogDescription>{t('toolingOps.issue.dialogDescription', { name: tool.name })}</DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="tooling-issue-recipient">{t('toolingOps.issue.recipient')}</Label>
            <Select value={recipient} onValueChange={setRecipient} disabled={membersLoading}>
              <SelectTrigger
                id="tooling-issue-recipient"
                aria-label={t('toolingOps.issue.recipient')}
                aria-invalid={submitted && recipientMissing}
              >
                <SelectValue
                  placeholder={membersLoading ? t('toolingOps.issue.membersLoading') : t('toolingOps.issue.recipientPlaceholder')}
                />
              </SelectTrigger>
              <SelectContent>
                {activeMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {submitted && recipientMissing && (
              <p className="text-sm text-destructive" role="alert">
                {t('toolingOps.issue.recipientRequired')}
              </p>
            )}
          </div>

          <fieldset className="space-y-3 rounded-md border p-3">
            <legend className="px-1 text-sm font-medium">{t('toolingOps.issue.contextTitle')}</legend>
            <p className="text-xs text-muted-foreground">{t('toolingOps.issue.contextHelp')}</p>
            {restrictToRules && <p className="text-xs text-muted-foreground">{t('toolingOps.issue.contextFromRules')}</p>}
            <OptionalSelect
              id="tooling-issue-product"
              label={t('toolingOps.issue.product')}
              value={productId}
              onChange={setProductId}
              options={productOptions}
              noneLabel={t('toolingOps.common.noneOption')}
            />
            <OptionalSelect
              id="tooling-issue-operation"
              label={t('toolingOps.issue.operation')}
              value={operationId}
              onChange={setOperationId}
              options={operationOptions}
              noneLabel={t('toolingOps.common.noneOption')}
            />
            <OptionalSelect
              id="tooling-issue-machine"
              label={t('toolingOps.issue.machine')}
              value={machineId}
              onChange={setMachineId}
              options={machineOptions}
              noneLabel={t('toolingOps.common.noneOption')}
            />
          </fieldset>

          <div className="space-y-1.5">
            <Label htmlFor="tooling-issue-location">
              {t('toolingOps.issue.issueLocation')} <span className="text-muted-foreground">({t('tooling.optional')})</span>
            </Label>
            <Input id="tooling-issue-location" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={200} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tooling-issue-condition">{t('toolingOps.issue.conditionAtIssue')}</Label>
            <Select value={condition} onValueChange={(value) => isConditionValue(value) && setCondition(value)}>
              <SelectTrigger id="tooling-issue-condition" aria-label={t('toolingOps.issue.conditionAtIssue')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TOOLING_CONDITIONS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`tooling.conditions.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {condition === 'damaged' && <p className="text-xs text-destructive">{t('toolingOps.issue.damagedBlocked')}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tooling-issue-notes">
              {t('tooling.notes')} <span className="text-muted-foreground">({t('tooling.optional')})</span>
            </Label>
            <Textarea id="tooling-issue-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={2000} />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={issue.isPending}>
              {t('tooling.cancel')}
            </Button>
            <Button type="submit" disabled={issue.isPending}>
              {issue.isPending ? t('tooling.saving') : t('toolingOps.issue.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Return dialog
// ---------------------------------------------------------------------------

function ReturnToolDialog({ tool, open, onOpenChange }: { tool: ToolingOverview; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useI18n();
  const returnTool = useReturnTooling(tool.id);
  const [condition, setCondition] = useState<ToolingCondition | ''>('');
  const [location, setLocation] = useState(tool.storage_location ?? '');
  const [usage, setUsage] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const usageValue = parseOptionalNumber(usage);
  const usageInvalid = usageValue === undefined || (usageValue !== null && usageValue < 0);
  const conditionMissing = condition === '';
  const unitLabel = t(`tooling.units.${tool.usage_unit}`);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (condition === '' || usageInvalid) return;
    returnTool.mutate(
      {
        condition,
        returnLocation: location.trim() || null,
        usageQuantity: usageValue ?? null,
        notes: notes.trim() || null,
      },
      {
        onSuccess: () => {
          const quarantined = condition === 'damaged' && tool.usability_state === 'available';
          toast.success(quarantined ? t('toolingOps.return.successQuarantined') : t('toolingOps.return.success'));
          onOpenChange(false);
        },
        onError: (error) => toast.error(toolingErrorMessage(error, t)),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <DialogHeader>
            <DialogTitle>{t('toolingOps.return.dialogTitle')}</DialogTitle>
            <DialogDescription>
              {t('toolingOps.return.dialogDescription', {
                name: tool.name,
                holder: tool.issued_to_name ?? t('tooling.none'),
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="tooling-return-condition">{t('toolingOps.return.condition')}</Label>
            <Select value={condition} onValueChange={(value) => isConditionValue(value) && setCondition(value)}>
              <SelectTrigger
                id="tooling-return-condition"
                aria-label={t('toolingOps.return.condition')}
                aria-invalid={submitted && conditionMissing}
              >
                <SelectValue placeholder={t('toolingOps.return.conditionPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {TOOLING_CONDITIONS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`tooling.conditions.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {submitted && conditionMissing && (
              <p className="text-sm text-destructive" role="alert">
                {t('toolingOps.return.conditionRequired')}
              </p>
            )}
          </div>

          {condition === 'damaged' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              <AlertDescription>{t('toolingOps.return.damagedWarning')}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="tooling-return-location">{t('toolingOps.return.returnLocation')}</Label>
            <Input id="tooling-return-location" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={200} />
            <p className="text-xs text-muted-foreground">{t('toolingOps.return.returnLocationHelp')}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tooling-return-usage">{t('toolingOps.return.usageQuantity', { unit: unitLabel })}</Label>
            <Input
              id="tooling-return-usage"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={usage}
              onChange={(e) => setUsage(e.target.value)}
              aria-invalid={submitted && usageInvalid}
            />
            <p className="text-xs text-muted-foreground">{t('toolingOps.return.usageHelp')}</p>
            {submitted && usageInvalid && (
              <p className="text-sm text-destructive" role="alert">
                {t('toolingOps.common.invalidNumber')}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tooling-return-notes">
              {t('tooling.notes')} <span className="text-muted-foreground">({t('tooling.optional')})</span>
            </Label>
            <Textarea id="tooling-return-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={2000} />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={returnTool.isPending}>
              {t('tooling.cancel')}
            </Button>
            <Button type="submit" disabled={returnTool.isPending}>
              {returnTool.isPending ? t('tooling.saving') : t('toolingOps.return.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Transfer dialog
// ---------------------------------------------------------------------------

function TransferDialog({ tool, open, onOpenChange }: { tool: ToolingOverview; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useI18n();
  const transfer = useTransferToolingLocation(tool.id);
  const [location, setLocation] = useState('');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const locationMissing = location.trim().length === 0;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (locationMissing) return;
    transfer.mutate(
      { toLocation: location.trim(), reason: reason.trim() || null },
      {
        onSuccess: () => {
          toast.success(t('toolingOps.transfer.success', { location: location.trim() }));
          onOpenChange(false);
        },
        onError: (error) => toast.error(toolingErrorMessage(error, t)),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <DialogHeader>
            <DialogTitle>{t('toolingOps.transfer.dialogTitle')}</DialogTitle>
            <DialogDescription>{t('toolingOps.transfer.dialogDescription')}</DialogDescription>
          </DialogHeader>
          <p className="text-sm">
            <span className="text-muted-foreground">{t('toolingOps.transfer.currentLocation')}: </span>
            {tool.storage_location ?? t('tooling.none')}
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="tooling-transfer-location">{t('toolingOps.transfer.newLocation')}</Label>
            <Input
              id="tooling-transfer-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={200}
              aria-invalid={submitted && locationMissing}
            />
            {submitted && locationMissing && (
              <p className="text-sm text-destructive" role="alert">
                {t('toolingOps.transfer.locationRequired')}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tooling-transfer-reason">
              {t('tooling.reason')} <span className="text-muted-foreground">({t('tooling.optional')})</span>
            </Label>
            <Textarea id="tooling-transfer-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={1000} />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={transfer.isPending}>
              {t('tooling.cancel')}
            </Button>
            <Button type="submit" disabled={transfer.isPending}>
              {transfer.isPending ? t('tooling.saving') : t('toolingOps.transfer.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Quarantine dialog
// ---------------------------------------------------------------------------

function QuarantineDialog({ tool, open, onOpenChange }: { tool: ToolingOverview; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useI18n();
  const setUsability = useSetToolingUsability(tool.id);
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const reasonMissing = reason.trim().length === 0;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (reasonMissing) return;
    setUsability.mutate(
      { state: 'quarantined', reason: reason.trim() },
      {
        onSuccess: () => {
          toast.success(t('toolingOps.quarantine.success'));
          onOpenChange(false);
        },
        onError: (error) => toast.error(toolingErrorMessage(error, t)),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <DialogHeader>
            <DialogTitle>{t('toolingOps.quarantine.dialogTitle')}</DialogTitle>
            <DialogDescription>{t('toolingOps.quarantine.dialogDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="tooling-quarantine-reason">{t('tooling.reason')}</Label>
            <Textarea
              id="tooling-quarantine-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={1000}
              aria-invalid={submitted && reasonMissing}
            />
            {submitted && reasonMissing && (
              <p className="text-sm text-destructive" role="alert">
                {t('tooling.reasonRequired')}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={setUsability.isPending}>
              {t('tooling.cancel')}
            </Button>
            <Button type="submit" variant="destructive" disabled={setUsability.isPending}>
              {setUsability.isPending ? t('tooling.saving') : t('toolingOps.quarantine.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Current assignment card
// ---------------------------------------------------------------------------

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm font-medium">{value}</dd>
    </div>
  );
}

function CurrentAssignmentCard({
  tool,
  active,
  loading,
}: {
  tool: ToolingOverview;
  active: ToolingAssignment | undefined;
  loading: boolean;
}) {
  const { t } = useI18n();
  const { formatDateTime } = useFormatTimestamp();
  const none = t('tooling.none');

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('toolingOps.issue.currentTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        {tool.is_issued ? (
          loading && !active ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="tooling-current-assignment">
              <DetailRow label={t('toolingOps.issue.holder')} value={active?.issued_to_name ?? tool.issued_to_name ?? none} />
              <DetailRow label={t('toolingOps.issue.issuedBy')} value={active?.issued_by_name ?? none} />
              <DetailRow
                label={t('toolingOps.issue.since')}
                value={active?.issued_at || tool.issued_at ? formatDateTime((active?.issued_at ?? tool.issued_at) as string) : none}
              />
              <DetailRow
                label={t('toolingOps.issue.product')}
                value={active?.product_part ? codeLabel(active.product_part.part_number, active.product_part.name) : none}
              />
              <DetailRow
                label={t('toolingOps.issue.operation')}
                value={active?.operation ? codeLabel(active.operation.code, active.operation.name) : none}
              />
              <DetailRow label={t('toolingOps.issue.machine')} value={active?.machine ? machineLabel(active.machine) : none} />
              <DetailRow label={t('toolingOps.issue.issueLocation')} value={active?.issue_location ?? none} />
              <DetailRow
                label={t('toolingOps.issue.conditionAtIssue')}
                value={active ? t(`tooling.conditions.${active.condition_at_issue}`) : none}
              />
            </dl>
          )
        ) : (
          <p className="text-sm" data-testid="tooling-in-storage">
            {tool.storage_location
              ? t('toolingOps.issue.inStorageAt', { location: tool.storage_location })
              : t('toolingOps.issue.inStorageNoLocation')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

function conditionTransition(assignment: ToolingAssignment, t: Translate): string {
  const from = t(`tooling.conditions.${assignment.condition_at_issue}`);
  return assignment.condition_at_return ? `${from} → ${t(`tooling.conditions.${assignment.condition_at_return}`)}` : from;
}

function AssignmentStatusBadge({ assignment }: { assignment: ToolingAssignment }) {
  const { t } = useI18n();
  return assignment.status === 'active' ? (
    <Badge>{t('toolingOps.history.statusActive')}</Badge>
  ) : (
    <Badge variant="secondary">{t('toolingOps.history.statusReturned')}</Badge>
  );
}

function AssignmentHistory({ tool, assignments, loading, failed }: { tool: ToolingOverview; assignments: ToolingAssignment[]; loading: boolean; failed: boolean }) {
  const { t, language } = useI18n();
  const { formatDateTime } = useFormatTimestamp();
  const none = t('tooling.none');
  const unit = t(`tooling.units.${tool.usage_unit}`);
  const usageText = (value: number | null) => (value == null ? none : `${formatToolingNumber(value, language)} ${unit}`);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('toolingOps.history.title')}</CardTitle>
        <CardDescription>{t('toolingOps.history.description')}</CardDescription>
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
        ) : assignments.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t('toolingOps.history.empty')}</p>
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('toolingOps.history.issued')}</TableHead>
                    <TableHead>{t('toolingOps.issue.holder')}</TableHead>
                    <TableHead>{t('toolingOps.history.context')}</TableHead>
                    <TableHead>{t('toolingOps.history.condition')}</TableHead>
                    <TableHead>{t('toolingOps.history.returned')}</TableHead>
                    <TableHead>{t('toolingOps.history.location')}</TableHead>
                    <TableHead className="text-right">{t('toolingOps.history.usageAtReturn')}</TableHead>
                    <TableHead>{t('toolingOps.history.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment) => {
                    const context = assignmentContext(assignment);
                    return (
                      <TableRow key={assignment.id}>
                        <TableCell className="whitespace-nowrap">
                          <div>{formatDateTime(assignment.issued_at)}</div>
                          <div className="text-xs text-muted-foreground">{assignment.issued_by_name ?? none}</div>
                        </TableCell>
                        <TableCell>{assignment.issued_to_name ?? none}</TableCell>
                        <TableCell className="max-w-[16rem]">
                          {context.length ? (
                            <ul className="space-y-0.5 text-xs">
                              {context.map((item) => (
                                <li key={item} className="break-words">
                                  {item}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            none
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{conditionTransition(assignment, t)}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {assignment.returned_at ? (
                            <>
                              <div>{formatDateTime(assignment.returned_at)}</div>
                              <div className="text-xs text-muted-foreground">{assignment.returned_by_name ?? none}</div>
                            </>
                          ) : (
                            <span className="text-muted-foreground">{t('toolingOps.history.notReturned')}</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[12rem] break-words text-xs">
                          {assignment.issue_location ?? none}
                          {assignment.return_location ? ` → ${assignment.return_location}` : ''}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right">{usageText(assignment.usage_at_return)}</TableCell>
                        <TableCell>
                          <AssignmentStatusBadge assignment={assignment} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <ul className="space-y-3 md:hidden">
              {assignments.map((assignment) => {
                const context = assignmentContext(assignment);
                return (
                  <li key={assignment.id} className="rounded-md border p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="break-words font-medium">{assignment.issued_to_name ?? none}</p>
                        <p className="text-xs text-muted-foreground">
                          {t('toolingOps.history.issuedLine', {
                            time: formatDateTime(assignment.issued_at),
                            name: assignment.issued_by_name ?? none,
                          })}
                        </p>
                      </div>
                      <AssignmentStatusBadge assignment={assignment} />
                    </div>
                    <dl className="mt-2 grid grid-cols-1 gap-2">
                      {context.length > 0 && <DetailRow label={t('toolingOps.history.context')} value={context.join(' / ')} />}
                      <DetailRow label={t('toolingOps.history.condition')} value={conditionTransition(assignment, t)} />
                      <DetailRow
                        label={t('toolingOps.history.returned')}
                        value={
                          assignment.returned_at
                            ? t('toolingOps.history.returnedLine', {
                                time: formatDateTime(assignment.returned_at),
                                name: assignment.returned_by_name ?? none,
                              })
                            : t('toolingOps.history.notReturned')
                        }
                      />
                      <DetailRow
                        label={t('toolingOps.history.location')}
                        value={`${assignment.issue_location ?? none}${assignment.return_location ? ` → ${assignment.return_location}` : ''}`}
                      />
                      <DetailRow label={t('toolingOps.history.usageAtReturn')} value={usageText(assignment.usage_at_return)} />
                    </dl>
                  </li>
                );
              })}
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

type DialogKind = 'issue' | 'return' | 'transfer' | 'quarantine' | null;

export function ToolingIssueReturnTab({ tool, canOperate }: ToolingTabProps) {
  const { t } = useI18n();
  const [dialog, setDialog] = useState<DialogKind>(null);
  const { data: assignments = [], isLoading, error } = useToolingAssignments(tool.id);

  const blockers = toolingIssueBlockers(tool).filter((blocker) => blocker !== 'issued');
  const active = assignments.find((assignment) => assignment.status === 'active');
  const canQuarantine = !tool.is_issued && tool.usability_state === 'available';
  const closeDialog = (open: boolean) => {
    if (!open) setDialog(null);
  };

  return (
    <div className="space-y-4">
      <CurrentAssignmentCard tool={tool} active={active} loading={isLoading} />

      {!tool.is_issued && blockers.length > 0 && (
        <Alert variant="destructive" data-testid="tooling-issue-blockers">
          <ShieldAlert className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>{t('toolingOps.issue.blockersTitle')}</AlertTitle>
          <AlertDescription>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {blockers.map((blocker) => (
                <li key={blocker}>{t(`tooling.blockers.${blocker}`)}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {canOperate ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('toolingOps.issue.actionsTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {tool.is_issued ? (
                <Button onClick={() => setDialog('return')} className="w-full sm:w-auto">
                  <LogIn className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t('toolingOps.return.button')}
                </Button>
              ) : (
                <>
                  <Button
                    onClick={() => setDialog('issue')}
                    disabled={blockers.length > 0}
                    aria-describedby={blockers.length > 0 ? 'tooling-issue-disabled-reason' : undefined}
                    className="w-full sm:w-auto"
                  >
                    <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                    {t('toolingOps.issue.button')}
                  </Button>
                  <Button variant="outline" onClick={() => setDialog('transfer')} className="w-full sm:w-auto">
                    <ArrowLeftRight className="mr-2 h-4 w-4" aria-hidden="true" />
                    {t('toolingOps.transfer.button')}
                  </Button>
                  {canQuarantine && (
                    <Button variant="outline" onClick={() => setDialog('quarantine')} className="w-full text-destructive sm:w-auto">
                      <ShieldAlert className="mr-2 h-4 w-4" aria-hidden="true" />
                      {t('toolingOps.quarantine.button')}
                    </Button>
                  )}
                </>
              )}
            </div>
            {!tool.is_issued && blockers.length > 0 && (
              <p id="tooling-issue-disabled-reason" className="text-xs text-muted-foreground">
                {t('toolingOps.issue.disabledReason')}
              </p>
            )}
            {tool.is_issued && <p className="text-xs text-muted-foreground">{t('toolingOps.issue.issuedActionsHint')}</p>}
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground" data-testid="tooling-issue-no-permission">
          {t('toolingOps.issue.noPermission')}
        </p>
      )}

      <AssignmentHistory tool={tool} assignments={assignments} loading={isLoading} failed={Boolean(error)} />

      {/* Dialogs mount only while open so their form state resets each time. */}
      {dialog === 'issue' && <IssueToolDialog tool={tool} open onOpenChange={closeDialog} />}
      {dialog === 'return' && <ReturnToolDialog tool={tool} open onOpenChange={closeDialog} />}
      {dialog === 'transfer' && <TransferDialog tool={tool} open onOpenChange={closeDialog} />}
      {dialog === 'quarantine' && <QuarantineDialog tool={tool} open onOpenChange={closeDialog} />}
    </div>
  );
}
