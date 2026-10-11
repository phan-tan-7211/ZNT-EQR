import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ban, Check, Info, Link2, Plus, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import type { ToolingTabProps } from '@/features/tooling/components/toolingTabProps';
import {
  useCreateToolingCompatibility,
  useMachineCandidates,
  useProductParts,
  useProductionOperations,
  useSetToolingCompatibilityStatus,
  useToolingCompatibility,
} from '@/features/tooling/hooks/useTooling';
import type {
  ToolingCompatibility,
  ToolingCompatibilityAction,
  ToolingCompatibilityApproval,
} from '@/features/tooling/types';
import { toolingErrorMessage } from '@/features/tooling/utils/toolingErrors';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

type Translate = (key: string, params?: Record<string, string | number>) => string;

const ANY_OPERATION = '__any__';

const APPROVAL_CLASS: Record<ToolingCompatibilityApproval, string> = {
  pending: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  approved: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  rejected: 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300',
};

function codeAndName(code: string | null | undefined, name: string | null | undefined): string {
  return [code, name].filter((part): part is string => Boolean(part && part.trim())).join(' – ');
}

function productLabel(rule: ToolingCompatibility, t: Translate): string {
  return codeAndName(rule.product_part?.part_number, rule.product_part?.name) || t('tooling.none');
}

function operationLabel(rule: ToolingCompatibility, t: Translate): string {
  if (!rule.operation_id) return t('toolingCompat.tab.anyOperation');
  return codeAndName(rule.operation?.code, rule.operation?.name) || t('tooling.none');
}

function machineLabel(rule: ToolingCompatibility, t: Translate): string {
  if (!rule.machine_equipment_id) return t('toolingCompat.tab.manualMachine');
  return codeAndName(rule.machine?.management_code, rule.machine?.name) || t('tooling.none');
}

function ruleLabel(rule: ToolingCompatibility, t: Translate): string {
  return `${productLabel(rule, t)} / ${machineLabel(rule, t)}`;
}

function effectiveLabel(rule: ToolingCompatibility, t: Translate): string {
  return t('toolingCompat.tab.effectiveRange', {
    from: rule.effective_from ?? t('toolingCompat.tab.openStart'),
    to: rule.effective_to ?? t('toolingCompat.tab.openEnd'),
  });
}

function ApprovalBadge({ status }: { status: ToolingCompatibilityApproval }) {
  const { t } = useI18n();
  return (
    <Badge variant="outline" className={APPROVAL_CLASS[status]}>
      {t(`tooling.approval.${status}`)}
    </Badge>
  );
}

function ActiveBadge({ active }: { active: boolean }) {
  const { t } = useI18n();
  return (
    <Badge
      variant="outline"
      className={active ? 'border-primary/30 text-primary' : 'border-muted-foreground/30 bg-muted text-muted-foreground'}
    >
      {active ? t('toolingCompat.common.active') : t('toolingCompat.common.inactive')}
    </Badge>
  );
}

interface PendingAction {
  rule: ToolingCompatibility;
  action: ToolingCompatibilityAction;
}

function RuleActions({
  rule,
  onAction,
  className,
}: {
  rule: ToolingCompatibility;
  onAction: (pending: PendingAction) => void;
  className?: string;
}) {
  const { t } = useI18n();
  const label = ruleLabel(rule, t);
  const canApprove = rule.approval_status === 'pending' && rule.is_active;
  const canReject = rule.approval_status === 'pending';
  const canDeactivate = rule.is_active;
  if (!canApprove && !canReject && !canDeactivate) return null;
  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {canApprove && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onAction({ rule, action: 'approve' })}
          aria-label={t('toolingCompat.tab.approveAria', { rule: label })}
        >
          <Check className="mr-1 h-4 w-4" aria-hidden="true" />
          {t('toolingCompat.tab.approve')}
        </Button>
      )}
      {canReject && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onAction({ rule, action: 'reject' })}
          aria-label={t('toolingCompat.tab.rejectAria', { rule: label })}
        >
          <X className="mr-1 h-4 w-4" aria-hidden="true" />
          {t('toolingCompat.tab.reject')}
        </Button>
      )}
      {canDeactivate && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onAction({ rule, action: 'deactivate' })}
          aria-label={t('toolingCompat.tab.deactivateAria', { rule: label })}
        >
          <Ban className="mr-1 h-4 w-4" aria-hidden="true" />
          {t('toolingCompat.tab.deactivate')}
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add rule dialog
// ---------------------------------------------------------------------------

