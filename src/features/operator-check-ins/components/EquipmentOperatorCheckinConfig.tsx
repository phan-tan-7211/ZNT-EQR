import { useMemo, useState } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { Link } from 'react-router-dom';
import {
  ClipboardSignature,
  MoreVertical,
  QrCode,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink } from '@/components/ui/external-link';
import { OPERATOR_DAILY_CHECK_INS_DOCS_URL } from '@/lib/documentationUrl';
import { localizeDocsUrl } from '@/lib/localizeDocsUrl';
import { useOperatorChecklistTemplates } from '@/features/operator-check-ins/hooks/useOperatorChecklistTemplates';
import {
  useCreateEquipmentOperatorCheckinAssignment,
  useDeleteEquipmentOperatorCheckinAssignment,
  useEquipmentOperatorCheckinAssignments,
  useOperatorCheckinToken,
  useRotateOperatorCheckinToken,
} from '@/features/operator-check-ins/hooks/useOperatorCheckinSettings';
import type { EquipmentOperatorCheckinAssignment } from '@/features/operator-check-ins/services/operatorCheckinSettingsService';
import { isDuplicateOperatorCheckinAssignmentError } from '@/features/operator-check-ins/utils/operatorCheckinAssignmentErrors';
import { EquipmentOperatorCheckinTemplateAssignmentMenu } from './EquipmentOperatorCheckinTemplateAssignmentMenu';

interface EquipmentOperatorCheckinConfigProps {
  organizationId: string;
  equipmentId: string;
  equipmentName: string;
  onOpenQrCodeForAssignment: (assignmentId: string) => void;
}

