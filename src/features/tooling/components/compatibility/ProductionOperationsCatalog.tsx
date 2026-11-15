import { useCallback } from 'react';
import { Workflow } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TableCell } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  CatalogActiveField,
  CatalogEmptyState,
  CatalogField,
  CatalogFormDialog,
  CatalogHeader,
  CatalogListState,
  CatalogMobileItem,
  CatalogSearchBar,
  CatalogTable,
  CatalogTableRow,
  CatalogTextField,
} from '@/features/tooling/components/compatibility/CompatibilityShared';
import { useCatalogEditor, useCatalogSearch } from '@/features/tooling/components/compatibility/compatibilitySharedState';
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

export function ProductionOperationsCatalog({ organizationId, canManage }: ProductionOperationsCatalogProps) {
  const { t } = useI18n();
  const { data: operations = [], isLoading, error, refetch } = useProductionOperations(organizationId);
  const saveMutation = useSaveProductionOperation(organizationId);
  // The translated type label is searchable, so the values follow the active language.
  const toSearchValues = useCallback(
    (operation: ProductionOperation) => [
      operation.code,
      operation.name,
      t(`tooling.operationTypes.${operation.operation_type}`),
    ],
    [t],
  );
  const { search, setSearch, filtered } = useCatalogSearch(operations, toSearchValues);
  const { dialogOpen, setDialogOpen, editing, form, setField, formError, setFormError, openCreate, openEdit } =
    useCatalogEditor<ProductionOperation, OperationForm>(EMPTY_FORM, toForm);

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

  return (
    <Card>
      <CatalogHeader
        icon={Workflow}
        title={t('toolingCompat.operations.title')}
        description={t('toolingCompat.operations.description')}
        addLabel={t('toolingCompat.operations.add')}
        onAdd={canManage ? openCreate : undefined}
      />
      <CardContent className="space-y-4">
        {!canManage && <p className="text-sm text-muted-foreground">{t('toolingCompat.common.readOnly')}</p>}
        {operations.length > 0 && (
          <CatalogSearchBar
            value={search}
            onChange={setSearch}
            placeholder={t('toolingCompat.operations.searchPlaceholder')}
            label={t('toolingCompat.operations.searchLabel')}
            countLabel={t('toolingCompat.operations.count', { count: filtered.length })}
          />
        )}
        <CatalogListState
          isLoading={isLoading}
          hasError={Boolean(error)}
          onRetry={() => void refetch()}
          totalCount={operations.length}
          visibleCount={filtered.length}
          emptyState={
            <CatalogEmptyState
              icon={Workflow}
              title={t('toolingCompat.operations.empty')}
              description={
                canManage ? t('toolingCompat.operations.emptyAdmin') : t('toolingCompat.operations.emptyReadOnly')
              }
              addLabel={t('toolingCompat.operations.add')}
              onAdd={canManage ? openCreate : undefined}
            />
          }
          noMatchMessage={t('toolingCompat.operations.noMatch')}
        >
          <CatalogTable
            codeHeader={t('toolingCompat.operations.code')}
            nameHeader={t('toolingCompat.operations.name')}
            extraHeaders={[t('toolingCompat.operations.type')]}
            showActions={canManage}
          >
            {filtered.map((operation) => (
              <CatalogTableRow
                key={operation.id}
                code={operation.code}
                name={operation.name}
                description={operation.description}
                active={operation.is_active}
                editLabel={t('toolingCompat.operations.editAria', { name: operation.code })}
                onEdit={canManage ? () => openEdit(operation) : undefined}
              >
                <TableCell>{t(`tooling.operationTypes.${operation.operation_type}`)}</TableCell>
              </CatalogTableRow>
            ))}
          </CatalogTable>
          <ul className="space-y-2 md:hidden">
            {filtered.map((operation) => (
              <CatalogMobileItem
                key={operation.id}
                code={operation.code}
                name={operation.name}
                caption={t(`tooling.operationTypes.${operation.operation_type}`)}
                active={operation.is_active}
                editLabel={t('toolingCompat.operations.editAria', { name: operation.code })}
                onEdit={canManage ? () => openEdit(operation) : undefined}
              />
            ))}
          </ul>
        </CatalogListState>
      </CardContent>

      {canManage && (
        <CatalogFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title={editing ? t('toolingCompat.operations.editTitle') : t('toolingCompat.operations.addTitle')}
          description={t('toolingCompat.operations.dialogDescription')}
          error={formError}
          isSaving={saveMutation.isPending}
          onSubmit={() => void save()}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <CatalogTextField
              id="operation-code"
              label={t('toolingCompat.operations.code')}
              value={form.code}
              required
              maxLength={50}
              placeholder={t('toolingCompat.operations.codePlaceholder')}
              onChange={(value) => setField('code', value)}
            />
            <CatalogField id="operation-type" label={t('toolingCompat.operations.type')} required>
              <Select
                value={form.operation_type}
                onValueChange={(value) => {
                  if (isOperationType(value)) setField('operation_type', value);
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
            </CatalogField>
          </div>
          <CatalogTextField
            id="operation-name"
            label={t('toolingCompat.operations.name')}
            value={form.name}
            required
            maxLength={200}
            placeholder={t('toolingCompat.operations.namePlaceholder')}
            onChange={(value) => setField('name', value)}
          />
          <CatalogField id="operation-description" label={t('toolingCompat.operations.descriptionLabel')}>
            <Textarea
              id="operation-description"
              value={form.description}
              rows={3}
              onChange={(event) => setField('description', event.target.value)}
            />
          </CatalogField>
          <CatalogActiveField
            id="operation-active"
            label={t('toolingCompat.operations.activeLabel')}
            hint={t('toolingCompat.operations.activeHint')}
            checked={form.is_active}
            onCheckedChange={(checked) => setField('is_active', checked)}
          />
        </CatalogFormDialog>
      )}
    </Card>
  );
}
