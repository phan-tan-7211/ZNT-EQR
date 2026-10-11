import { useMemo, useState } from 'react';
import { Pencil, Plus, Search, Workflow } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import EmptyState from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useProductionOperations, useSaveProductionOperation } from '@/features/tooling/hooks/useTooling';
import {
  TOOLING_OPERATION_TYPES,
  type ProductionOperation,
  type ProductionOperationInput,
  type ToolingOperationType,
} from '@/features/tooling/types';
import { toolingErrorMessage } from '@/features/tooling/utils/toolingErrors';
import { useI18n } from '@/i18n';

interface ProductionOperationsCatalogProps {
  organizationId: string;
  canManage: boolean;
}

interface OperationForm {
  code: string;
  name: string;
  operation_type: ToolingOperationType | '';
  description: string;
  is_active: boolean;
}

const EMPTY_FORM: OperationForm = {
  code: '',
  name: '',
  operation_type: '',
  description: '',
  is_active: true,
};

function isOperationType(value: string): value is ToolingOperationType {
  return (TOOLING_OPERATION_TYPES as readonly string[]).includes(value);
}

function toForm(operation: ProductionOperation): OperationForm {
  return {
    code: operation.code,
    name: operation.name,
    operation_type: operation.operation_type,
    description: operation.description ?? '',
    is_active: operation.is_active,
  };
}

function ActiveBadge({ active }: { active: boolean }) {
  const { t } = useI18n();
  return (
    <Badge
      variant="outline"
      className={
        active
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
          : 'border-muted-foreground/30 bg-muted text-muted-foreground'
      }
    >
      {active ? t('toolingCompat.common.active') : t('toolingCompat.common.inactive')}
    </Badge>
  );
}