function AssignedChecklistRow({
  assignment,
  isBusy,
  onRotateToken,
  onRemove,
  onViewQrCode,
}: {
  assignment: EquipmentOperatorCheckinAssignment;
  isBusy: boolean;
  onRotateToken: () => void;
  onRemove: () => void;
  onViewQrCode: () => void;
}) {
  const { data: storedToken = null, isPending: isTokenPending } = useOperatorCheckinToken(
    assignment.id,
    assignment.organization_id,
  );
  const hasStoredToken = Boolean(storedToken);
  const [rotateDialogOpen, setRotateDialogOpen] = useState(false);

  const { t } = useI18n();
  const templateName = assignment.template?.name ?? t('operatorEquipment.checklist');

  const handleRotateRequest = () => {
    if (hasStoredToken || isTokenPending) {
      setRotateDialogOpen(true);
      return;
    }
    onRotateToken();
  };

  const handleConfirmRotate = () => {
    setRotateDialogOpen(false);
    onRotateToken();
  };

  return (
    <li className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium leading-tight">{templateName}</p>
        {assignment.enabled && !hasStoredToken && !isTokenPending && (
          <p className="mt-1 text-xs text-muted-foreground">
            {t('operatorEquipment.generateQrHint')}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={isBusy} onClick={onViewQrCode}>
          <QrCode className="mr-2 h-4 w-4" />
          {t('operatorEquipment.viewQr')}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0 touch-manipulation"
              disabled={isBusy}
              aria-label={t('operatorEquipment.checklistActions', { name: templateName })}
            >
              <MoreVertical className="h-4 w-4" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-52">
            <DropdownMenuItem onSelect={handleRotateRequest}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {t(hasStoredToken || isTokenPending ? 'operatorEquipment.rotateQr' : 'operatorEquipment.generateQr')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={onRemove}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t('operatorEquipment.removeChecklist')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={rotateDialogOpen} onOpenChange={setRotateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('operatorEquipment.rotateConfirm', { name: templateName })}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                {t('operatorEquipment.rotateWarning', { name: templateName })}
              </span>
              <span className="block">
                {t('operatorEquipment.replacePrinted')}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBusy}>{t('operatorEquipment.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={isBusy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmRotate}
            >
              {t('operatorEquipment.rotateQr')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}

export function EquipmentOperatorCheckinConfig({
  organizationId,
  equipmentId,
  equipmentName,
  onOpenQrCodeForAssignment,
}: EquipmentOperatorCheckinConfigProps) {
  const { t, language } = useI18n();
  const { data: templates = [], isLoading: templatesLoading } =
    useOperatorChecklistTemplates(organizationId);
  const { data: assignments = [], isLoading: assignmentsLoading } =
    useEquipmentOperatorCheckinAssignments(equipmentId, organizationId);
  const createMutation = useCreateEquipmentOperatorCheckinAssignment();
  const deleteMutation = useDeleteEquipmentOperatorCheckinAssignment(equipmentId, organizationId);
  const rotateMutation = useRotateOperatorCheckinToken(equipmentId, organizationId);

  const isBusy =
    createMutation.isPending ||
    deleteMutation.isPending ||
    rotateMutation.isPending;

  const activeTemplateCount = useMemo(
    () => templates.filter((template) => template.is_active).length,
    [templates],
  );

  async function handleAssignTemplateIds(templateIds: string[]) {
    if (templateIds.length === 0) return;

    let assignedCount = 0;
    try {
      for (const templateId of templateIds) {
        try {
          await createMutation.mutateAsync({
            organizationId,
            equipmentId,
            templateId,
            enabled: true,
          });
          assignedCount += 1;
        } catch (error) {
          if (!isDuplicateOperatorCheckinAssignmentError(error)) {
            throw error;
          }
        }
      }

      if (assignedCount > 0) {
        toast.success(
          t(assignedCount === 1 ? 'operatorEquipment.assignedSuccess' : 'operatorEquipment.assignedSuccessPlural', { count: assignedCount }),
        );
      } else {
        toast.success(t('operatorEquipment.alreadyAssigned'));
      }
    } catch {
      toast.error(t('operatorEquipment.assignFailed'));
    }
  }

  async function handleRotateToken(assignmentId: string) {
    try {
      await rotateMutation.mutateAsync(assignmentId);
      toast.success(t('operatorEquipment.qrUpdated'));
    } catch {
      toast.error(t('operatorEquipment.rotateFailed'));
    }
  }

  async function handleRemove(assignmentId: string) {
    try {
      await deleteMutation.mutateAsync(assignmentId);
      toast.success(t('operatorEquipment.removed'));
    } catch {
      toast.error(t('operatorEquipment.removeFailed'));
    }
  }

  if (templatesLoading || assignmentsLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('operatorEquipment.dailyCheckin')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-16 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardSignature className="h-4 w-4" />
          {t('operatorEquipment.dailyCheckin')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t('operatorEquipment.intro', { name: equipmentName })}{' '}
          <ExternalLink href={localizeDocsUrl(OPERATOR_DAILY_CHECK_INS_DOCS_URL, language)} className="text-sm">
            {t('operatorEquipment.guide')}
          </ExternalLink>
        </p>

        {templates.length === 0 ? (
          <Alert>
            <AlertDescription>
              {t('operatorEquipment.createFirst')}{' '}
              <Link to="/dashboard/operator-check-ins" className="text-primary underline">
                {t('operatorEquipment.dailyCheckins')}
              </Link>{' '}
              {t('operatorEquipment.page')}
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {assignments.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  {t(assignments.length === 1 ? 'operatorEquipment.assignedCount' : 'operatorEquipment.assignedCountPlural', { count: assignments.length })}
                </p>
                <ul className="divide-y rounded-lg border">
                  {assignments.map((assignment) => (
                    <AssignedChecklistRow
                      key={assignment.id}
                      assignment={assignment}
                      isBusy={isBusy}
                      onRotateToken={() => void handleRotateToken(assignment.id)}
                      onRemove={() => void handleRemove(assignment.id)}
                      onViewQrCode={() => onOpenQrCodeForAssignment(assignment.id)}
                    />
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('operatorEquipment.noneAssigned')}</p>
            )}

            {activeTemplateCount > 0 ? (
              <EquipmentOperatorCheckinTemplateAssignmentMenu
                equipmentId={equipmentId}
                equipmentName={equipmentName}
                templates={templates}
                assignments={assignments}
                assignedCount={assignments.length}
                isTemplatesLoading={templatesLoading}
                isAssignmentsLoading={assignmentsLoading}
                isAssigning={createMutation.isPending}
                onAssignTemplateIds={handleAssignTemplateIds}
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                {t('operatorEquipment.allInactive')}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