interface AddRuleDialogProps {
  organizationId: string;
  toolingId: string;
  onClose: () => void;
}

function AddRuleDialog({ organizationId, toolingId, onClose }: AddRuleDialogProps) {
  const { t } = useI18n();
  const { data: products = [], isLoading: productsLoading } = useProductParts(organizationId);
  const { data: operations = [] } = useProductionOperations(organizationId);
  const { data: machines = [], isLoading: machinesLoading } = useMachineCandidates(organizationId, true);
  const createMutation = useCreateToolingCompatibility(toolingId);

  const [productId, setProductId] = useState('');
  const [operationId, setOperationId] = useState(ANY_OPERATION);
  const [manual, setManual] = useState(false);
  const [selectedMachines, setSelectedMachines] = useState<string[]>([]);
  const [machineSearch, setMachineSearch] = useState('');
  const [drawingRevision, setDrawingRevision] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveTo, setEffectiveTo] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const activeProducts = useMemo(() => products.filter((product) => product.is_active), [products]);
  const activeOperations = useMemo(() => operations.filter((operation) => operation.is_active), [operations]);
  const filteredMachines = useMemo(() => {
    const query = machineSearch.trim().toLowerCase();
    if (!query) return machines;
    return machines.filter((machine) =>
      `${machine.management_code ?? ''} ${machine.name}`.toLowerCase().includes(query),
    );
  }, [machines, machineSearch]);

  const dateOrderInvalid = Boolean(effectiveFrom && effectiveTo && effectiveTo < effectiveFrom);
  const targetCount = selectedMachines.length + (manual ? 1 : 0);

  const toggleMachine = (machineId: string, checked: boolean) => {
    setSelectedMachines((current) =>
      checked ? (current.includes(machineId) ? current : [...current, machineId]) : current.filter((id) => id !== machineId),
    );
  };

  const submit = async () => {
    if (!productId) {
      setFormError(t('toolingCompat.addDialog.productRequired'));
      return;
    }
    if (targetCount === 0) {
      setFormError(t('toolingCompat.addDialog.targetRequired'));
      return;
    }
    if (dateOrderInvalid) {
      setFormError(t('toolingCompat.addDialog.dateOrder'));
      return;
    }
    setFormError(null);
    setSubmitting(true);

    const targets: Array<string | null> = [...(manual ? [null] : []), ...selectedMachines];
    const failedTargets: Array<string | null> = [];
    let created = 0;
    let firstError: unknown = undefined;
    let hasError = false;

    for (const machineEquipmentId of targets) {
      try {
        await createMutation.mutateAsync({
          productPartId: productId,
          operationId: operationId === ANY_OPERATION ? null : operationId,
          machineEquipmentId,
          drawingRevision: drawingRevision.trim() || null,
          effectiveFrom: effectiveFrom || null,
          effectiveTo: effectiveTo || null,
          notes: notes.trim() || null,
        });
        created += 1;
      } catch (error) {
        if (!hasError) {
          hasError = true;
          firstError = error;
        }
        failedTargets.push(machineEquipmentId);
      }
    }
    setSubmitting(false);

    if (!hasError) {
      toast.success(t('toolingCompat.addDialog.createdCount', { count: created }));
      onClose();
      return;
    }

    const errorMessage = toolingErrorMessage(firstError, t);
    if (created > 0) {
      toast.success(t('toolingCompat.addDialog.createdCount', { count: created }));
      toast.error(
        t('toolingCompat.addDialog.partialFailure', { created, total: targets.length, error: errorMessage }),
      );
    } else {
      toast.error(errorMessage);
    }
    // Keep only the failed targets selected so the user can adjust and retry.
    setManual(failedTargets.includes(null));
    setSelectedMachines(failedTargets.filter((id): id is string => id !== null));
  };

  return (
    <Dialog open onOpenChange={(open) => (!open && !submitting ? onClose() : undefined)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('toolingCompat.addDialog.title')}</DialogTitle>
          <DialogDescription>{t('toolingCompat.addDialog.description')}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="compat-product">
                {t('toolingCompat.addDialog.product')} <span aria-hidden="true">*</span>
              </Label>
              <Select value={productId} onValueChange={setProductId} disabled={productsLoading}>
                <SelectTrigger id="compat-product" aria-required="true">
                  <SelectValue placeholder={t('toolingCompat.addDialog.productPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {activeProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {codeAndName(product.part_number, product.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!productsLoading && activeProducts.length === 0 && (
                <p className="text-xs text-muted-foreground">{t('toolingCompat.addDialog.noActiveProducts')}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="compat-operation">{t('toolingCompat.addDialog.operation')}</Label>
              <Select value={operationId} onValueChange={setOperationId}>
                <SelectTrigger id="compat-operation">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY_OPERATION}>{t('toolingCompat.addDialog.anyOperation')}</SelectItem>
                  {activeOperations.map((operation) => (
                    <SelectItem key={operation.id} value={operation.id}>
                      {codeAndName(operation.code, operation.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <fieldset className="space-y-2 rounded-md border p-3">
            <legend className="px-1 text-sm font-medium">
              {t('toolingCompat.addDialog.machines')} <span aria-hidden="true">*</span>
            </legend>
            <p className="text-xs text-muted-foreground">{t('toolingCompat.addDialog.machinesHint')}</p>
            <div className="flex items-start gap-2 rounded-md bg-muted/40 p-2">
              <Checkbox
                id="compat-machine-manual"
                checked={manual}
                onCheckedChange={(checked) => setManual(checked === true)}
                className="mt-0.5"
              />
              <div className="min-w-0">
                <Label htmlFor="compat-machine-manual" className="cursor-pointer">
                  {t('toolingCompat.addDialog.manualOption')}
                </Label>
                <p className="text-xs text-muted-foreground">{t('toolingCompat.addDialog.manualHint')}</p>
              </div>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                type="search"
                value={machineSearch}
                onChange={(event) => setMachineSearch(event.target.value)}
                placeholder={t('toolingCompat.addDialog.machineSearchPlaceholder')}
                aria-label={t('toolingCompat.addDialog.machineSearch')}
                className="pl-9"
              />
            </div>
            <div className="max-h-48 overflow-y-auto rounded-md border">
              {machinesLoading ? (
                <p className="p-3 text-sm text-muted-foreground">{t('toolingCompat.addDialog.loadingMachines')}</p>
              ) : filteredMachines.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">{t('toolingCompat.addDialog.noMachines')}</p>
              ) : (
                <ul className="divide-y">
                  {filteredMachines.map((machine) => {
                    const checkboxId = `compat-machine-${machine.id}`;
                    return (
                      <li key={machine.id} className="flex items-center gap-2 px-3 py-2">
                        <Checkbox
                          id={checkboxId}
                          checked={selectedMachines.includes(machine.id)}
                          onCheckedChange={(checked) => toggleMachine(machine.id, checked === true)}
                        />
                        <Label htmlFor={checkboxId} className="min-w-0 flex-1 cursor-pointer break-words font-normal">
                          {codeAndName(machine.management_code, machine.name)}
                        </Label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {t('toolingCompat.addDialog.selectedCount', { count: targetCount })}
            </p>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="compat-drawing-revision">{t('toolingCompat.addDialog.drawingRevision')}</Label>
              <Input
                id="compat-drawing-revision"
                value={drawingRevision}
                maxLength={50}
                placeholder={t('toolingCompat.addDialog.drawingRevisionPlaceholder')}
                onChange={(event) => setDrawingRevision(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="compat-effective-from">{t('toolingCompat.addDialog.effectiveFrom')}</Label>
              <Input
                id="compat-effective-from"
                type="date"
                value={effectiveFrom}
                max={effectiveTo || undefined}
                onChange={(event) => setEffectiveFrom(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="compat-effective-to">{t('toolingCompat.addDialog.effectiveTo')}</Label>
              <Input
                id="compat-effective-to"
                type="date"
                value={effectiveTo}
                min={effectiveFrom || undefined}
                aria-invalid={dateOrderInvalid}
                aria-describedby={dateOrderInvalid ? 'compat-date-error' : undefined}
                onChange={(event) => setEffectiveTo(event.target.value)}
              />
            </div>
          </div>
          {dateOrderInvalid && (
            <p id="compat-date-error" className="text-sm text-destructive">
              {t('toolingCompat.addDialog.dateOrder')}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="compat-notes">{t('toolingCompat.addDialog.notes')}</Label>
            <Textarea id="compat-notes" value={notes} rows={3} onChange={(event) => setNotes(event.target.value)} />
          </div>

          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              {t('tooling.cancel')}
            </Button>
            <Button type="submit" disabled={submitting || dateOrderInvalid}>
              {submitting ? t('toolingCompat.addDialog.submitting') : t('toolingCompat.addDialog.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Status confirm dialog
// ---------------------------------------------------------------------------

function StatusConfirmDialog({
  pending,
  toolingId,
  onClose,
}: {
  pending: PendingAction;
  toolingId: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const statusMutation = useSetToolingCompatibilityStatus(toolingId);
  const [note, setNote] = useState('');
  const label = ruleLabel(pending.rule, t);
  const successKey: Record<ToolingCompatibilityAction, string> = {
    approve: 'toolingCompat.confirm.approved',
    reject: 'toolingCompat.confirm.rejected',
    deactivate: 'toolingCompat.confirm.deactivated',
  };

  const confirm = async () => {
    try {
      await statusMutation.mutateAsync({
        compatibilityId: pending.rule.id,
        action: pending.action,
        note: note.trim() || null,
      });
      toast.success(t(successKey[pending.action]));
      onClose();
    } catch (error) {
      toast.error(toolingErrorMessage(error, t));
    }
  };

  return (
    <Dialog open onOpenChange={(open) => (!open && !statusMutation.isPending ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t(`toolingCompat.confirm.${pending.action}Title`)}</DialogTitle>
          <DialogDescription>{t(`toolingCompat.confirm.${pending.action}Description`, { rule: label })}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="compat-status-note">
            {t('toolingCompat.confirm.noteLabel')}{' '}
            <span className="text-xs font-normal text-muted-foreground">({t('tooling.optional')})</span>
          </Label>
          <Textarea
            id="compat-status-note"
            value={note}
            rows={3}
            placeholder={t('toolingCompat.confirm.notePlaceholder')}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose} disabled={statusMutation.isPending}>
            {t('tooling.cancel')}
          </Button>
          <Button
            type="button"
            variant={pending.action === 'approve' ? 'default' : 'destructive'}
            onClick={() => void confirm()}
            disabled={statusMutation.isPending}
          >
            {statusMutation.isPending ? t('tooling.saving') : t('tooling.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Tab
// ---------------------------------------------------------------------------

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function ToolingCompatibilityTab({ tool, canManage }: ToolingTabProps) {
  const { t } = useI18n();
  const organizationId = tool.organization_id;
  const { data: rules = [], isLoading, error, refetch } = useToolingCompatibility(tool.id);
  // Master data is admin-managed; only load it for the setup hint when the viewer can act on it.
  const { data: products, isLoading: productsLoading } = useProductParts(canManage ? organizationId : undefined);
  const { data: operations, isLoading: operationsLoading } = useProductionOperations(
    canManage ? organizationId : undefined,
  );
  const [showInactive, setShowInactive] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const summary = useMemo(() => {
    const usable = rules.filter((rule) => rule.is_active && rule.approval_status === 'approved');
    const productIds = new Set(usable.map((rule) => rule.product_part_id));
    const operationIds = new Set(usable.map((rule) => rule.operation_id).filter((id): id is string => Boolean(id)));
    const machineIds = new Set(
      usable.map((rule) => rule.machine_equipment_id).filter((id): id is string => Boolean(id)),
    );
    return { products: productIds.size, operations: operationIds.size, machines: machineIds.size };
  }, [rules]);

  const visibleRules = useMemo(
    () => (showInactive ? rules : rules.filter((rule) => rule.is_active)),
    [rules, showInactive],
  );

  const hasActiveProducts = (products ?? []).some((product) => product.is_active);
  const hasActiveOperations = (operations ?? []).some((operation) => operation.is_active);
  const showProductHint = canManage && !productsLoading && products !== undefined && !hasActiveProducts;
  const showOperationHint = canManage && !operationsLoading && operations !== undefined && !hasActiveOperations;

  const renderRules = () => {
    if (isLoading) {
      return (
        <div className="space-y-2" aria-busy="true" aria-label={t('toolingCompat.tab.loading')}>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      );
    }
    if (error) {
      return (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>{t('toolingCompat.common.loadFailed')}</span>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              {t('toolingCompat.common.retry')}
            </Button>
          </AlertDescription>
        </Alert>
      );
    }
    if (rules.length === 0) {
      return (
        <EmptyState
          icon={Link2}
          title={t('toolingCompat.tab.empty')}
          description={canManage ? t('toolingCompat.tab.emptyAdmin') : t('toolingCompat.tab.emptyReadOnly')}
        />
      );
    }
    if (visibleRules.length === 0) {
      return (
        <p className="py-6 text-center text-sm text-muted-foreground">{t('toolingCompat.tab.emptyInactiveHidden')}</p>
      );
    }
    return (
      <>
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('toolingCompat.tab.product')}</TableHead>
                <TableHead>{t('toolingCompat.tab.operation')}</TableHead>
                <TableHead>{t('toolingCompat.tab.machine')}</TableHead>
                <TableHead>{t('toolingCompat.tab.drawingRevision')}</TableHead>
                <TableHead>{t('toolingCompat.tab.effective')}</TableHead>
                <TableHead>{t('toolingCompat.tab.approval')}</TableHead>
                <TableHead>{t('toolingCompat.common.status')}</TableHead>
                {canManage && <TableHead className="text-right">{t('toolingCompat.common.actions')}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRules.map((rule) => (
                <TableRow key={rule.id} className={cn(!rule.is_active && 'opacity-70')} data-testid="compat-rule-row">
                  <TableCell className="font-medium">{productLabel(rule, t)}</TableCell>
                  <TableCell>{operationLabel(rule, t)}</TableCell>
                  <TableCell>{machineLabel(rule, t)}</TableCell>
                  <TableCell>{rule.drawing_revision || t('tooling.none')}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{effectiveLabel(rule, t)}</TableCell>
                  <TableCell>
                    <ApprovalBadge status={rule.approval_status} />
                  </TableCell>
                  <TableCell>
                    <ActiveBadge active={rule.is_active} />
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <RuleActions rule={rule} onAction={setPendingAction} className="justify-end" />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <ul className="space-y-2 md:hidden">
          {visibleRules.map((rule) => (
            <li key={rule.id} className={cn('rounded-lg border p-3', !rule.is_active && 'opacity-70')}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="min-w-0 break-words text-sm font-semibold">{productLabel(rule, t)}</p>
                <div className="flex flex-wrap gap-1">
                  <ApprovalBadge status={rule.approval_status} />
                  <ActiveBadge active={rule.is_active} />
                </div>
              </div>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                <dt className="text-muted-foreground">{t('toolingCompat.tab.operation')}</dt>
                <dd className="break-words">{operationLabel(rule, t)}</dd>
                <dt className="text-muted-foreground">{t('toolingCompat.tab.machine')}</dt>
                <dd className="break-words">{machineLabel(rule, t)}</dd>
                <dt className="text-muted-foreground">{t('toolingCompat.tab.drawingRevision')}</dt>
                <dd className="break-words">{rule.drawing_revision || t('tooling.none')}</dd>
                <dt className="text-muted-foreground">{t('toolingCompat.tab.effective')}</dt>
                <dd>{effectiveLabel(rule, t)}</dd>
              </dl>
              {rule.notes && <p className="mt-2 break-words text-xs text-muted-foreground">{rule.notes}</p>}
              {canManage && <RuleActions rule={rule} onAction={setPendingAction} className="mt-3" />}
            </li>
          ))}
        </ul>
      </>
    );
  };

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" aria-hidden="true" />
        <AlertDescription className="space-y-1">
          <p>{t('toolingCompat.tab.intro')}</p>
          <p className="font-medium">{t('toolingCompat.tab.notAssignment')}</p>
          <p className="text-muted-foreground">{t('toolingCompat.tab.approvalNote')}</p>
        </AlertDescription>
      </Alert>

      {(showProductHint || showOperationHint) && (
        <Alert>
          <AlertTitle>{t('toolingCompat.tab.setupHintTitle')}</AlertTitle>
          <AlertDescription className="space-y-2">
            {showProductHint && (
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>{t('toolingCompat.tab.noProductsHint')}</span>
                <Link to="/dashboard/tooling?view=products" className="font-medium text-primary underline-offset-4 hover:underline">
                  {t('toolingCompat.tab.manageProducts')}
                </Link>
              </p>
            )}
            {showOperationHint && (
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>{t('toolingCompat.tab.noOperationsHint')}</span>
                <Link to="/dashboard/tooling?view=operations" className="font-medium text-primary underline-offset-4 hover:underline">
                  {t('toolingCompat.tab.manageOperations')}
                </Link>
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryTile label={t('toolingCompat.tab.summaryProducts')} value={summary.products} />
        <SummaryTile label={t('toolingCompat.tab.summaryOperations')} value={summary.operations} />
        <SummaryTile label={t('toolingCompat.tab.summaryMachines')} value={summary.machines} />
      </div>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
          <div className="space-y-1.5">
            <CardTitle className="flex flex-wrap items-center gap-2">
              {t('toolingCompat.tab.title')}
              <Badge variant="outline" className="font-normal">
                {tool.requires_machine ? t('toolingCompat.tab.machineRequired') : t('toolingCompat.tab.manualTool')}
              </Badge>
            </CardTitle>
            {!canManage && <CardDescription>{t('tooling.readOnlyHint')}</CardDescription>}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <Switch id="compat-show-inactive" checked={showInactive} onCheckedChange={setShowInactive} />
              <Label htmlFor="compat-show-inactive" className="text-sm font-normal">
                {t('toolingCompat.tab.showInactive')}
              </Label>
            </div>
            {canManage && (
              <Button onClick={() => setAddOpen(true)} className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                {t('toolingCompat.tab.addRule')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>{renderRules()}</CardContent>
      </Card>

      {canManage && addOpen && (
        <AddRuleDialog organizationId={organizationId} toolingId={tool.id} onClose={() => setAddOpen(false)} />
      )}
      {canManage && pendingAction && (
        <StatusConfirmDialog pending={pendingAction} toolingId={tool.id} onClose={() => setPendingAction(null)} />
      )}
    </div>
  );
}
