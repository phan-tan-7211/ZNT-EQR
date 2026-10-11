import { useState } from 'react';
import { DraftingCompass, Pencil, Plus } from 'lucide-react';
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
import { useSaveToolingDesign, useToolingDesigns } from '@/features/tooling/hooks/useTooling';
import { TOOLING_TYPES, type ToolingDesign, type ToolingType } from '@/features/tooling/types';
import { toolingErrorMessage } from '@/features/tooling/utils/toolingErrors';
import { useI18n } from '@/i18n';

interface DesignForm {
  design_code: string;
  name: string;
  tooling_type: ToolingType;
  drawing_number: string;
  current_revision: string;
  revision_effective_date: string;
  description: string;
  is_active: boolean;
}

const EMPTY_FORM: DesignForm = {
  design_code: '',
  name: '',
  tooling_type: 'jig',
  drawing_number: '',
  current_revision: '',
  revision_effective_date: '',
  description: '',
  is_active: true,
};

const orNull = (value: string): string | null => (value.trim() ? value.trim() : null);

export function ToolingDesignsCatalog({ organizationId, canManage }: { organizationId: string; canManage: boolean }) {
  const { t } = useI18n();
  const { data: designs = [], isLoading, error } = useToolingDesigns(organizationId);
  const saveMutation = useSaveToolingDesign(organizationId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ToolingDesign | null>(null);
  const [form, setForm] = useState<DesignForm>(EMPTY_FORM);
  const [showRequired, setShowRequired] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowRequired(false);
    setDialogOpen(true);
  };

  const openEdit = (design: ToolingDesign) => {
    setEditing(design);
    setForm({
      design_code: design.design_code,
      name: design.name,
      tooling_type: design.tooling_type,
      drawing_number: design.drawing_number ?? '',
      current_revision: design.current_revision ?? '',
      revision_effective_date: design.revision_effective_date ?? '',
      description: design.description ?? '',
      is_active: design.is_active,
    });
    setShowRequired(false);
    setDialogOpen(true);
  };

  const set = <K extends keyof DesignForm>(key: K, value: DesignForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const codeMissing = !form.design_code.trim();
  const nameMissing = !form.name.trim();

  const save = async () => {
    if (codeMissing || nameMissing) {
      setShowRequired(true);
      toast.error(t('toolingMaster.designs.required'));
      return;
    }
    try {
      await saveMutation.mutateAsync({
        id: editing?.id,
        input: {
          design_code: form.design_code.trim(),
          name: form.name.trim(),
          tooling_type: form.tooling_type,
          drawing_number: orNull(form.drawing_number),
          current_revision: orNull(form.current_revision),
          revision_effective_date: orNull(form.revision_effective_date),
          description: orNull(form.description),
          is_active: form.is_active,
        },
      });
      toast.success(editing ? t('toolingMaster.designs.updated') : t('toolingMaster.designs.created'));
      setDialogOpen(false);
    } catch (saveError) {
      toast.error(toolingErrorMessage(saveError, t));
    }
  };

  const statusBadge = (design: ToolingDesign) => (
    <Badge variant={design.is_active ? 'secondary' : 'outline'}>
      {design.is_active ? t('toolingMaster.designs.active') : t('toolingMaster.designs.inactive')}
    </Badge>
  );

  const editButton = (design: ToolingDesign) =>
    canManage ? (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => openEdit(design)}
        aria-label={t('toolingMaster.designs.editAria', { name: design.name })}
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
      </Button>
    ) : null;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base">{t('toolingMaster.designs.title')}</CardTitle>
          <CardDescription>{t('toolingMaster.designs.description')}</CardDescription>
        </div>
        {canManage && (
          <Button onClick={openCreate} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            {t('toolingMaster.designs.add')}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2" aria-busy="true" aria-label={t('tooling.loading')}>
            {[0, 1, 2].map((row) => (
              <Skeleton key={row} className="h-12 w-full" />
            ))}
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertDescription>{t('toolingMaster.designs.loadFailed')}</AlertDescription>
          </Alert>
        ) : designs.length === 0 ? (
          <EmptyState
            icon={DraftingCompass}
            title={t('toolingMaster.designs.emptyTitle')}
            description={canManage ? t('toolingMaster.designs.emptyDescription') : t('toolingMaster.designs.emptyReadOnly')}
          />
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('toolingMaster.designs.designCode')}</TableHead>
                    <TableHead>{t('toolingMaster.designs.name')}</TableHead>
                    <TableHead>{t('toolingMaster.designs.toolingType')}</TableHead>
                    <TableHead>{t('toolingMaster.designs.drawingNumber')}</TableHead>
                    <TableHead>{t('toolingMaster.designs.currentRevision')}</TableHead>
                    <TableHead>{t('toolingMaster.designs.revisionEffectiveDate')}</TableHead>
                    <TableHead>{t('toolingMaster.designs.status')}</TableHead>
                    {canManage && <TableHead className="text-right">{t('toolingMaster.designs.actions')}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {designs.map((design) => (
                    <TableRow key={design.id}>
                      <TableCell className="whitespace-nowrap font-mono text-xs font-semibold">{design.design_code}</TableCell>
                      <TableCell>
                        <p className="font-medium">{design.name}</p>
                        {design.description && (
                          <p className="mt-0.5 max-w-xs text-xs text-muted-foreground">{design.description}</p>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{t(`tooling.types.${design.tooling_type}`)}</TableCell>
                      <TableCell>{design.drawing_number ?? t('tooling.none')}</TableCell>
                      <TableCell>{design.current_revision ?? t('tooling.none')}</TableCell>
                      <TableCell className="whitespace-nowrap">{design.revision_effective_date ?? t('tooling.none')}</TableCell>
                      <TableCell>{statusBadge(design)}</TableCell>
                      {canManage && <TableCell className="text-right">{editButton(design)}</TableCell>}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <ul className="space-y-3 md:hidden">
              {designs.map((design) => (
                <li key={design.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{design.name}</p>
                      <p className="truncate font-mono text-xs text-muted-foreground">
                        {design.design_code} · {t(`tooling.types.${design.tooling_type}`)}
                      </p>
                    </div>
                    {editButton(design)}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {statusBadge(design)}
                    {design.drawing_number && <span className="break-all">{design.drawing_number}</span>}
                    {design.current_revision && (
                      <span>{t('toolingMaster.designs.revision', { revision: design.current_revision })}</span>
                    )}
                    {design.revision_effective_date && <span>{design.revision_effective_date}</span>}
                  </div>
                  {design.description && <p className="mt-2 break-words text-xs text-muted-foreground">{design.description}</p>}
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>

      {canManage && (
        <Dialog open={dialogOpen} onOpenChange={(open) => !saveMutation.isPending && setDialogOpen(open)}>
          <DialogContent size="lg" className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editing ? t('toolingMaster.designs.editTitle') : t('toolingMaster.designs.createTitle')}
              </DialogTitle>
              <DialogDescription>{t('toolingMaster.designs.dialogDescription')}</DialogDescription>
            </DialogHeader>
            <form
              id="tooling-design-form"
              className="grid gap-4 md:grid-cols-2"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                void save();
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="tooling-design-code">{t('toolingMaster.designs.designCode')}</Label>
                <Input
                  id="tooling-design-code"
                  value={form.design_code}
                  onChange={(event) => set('design_code', event.target.value)}
                  aria-required="true"
                  aria-invalid={showRequired && codeMissing}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tooling-design-name">{t('toolingMaster.designs.name')}</Label>
                <Input
                  id="tooling-design-name"
                  value={form.name}
                  onChange={(event) => set('name', event.target.value)}
                  aria-required="true"
                  aria-invalid={showRequired && nameMissing}
                />
              </div>
              {showRequired && (codeMissing || nameMissing) && (
                <p className="text-xs text-destructive md:col-span-2" role="alert">
                  {t('toolingMaster.designs.required')}
                </p>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="tooling-design-type">{t('toolingMaster.designs.toolingType')}</Label>
                <Select value={form.tooling_type} onValueChange={(value) => set('tooling_type', value as ToolingType)}>
                  <SelectTrigger id="tooling-design-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TOOLING_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(`tooling.types.${type}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tooling-design-drawing">{t('toolingMaster.designs.drawingNumber')}</Label>
                <Input
                  id="tooling-design-drawing"
                  value={form.drawing_number}
                  onChange={(event) => set('drawing_number', event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tooling-design-revision">{t('toolingMaster.designs.currentRevision')}</Label>
                <Input
                  id="tooling-design-revision"
                  value={form.current_revision}
                  onChange={(event) => set('current_revision', event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tooling-design-revision-date">{t('toolingMaster.designs.revisionEffectiveDate')}</Label>
                <Input
                  id="tooling-design-revision-date"
                  type="date"
                  value={form.revision_effective_date}
                  onChange={(event) => set('revision_effective_date', event.target.value)}
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="tooling-design-description">{t('toolingMaster.designs.descriptionLabel')}</Label>
                <Textarea
                  id="tooling-design-description"
                  value={form.description}
                  onChange={(event) => set('description', event.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex items-start justify-between gap-3 rounded-md border p-3 md:col-span-2">
                <div className="space-y-0.5">
                  <Label htmlFor="tooling-design-active">{t('toolingMaster.designs.active')}</Label>
                  <p id="tooling-design-active-hint" className="text-xs text-muted-foreground">
                    {t('toolingMaster.designs.activeHint')}
                  </p>
                </div>
                <Switch
                  id="tooling-design-active"
                  checked={form.is_active}
                  onCheckedChange={(checked) => set('is_active', checked)}
                  aria-describedby="tooling-design-active-hint"
                />
              </div>
            </form>
            <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saveMutation.isPending}>
                {t('tooling.cancel')}
              </Button>
              <Button type="submit" form="tooling-design-form" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? t('tooling.saving') : t('tooling.save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
