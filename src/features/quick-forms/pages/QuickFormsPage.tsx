import { useMemo, useState } from 'react';
import { useI18n } from '@/i18n';
import { FileSignature, Pencil, Plus, QrCode, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import { AdminOnlyPageAlert } from '@/components/common/OrganizationPageAlerts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import EmptyState from '@/components/ui/empty-state';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePermissions } from '@/hooks/usePermissions';
import {
  useCreateQuickForm,
  useDeleteQuickForm,
  useQuickForms,
  useRotateQuickFormToken,
  useUpdateQuickForm,
} from '@/features/quick-forms/hooks/useQuickForms';
import { QuickFormDialog } from '@/features/quick-forms/components/QuickFormDialog';
import { QuickFormQrDialog } from '@/features/quick-forms/components/QuickFormQrDialog';
import { QuickFormLedgerPanel } from '@/features/quick-forms/components/QuickFormLedgerPanel';
import { parseQuickFormData, type QuickFormData } from '@/features/quick-forms/types/quickForm';
import type { QuickForm } from '@/features/quick-forms/services/quickFormsService';
import { logger } from '@/utils/logger';

export default function QuickFormsPage() {
  const { t } = useI18n();
  const { currentOrganization } = useOrganization();
  const { hasRole } = usePermissions();
  const isAdmin = hasRole(['owner', 'admin']);
  const orgId = currentOrganization?.id;

  const { data: forms = [], isLoading } = useQuickForms(isAdmin ? orgId : undefined);
  const createMutation = useCreateQuickForm(orgId);
  const updateMutation = useUpdateQuickForm(orgId);
  const deleteMutation = useDeleteQuickForm(orgId);
  const rotateMutation = useRotateQuickFormToken(orgId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [qrFormId, setQrFormId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<QuickForm | null>(null);

  const editingForm = useMemo(
    () => forms.find((form) => form.id === editingFormId) ?? null,
    [forms, editingFormId],
  );
  const qrForm = useMemo(
    () => forms.find((form) => form.id === qrFormId) ?? null,
    [forms, qrFormId],
  );

  if (!currentOrganization) {
    return (
      <Page maxWidth="full" padding="workspace">
        <PageHeader title={t('quickForms.page.title')} description={t('quickForms.page.selectOrganization')} />
      </Page>
    );
  }

  if (!isAdmin) {
    return (
      <AdminOnlyPageAlert
        title={t('quickForms.page.accessDenied')}
        description={t('quickForms.page.accessDescription')}
      />
    );
  }

  const handleDialogSubmit = async (input: {
    name: string;
    description: string | null;
    formData: QuickFormData;
  }) => {
    try {
      if (editingForm) {
        await updateMutation.mutateAsync({ formId: editingForm.id, ...input });
        toast.success(t('quickForms.page.updated'));
      } else {
        await createMutation.mutateAsync(input);
        toast.success(t('quickForms.page.created'));
      }
      setDialogOpen(false);
      setEditingFormId(null);
    } catch (error) {
      logger.error('Failed to save quick form', error);
      toast.error(t('quickForms.page.saveError'));
    }
  };

  const handleToggleActive = async (form: QuickForm, isActive: boolean) => {
    try {
      await updateMutation.mutateAsync({ formId: form.id, isActive });
      toast.success(isActive ? t('quickForms.page.activated') : t('quickForms.page.deactivated'));
    } catch (error) {
      logger.error('Failed to toggle quick form', error);
      toast.error(t('quickForms.page.updateError'));
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteMutation.mutateAsync(pendingDelete.id);
      toast.success(t('quickForms.page.deleted'));
    } catch (error) {
      logger.error('Failed to delete quick form', error);
      toast.error(t('quickForms.page.deleteError'));
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <Page maxWidth="full" padding="workspace">
      <div className="space-y-5">
        <PageHeader
          title={t('quickForms.page.title')}
          description={t('quickForms.page.subtitle')}
          actions={
            <Button
              onClick={() => {
                setEditingFormId(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('quickForms.page.new')}
            </Button>
          }
        />

        <Tabs defaultValue="forms" className="space-y-4">
          <TabsList>
            <TabsTrigger value="forms">{t('quickForms.page.forms')}</TabsTrigger>
            <TabsTrigger value="ledger">{t('quickForms.page.ledger')}</TabsTrigger>
          </TabsList>

          <TabsContent value="forms" className="space-y-4">
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-40 w-full" />
                ))}
              </div>
            ) : forms.length === 0 ? (
              <EmptyState
                icon={FileSignature}
                title={t('quickForms.page.emptyTitle')}
                description={t('quickForms.page.emptyDescription')}
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {forms.map((form) => {
                  const parsed = parseQuickFormData(form.form_data);
                  return (
                    <Card key={form.id} data-testid="quick-form-card">
                      <CardHeader className="pb-2">
                        <div className="flex items-start gap-2">
                          <CardTitle className="text-base flex-1 min-w-0 truncate">
                            {form.name}
                          </CardTitle>
                          <Badge variant={form.is_active ? 'default' : 'secondary'}>
                            {form.is_active ? t('quickForms.page.active') : t('quickForms.page.inactive')}
                          </Badge>
                        </div>
                        {form.description && (
                          <p className="text-sm text-muted-foreground">{form.description}</p>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-xs text-muted-foreground">
                          {t(parsed.fields.length === 1 ? 'quickForms.page.fieldCount' : 'quickForms.page.fieldsCount', { count: parsed.fields.length })}
                          {parsed.collectLocation ? t('quickForms.page.asksGPS') : ''}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setQrFormId(form.id)}
                          >
                            <QrCode className="h-4 w-4 mr-2" />
                            {t('quickForms.page.qrLink')}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingFormId(form.id);
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            {t('quickForms.page.edit')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => setPendingDelete(form)}
                            aria-label={t('quickForms.page.deleteNamed', { name: form.name })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <div className="ml-auto flex items-center gap-2">
                            <Switch
                              id={`quick-form-active-${form.id}`}
                              checked={form.is_active}
                              onCheckedChange={(checked) => void handleToggleActive(form, checked)}
                              aria-label={t('quickForms.page.toggleActive', { name: form.name })}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="ledger">
            <QuickFormLedgerPanel organizationId={currentOrganization.id} forms={forms} />
          </TabsContent>
        </Tabs>
      </div>

      <QuickFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingFormId(null);
        }}
        editingForm={editingForm}
        onSubmit={handleDialogSubmit}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />

      <QuickFormQrDialog
        open={qrFormId !== null}
        onOpenChange={(open) => !open && setQrFormId(null)}
        form={qrForm}
        onRotateToken={(formId) => rotateMutation.mutateAsync(formId)}
        isRotating={rotateMutation.isPending}
      />

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('quickForms.page.deleteTitle', { name: pendingDelete?.name ?? '' })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('quickForms.page.deleteDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('quickForms.page.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void handleDelete()}
            >
              {t('quickForms.page.deleteForm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
}
