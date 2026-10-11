import { useMemo, useState } from 'react';
import { Package, Pencil, Plus, Search } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
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

export function ProductPartsCatalog({ organizationId, canManage }: ProductPartsCatalogProps) {
  const { t } = useI18n();
  const { data: parts = [], isLoading, error, refetch } = useProductParts(organizationId);
  const saveMutation = useSaveProductPart(organizationId);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProductPart | null>(null);
  const [form, setForm] = useState<ProductPartForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return parts;
    return parts.filter((part) =>
      [part.part_number, part.name, part.customer_name ?? '', part.revision ?? '']
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [parts, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (part: ProductPart) => {
    setEditing(part);
    setForm(toForm(part));
    setFormError(null);
    setDialogOpen(true);
  };

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
    if (parts.length === 0) {
      return (
        <EmptyState
          icon={Package}
          title={t('toolingCompat.products.empty')}
          description={canManage ? t('toolingCompat.products.emptyAdmin') : t('toolingCompat.products.emptyReadOnly')}
          action={
            canManage ? (
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                {t('toolingCompat.products.add')}
              </Button>
            ) : undefined
          }
        />
      );
    }
    if (filtered.length === 0) {
      return <p className="py-6 text-center text-sm text-muted-foreground">{t('toolingCompat.products.noMatch')}</p>;
    }
    return (
      <>
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('toolingCompat.products.partNumber')}</TableHead>
                <TableHead>{t('toolingCompat.products.name')}</TableHead>
                <TableHead>{t('toolingCompat.products.customer')}</TableHead>
                <TableHead>{t('toolingCompat.products.revision')}</TableHead>
                <TableHead>{t('toolingCompat.common.status')}</TableHead>
                {canManage && <TableHead className="text-right">{t('toolingCompat.common.actions')}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((part) => (
                <TableRow key={part.id}>
                  <TableCell className="font-mono font-medium">{part.part_number}</TableCell>
                  <TableCell>
                    <p className="font-medium">{part.name}</p>
                    {part.description && (
                      <p className="mt-0.5 max-w-sm text-xs text-muted-foreground">{part.description}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{part.customer_name || t('tooling.none')}</TableCell>
                  <TableCell className="text-muted-foreground">{part.revision || t('tooling.none')}</TableCell>
                  <TableCell>
                    <ActiveBadge active={part.is_active} />
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(part)}
                        aria-label={t('toolingCompat.products.editAria', { name: part.part_number })}
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
          {filtered.map((part) => (
            <li key={part.id} className="rounded-lg border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-words font-mono text-sm font-semibold">{part.part_number}</p>
                  <p className="break-words text-sm">{part.name}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <ActiveBadge active={part.is_active} />
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(part)}
                      aria-label={t('toolingCompat.products.editAria', { name: part.part_number })}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <dt className="text-muted-foreground">{t('toolingCompat.products.customer')}</dt>
                <dd className="break-words">{part.customer_name || t('tooling.none')}</dd>
                <dt className="text-muted-foreground">{t('toolingCompat.products.revision')}</dt>
                <dd>{part.revision || t('tooling.none')}</dd>
              </dl>
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
            <Package className="h-5 w-5" aria-hidden="true" />
            {t('toolingCompat.products.title')}
          </CardTitle>
          <CardDescription>{t('toolingCompat.products.description')}</CardDescription>
        </div>
        {canManage && (
          <Button onClick={openCreate} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            {t('toolingCompat.products.add')}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {!canManage && <p className="text-sm text-muted-foreground">{t('toolingCompat.common.readOnly')}</p>}
        {parts.length > 0 && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('toolingCompat.products.searchPlaceholder')}
                aria-label={t('toolingCompat.products.searchLabel')}
                className="pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t('toolingCompat.products.count', { count: filtered.length })}
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
                {editing ? t('toolingCompat.products.editTitle') : t('toolingCompat.products.addTitle')}
              </DialogTitle>
              <DialogDescription>{t('toolingCompat.products.dialogDescription')}</DialogDescription>
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
                  <Label htmlFor="product-part-number">
                    {t('toolingCompat.products.partNumber')} <span aria-hidden="true">*</span>
                  </Label>
                  <Input
                    id="product-part-number"
                    value={form.part_number}
                    required
                    aria-required="true"
                    maxLength={100}
                    placeholder={t('toolingCompat.products.partNumberPlaceholder')}
                    onChange={(event) => setForm((value) => ({ ...value, part_number: event.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="product-revision">{t('toolingCompat.products.revision')}</Label>
                  <Input
                    id="product-revision"
                    value={form.revision}
                    maxLength={50}
                    placeholder={t('toolingCompat.products.revisionPlaceholder')}
                    onChange={(event) => setForm((value) => ({ ...value, revision: event.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="product-name">
                  {t('toolingCompat.products.name')} <span aria-hidden="true">*</span>
                </Label>
                <Input
                  id="product-name"
                  value={form.name}
                  required
                  aria-required="true"
                  maxLength={200}
                  placeholder={t('toolingCompat.products.namePlaceholder')}
                  onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="product-customer">{t('toolingCompat.products.customer')}</Label>
                <Input
                  id="product-customer"
                  value={form.customer_name}
                  maxLength={200}
                  placeholder={t('toolingCompat.products.customerPlaceholder')}
                  onChange={(event) => setForm((value) => ({ ...value, customer_name: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="product-description">{t('toolingCompat.products.descriptionLabel')}</Label>
                <Textarea
                  id="product-description"
                  value={form.description}
                  rows={3}
                  onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))}
                />
              </div>
              <div className="flex items-start justify-between gap-3 rounded-md border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="product-active">{t('toolingCompat.products.activeLabel')}</Label>
                  <p className="text-xs text-muted-foreground">{t('toolingCompat.products.activeHint')}</p>
                </div>
                <Switch
                  id="product-active"
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
