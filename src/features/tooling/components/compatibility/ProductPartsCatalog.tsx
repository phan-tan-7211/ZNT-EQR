import { Package } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
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
import { useProductParts, useSaveProductPart } from '@/features/tooling/hooks/useTooling';
import type { ProductPart, ProductPartInput } from '@/features/tooling/types';
import { toolingErrorMessage } from '@/features/tooling/utils/toolingErrors';
import { useI18n } from '@/i18n';

interface ProductPartsCatalogProps {
  organizationId: string;
  canManage: boolean;
}

interface ProductPartForm {
  part_number: string;
  name: string;
  customer_name: string;
  revision: string;
  description: string;
  is_active: boolean;
}

const EMPTY_FORM: ProductPartForm = {
  part_number: '',
  name: '',
  customer_name: '',
  revision: '',
  description: '',
  is_active: true,
};

function toForm(part: ProductPart): ProductPartForm {
  return {
    part_number: part.part_number,
    name: part.name,
    customer_name: part.customer_name ?? '',
    revision: part.revision ?? '',
    description: part.description ?? '',
    is_active: part.is_active,
  };
}

function toSearchValues(part: ProductPart): string[] {
  return [part.part_number, part.name, part.customer_name ?? '', part.revision ?? ''];
}

export function ProductPartsCatalog({ organizationId, canManage }: ProductPartsCatalogProps) {
  const { t } = useI18n();
  const { data: parts = [], isLoading, error, refetch } = useProductParts(organizationId);
  const saveMutation = useSaveProductPart(organizationId);
  const { search, setSearch, filtered } = useCatalogSearch(parts, toSearchValues);
  const { dialogOpen, setDialogOpen, editing, form, setField, formError, setFormError, openCreate, openEdit } =
    useCatalogEditor<ProductPart, ProductPartForm>(EMPTY_FORM, toForm);

  const save = async () => {
    const partNumber = form.part_number.trim();
    const name = form.name.trim();
    if (!partNumber || !name) {
      setFormError(t('toolingCompat.products.required'));
      return;
    }
    const input: ProductPartInput = {
      part_number: partNumber,
      name,
      customer_name: form.customer_name.trim() || null,
      revision: form.revision.trim() || null,
      description: form.description.trim() || null,
      is_active: form.is_active,
    };
    try {
      await saveMutation.mutateAsync({ input, id: editing?.id });
      toast.success(editing ? t('toolingCompat.products.updated') : t('toolingCompat.products.created'));
      setDialogOpen(false);
    } catch (mutationError) {
      toast.error(toolingErrorMessage(mutationError, t));
    }
  };

  return (
    <Card>
      <CatalogHeader
        icon={Package}
        title={t('toolingCompat.products.title')}
        description={t('toolingCompat.products.description')}
        addLabel={t('toolingCompat.products.add')}
        onAdd={canManage ? openCreate : undefined}
      />
      <CardContent className="space-y-4">
        {!canManage && <p className="text-sm text-muted-foreground">{t('toolingCompat.common.readOnly')}</p>}
        {parts.length > 0 && (
          <CatalogSearchBar
            value={search}
            onChange={setSearch}
            placeholder={t('toolingCompat.products.searchPlaceholder')}
            label={t('toolingCompat.products.searchLabel')}
            countLabel={t('toolingCompat.products.count', { count: filtered.length })}
          />
        )}
        <CatalogListState
          isLoading={isLoading}
          hasError={Boolean(error)}
          onRetry={() => void refetch()}
          totalCount={parts.length}
          visibleCount={filtered.length}
          emptyState={
            <CatalogEmptyState
              icon={Package}
              title={t('toolingCompat.products.empty')}
              description={canManage ? t('toolingCompat.products.emptyAdmin') : t('toolingCompat.products.emptyReadOnly')}
              addLabel={t('toolingCompat.products.add')}
              onAdd={canManage ? openCreate : undefined}
            />
          }
          noMatchMessage={t('toolingCompat.products.noMatch')}
        >
          <CatalogTable
            codeHeader={t('toolingCompat.products.partNumber')}
            nameHeader={t('toolingCompat.products.name')}
            extraHeaders={[t('toolingCompat.products.customer'), t('toolingCompat.products.revision')]}
            showActions={canManage}
          >
            {filtered.map((part) => (
              <CatalogTableRow
                key={part.id}
                code={part.part_number}
                name={part.name}
                description={part.description}
                active={part.is_active}
                editLabel={t('toolingCompat.products.editAria', { name: part.part_number })}
                onEdit={canManage ? () => openEdit(part) : undefined}
              >
                <TableCell className="text-muted-foreground">{part.customer_name || t('tooling.none')}</TableCell>
                <TableCell className="text-muted-foreground">{part.revision || t('tooling.none')}</TableCell>
              </CatalogTableRow>
            ))}
          </CatalogTable>
          <ul className="space-y-2 md:hidden">
            {filtered.map((part) => (
              <CatalogMobileItem
                key={part.id}
                code={part.part_number}
                name={part.name}
                active={part.is_active}
                editLabel={t('toolingCompat.products.editAria', { name: part.part_number })}
                onEdit={canManage ? () => openEdit(part) : undefined}
              >
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <dt className="text-muted-foreground">{t('toolingCompat.products.customer')}</dt>
                  <dd className="break-words">{part.customer_name || t('tooling.none')}</dd>
                  <dt className="text-muted-foreground">{t('toolingCompat.products.revision')}</dt>
                  <dd>{part.revision || t('tooling.none')}</dd>
                </dl>
              </CatalogMobileItem>
            ))}
          </ul>
        </CatalogListState>
      </CardContent>

      {canManage && (
        <CatalogFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title={editing ? t('toolingCompat.products.editTitle') : t('toolingCompat.products.addTitle')}
          description={t('toolingCompat.products.dialogDescription')}
          error={formError}
          isSaving={saveMutation.isPending}
          onSubmit={() => void save()}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <CatalogTextField
              id="product-part-number"
              label={t('toolingCompat.products.partNumber')}
              value={form.part_number}
              required
              maxLength={100}
              placeholder={t('toolingCompat.products.partNumberPlaceholder')}
              onChange={(value) => setField('part_number', value)}
            />
            <CatalogTextField
              id="product-revision"
              label={t('toolingCompat.products.revision')}
              value={form.revision}
              maxLength={50}
              placeholder={t('toolingCompat.products.revisionPlaceholder')}
              onChange={(value) => setField('revision', value)}
            />
          </div>
          <CatalogTextField
            id="product-name"
            label={t('toolingCompat.products.name')}
            value={form.name}
            required
            maxLength={200}
            placeholder={t('toolingCompat.products.namePlaceholder')}
            onChange={(value) => setField('name', value)}
          />
          <CatalogTextField
            id="product-customer"
            label={t('toolingCompat.products.customer')}
            value={form.customer_name}
            maxLength={200}
            placeholder={t('toolingCompat.products.customerPlaceholder')}
            onChange={(value) => setField('customer_name', value)}
          />
          <CatalogField id="product-description" label={t('toolingCompat.products.descriptionLabel')}>
            <Textarea
              id="product-description"
              value={form.description}
              rows={3}
              onChange={(event) => setField('description', event.target.value)}
            />
          </CatalogField>
          <CatalogActiveField
            id="product-active"
            label={t('toolingCompat.products.activeLabel')}
            hint={t('toolingCompat.products.activeHint')}
            checked={form.is_active}
            onCheckedChange={(checked) => setField('is_active', checked)}
          />
        </CatalogFormDialog>
      )}
    </Card>
  );
}
