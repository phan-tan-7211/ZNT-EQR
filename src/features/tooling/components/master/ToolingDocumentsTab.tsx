import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import EquipmentImagesTab from '@/features/equipment/components/EquipmentImagesTab';
import type { ToolingTabProps } from '@/features/tooling/components/toolingTabProps';
import { useToolingDesigns } from '@/features/tooling/hooks/useTooling';
import { useI18n } from '@/i18n';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm font-medium">{children}</dd>
    </div>
  );
}

export function ToolingDocumentsTab({ tool }: ToolingTabProps) {
  const { t } = useI18n();
  const none = t('tooling.none');
  const { data: designs = [], isLoading: designsLoading } = useToolingDesigns(
    tool.design_id ? tool.organization_id : undefined,
  );
  const design = tool.design_id ? designs.find((item) => item.id === tool.design_id) : undefined;
  const revisionMismatch =
    Boolean(design?.current_revision) && (tool.drawing_revision ?? '') !== (design?.current_revision ?? '');

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('toolingMaster.documents.drawingTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 sm:grid-cols-2">
              <Field label={t('toolingMaster.documents.drawingNumber')}>{tool.drawing_number ?? none}</Field>
              <Field label={t('toolingMaster.documents.drawingRevision')}>{tool.drawing_revision ?? none}</Field>
              <Field label={t('toolingMaster.documents.revisionEffectiveDate')}>
                {tool.revision_effective_date ?? none}
              </Field>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('toolingMaster.documents.designTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!tool.design_id ? (
              <p className="text-sm text-muted-foreground">{t('toolingMaster.documents.noDesign')}</p>
            ) : designsLoading ? (
              <p className="text-sm text-muted-foreground">{t('tooling.loading')}</p>
            ) : (
              <>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <Field label={t('toolingMaster.documents.designCode')}>
                    <span className="font-mono">{design?.design_code ?? tool.design_code ?? none}</span>
                  </Field>
                  <Field label={t('toolingMaster.documents.designName')}>{design?.name ?? tool.design_name ?? none}</Field>
                  <Field label={t('toolingMaster.documents.designRevision')}>{design?.current_revision ?? none}</Field>
                  <Field label={t('toolingMaster.documents.revisionEffectiveDate')}>
                    {design?.revision_effective_date ?? none}
                  </Field>
                </dl>
                {!design ? (
                  <p className="text-sm text-muted-foreground">{t('toolingMaster.documents.designNotFound')}</p>
                ) : revisionMismatch ? (
                  <Alert variant="destructive" data-testid="tooling-revision-mismatch">
                    <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                    <AlertDescription>
                      {t('toolingMaster.documents.revisionMismatch', {
                        tool: tool.drawing_revision ?? none,
                        design: design.current_revision ?? none,
                      })}
                    </AlertDescription>
                  </Alert>
                ) : design.current_revision ? (
                  <p className="flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    {t('toolingMaster.documents.revisionMatch')}
                  </p>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 pb-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">{t('toolingMaster.documents.attachmentsTitle')}</CardTitle>
            <CardDescription>
              {t('toolingMaster.documents.attachmentsDescription')} {t('toolingMaster.documents.moreDocuments')}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
            <Link to={`/dashboard/equipment/${tool.id}`}>
              <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
              {t('toolingMaster.documents.openEquipment')}
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <EquipmentImagesTab
            equipmentId={tool.id}
            organizationId={tool.organization_id}
            equipmentTeamId={tool.team_id ?? undefined}
            currentDisplayImage={tool.image_url ?? undefined}
            equipmentName={tool.name}
          />
        </CardContent>
      </Card>
    </div>
  );
}