export function ProductionOperationsCatalog({ organizationId, canManage }: ProductionOperationsCatalogProps) {
  const { t } = useI18n();
  const { data: operations = [], isLoading, error, refetch } = useProductionOperations(organizationId);
  const saveMutation = useSaveProductionOperation(organizationId);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProductionOperation | null>(null);
  const [form, setForm] = useState<OperationForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return operations;
    return operations.filter((operation) =>
      [operation.code, operation.name, t(`tooling.operationTypes.${operation.operation_type}`)]
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [operations, search, t]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (operation: ProductionOperation) => {
    setEditing(operation);
    setForm(toForm(operation));
    setFormError(null);
    setDialogOpen(true);
  };

  const save = async () => {
    const code = form.code.trim();
    const name = form.name.trim();
    if (!code || !name || !form.operation_type) {
      setFormError(t('toolingCompat.operations.required'));
      return;
    }
    const input: ProductionOperationInput = {
      code,
      name,
      operation_type: form.operation_type,
      description: form.description.trim() || null,
      is_active: form.is_active,
    };
    try {
      await saveMutation.mutateAsync({ input, id: editing?.id });
      toast.success(editing ? t('toolingCompat.operations.updated') : t('toolingCompat.operations.created'));
      setDialogOpen(false);
    } catch (mutationError) {
      toast.error(toolingErrorMessage(mutationError, t));
    }
  };

  const renderBody = () => {
    if (isLoading) {
      return (
        <div className="space-y-2" aria-busy="true">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
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
    if (operations.length === 0) {
      return (
        <EmptyState
          icon={Workflow}
          title={t('toolingCompat.operations.empty')}
          description={
            canManage ? t('toolingCompat.operations.emptyAdmin') : t('toolingCompat.operations.emptyReadOnly')
          }
          action={
            canManage ? (
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                {t('toolingCompat.operations.add')}
              </Button>
            ) : undefined
          }
        />
      );
    }
    if (filtered.length === 0) {
      return (
        <p className="py-6 text-center text-sm text-muted-foreground">{t('toolingCompat.operations.noMatch')}</p>
      );
    }
    return (
      <>
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('toolingCompat.operations.code')}</TableHead>
                <TableHead>{t('toolingCompat.operations.name')}</TableHead>
                <TableHead>{t('toolingCompat.operations.type')}</TableHead>
                <TableHead>{t('toolingCompat.common.status')}</TableHead>
                {canManage && <TableHead className="text-right">{t('toolingCompat.common.actions')}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((operation) => (
                <TableRow key={operation.id}>
                  <TableCell className="font-mono font-medium">{operation.code}</TableCell>
                  <TableCell>
                    <p className="font-medium">{operation.name}</p>
                    {operation.description && (
                      <p className="mt-0.5 max-w-sm text-xs text-muted-foreground">{operation.description}</p>
                    )}
                  </TableCell>
                  <TableCell>{t(`tooling.operationTypes.${operation.operation_type}`)}</TableCell>
                  <TableCell>
                    <ActiveBadge active={operation.is_active} />
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(operation)}
                        aria-label={t('toolingCompat.operations.editAria', { name: operation.code })}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <ul className="space-y-2 md:hidden">
          {filtered.map((operation) => (
            <li key={operation.id} className="rounded-lg border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-words font-mono text-sm font-semibold">{operation.code}</p>
                  <p className="break-words text-sm">{operation.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t(`tooling.operationTypes.${operation.operation_type}`)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <ActiveBadge active={operation.is_active} />
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(operation)}
                      aria-label={t('toolingCompat.operations.editAria', { name: operation.code })}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </>
    );
  };

  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2">
            <Workflow className="h-5 w-5" aria-hidden="true" />
            {t('toolingCompat.operations.title')}
          </CardTitle>
          <CardDescription>{t('toolingCompat.operations.description')}</CardDescription>
        </div>
        {canManage && (
          <Button onClick={openCreate} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            {t('toolingCompat.operations.add')}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {!canManage && <p className="text-sm text-muted-foreground">{t('toolingCompat.common.readOnly')}</p>}
        {operations.length > 0 && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('toolingCompat.operations.searchPlaceholder')}
                aria-label={t('toolingCompat.operations.searchLabel')}
                className="pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t('toolingCompat.operations.count', { count: filtered.length })}
            </p>
          </div>
        )}
        {renderBody()}
      </CardContent>

      {canManage && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editing ? t('toolingCompat.operations.editTitle') : t('toolingCompat.operations.addTitle')}
              </DialogTitle>
              <DialogDescription>{t('toolingCompat.operations.dialogDescription')}</DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void save();
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="operation-code">
                    {t('toolingCompat.operations.code')} <span aria-hidden="true">*</span>
                  </Label>
                  <Input
                    id="operation-code"
                    value={form.code}
                    required
                    aria-required="true"
                    maxLength={50}
                    placeholder={t('toolingCompat.operations.codePlaceholder')}
                    onChange={(event) => setForm((value) => ({ ...value, code: event.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="operation-type">
                    {t('toolingCompat.operations.type')} <span aria-hidden="true">*</span>
                  </Label>
                  <Select
                    value={form.operation_type}
                    onValueChange={(value) => {
                      if (isOperationType(value)) setForm((current) => ({ ...current, operation_type: value }));
                    }}
                  >
                    <SelectTrigger id="operation-type" aria-required="true">
                      <SelectValue placeholder={t('toolingCompat.operations.typePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {TOOLING_OPERATION_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(`tooling.operationTypes.${type}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="operation-name">
                  {t('toolingCompat.operations.name')} <span aria-hidden="true">*</span>
                </Label>
                <Input
                  id="operation-name"
                  value={form.name}
                  required
                  aria-required="true"
                  maxLength={200}
                  placeholder={t('toolingCompat.operations.namePlaceholder')}
                  onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="operation-description">{t('toolingCompat.operations.descriptionLabel')}</Label>
                <Textarea
                  id="operation-description"
                  value={form.description}
                  rows={3}
                  onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))}
                />
              </div>
              <div className="flex items-start justify-between gap-3 rounded-md border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="operation-active">{t('toolingCompat.operations.activeLabel')}</Label>
                  <p className="text-xs text-muted-foreground">{t('toolingCompat.operations.activeHint')}</p>
                </div>
                <Switch
                  id="operation-active"
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm((value) => ({ ...value, is_active: checked }))}
                />
              </div>
              {formError && (
                <p role="alert" className="text-sm text-destructive">
                  {formError}
                </p>
              )}
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  {t('tooling.cancel')}
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? t('tooling.saving') : t('tooling.save')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
