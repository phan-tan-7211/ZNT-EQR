import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import AssetQRCodeDisplay from '@/components/common/AssetQRCodeDisplay';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink } from '@/components/ui/external-link';
import { OPERATOR_DAILY_CHECK_INS_DOCS_URL } from '@/lib/documentationUrl';
import { localizeDocsUrl } from '@/lib/localizeDocsUrl';
import { usePermissions } from '@/hooks/usePermissions';
import {
  useEquipmentOperatorCheckinAssignments,
  useOperatorCheckinToken,
  useRotateOperatorCheckinToken,
} from '@/features/operator-check-ins/hooks/useOperatorCheckinSettings';
import { equipmentQRPath, operatorCheckInQRPath, qrFullUrl } from '@/utils/qr';
import { useI18n } from '@/i18n';

const EQUIPMENT_VARIANT = 'equipment';
export type EquipmentQRVariant = typeof EQUIPMENT_VARIANT | `assignment:${string}`;
type QRVariant = EquipmentQRVariant;

function isAssignmentVariant(variant: QRVariant): variant is `assignment:${string}` {
  return variant.startsWith('assignment:');
}

function assignmentIdFromVariant(variant: QRVariant): string | null {
  return isAssignmentVariant(variant) ? variant.slice('assignment:'.length) : null;
}

interface QRCodeDisplayProps {
  open: boolean;
  onClose: () => void;
  equipmentId: string;
  equipmentName?: string;
  organizationId?: string;
  initialVariant?: QRVariant;
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  open,
  onClose,
  equipmentId,
  equipmentName,
  organizationId,
  initialVariant = EQUIPMENT_VARIANT,
}) => {
  const { t, language } = useI18n();
  const { data: assignments = [], isLoading: assignmentsLoading } = useEquipmentOperatorCheckinAssignments(
    equipmentId,
    organizationId,
    { enabled: open },
  );
  const [variant, setVariant] = useState<QRVariant>(initialVariant);

  const enabledAssignments = useMemo(
    () => assignments.filter((assignment) => assignment.enabled),
    [assignments],
  );

  useEffect(() => {
    if (open) setVariant(initialVariant);
  }, [open, equipmentId, initialVariant]);

  useEffect(() => {
    if (!open || assignmentsLoading) return;
    const selectedAssignmentId = assignmentIdFromVariant(variant);
    if (selectedAssignmentId) {
      const stillValid = enabledAssignments.some((assignment) => assignment.id === selectedAssignmentId);
      if (!stillValid) setVariant(EQUIPMENT_VARIANT);
    }
  }, [open, variant, enabledAssignments, assignmentsLoading]);

  const selectedAssignmentId = assignmentIdFromVariant(variant);
  const selectedAssignment = enabledAssignments.find((assignment) => assignment.id === selectedAssignmentId);
  const { data: storedToken = null, isLoading: isTokenLoading } = useOperatorCheckinToken(
    selectedAssignment?.id,
    selectedAssignment?.organization_id,
    { enabled: open },
  );

  const { hasRole } = usePermissions();
  const canGenerateCheckinLink = hasRole(['owner', 'admin']);
  const rotateTokenMutation = useRotateOperatorCheckinToken(equipmentId, organizationId ?? '');

  const handleGenerateCheckinLink = async () => {
    if (!selectedAssignment) return;
    if (!canGenerateCheckinLink) {
      toast.error(t('equipmentAux.qr.ownersOnly'));
      return;
    }
    try {
      await rotateTokenMutation.mutateAsync(selectedAssignment.id);
      toast.success(t('equipmentAux.qr.generated'));
    } catch {
      toast.error(t('equipmentAux.qr.generateFailed'));
    }
  };

  const equipmentInstructions = useMemo(() => [
    t('equipmentAux.qr.equipmentInstruction1'),
    t('equipmentAux.qr.equipmentInstruction2'),
    t('equipmentAux.qr.equipmentInstruction3'),
    t('equipmentAux.qr.equipmentInstruction4'),
  ], [t]);

  const operatorCheckinInstructions = useMemo(() => [
    t('equipmentAux.qr.checkinInstruction1'),
    t('equipmentAux.qr.checkinInstruction2'),
    t('equipmentAux.qr.checkinInstruction3'),
    t('equipmentAux.qr.checkinInstruction4'),
  ], [t]);

  const activeConfig = useMemo(() => {
    if (selectedAssignment) {
      const checklistName = selectedAssignment.template?.name ?? t('equipmentAux.qr.dailyCheckinDefault');
      return {
        title: t('equipmentAux.qr.checklistTitle', { name: checklistName }),
        qrCodeUrl: storedToken ? qrFullUrl(operatorCheckInQRPath(storedToken)) : '',
        qrImageAlt: t('equipmentAux.qr.checklistImageAlt', { name: checklistName, equipment: equipmentName ?? equipmentId }),
        defaultFilenameStem: `${equipmentName ?? equipmentId}-${checklistName}`.replace(/\s+/g, '-'),
        instructionBullets: operatorCheckinInstructions,
      };
    }

    return {
      title: t('equipmentAux.qr.title'),
      qrCodeUrl: qrFullUrl(equipmentQRPath(equipmentId, organizationId)),
      qrImageAlt: t('equipmentAux.qr.imageAlt'),
      defaultFilenameStem: `equipment-${equipmentId}`,
      instructionBullets: equipmentInstructions,
    };
  }, [selectedAssignment, storedToken, equipmentId, equipmentName, organizationId, operatorCheckinInstructions, equipmentInstructions, t]);

  const showMissingTokenNotice = Boolean(selectedAssignment && !storedToken && !isTokenLoading);
  const hasAssignmentOptions = enabledAssignments.length > 0;
  const isDailyCheckinVariant = isAssignmentVariant(variant);
  const selectedChecklistName = selectedAssignment?.template?.name ?? t('equipmentAux.qr.thisChecklist');

  return (
    <AssetQRCodeDisplay
      open={open}
      onClose={onClose}
      entityId={equipmentId}
      entityName={equipmentName}
      title={activeConfig.title}
      resourceLabel={t('equipmentAux.qr.equipment')}
      qrCodeUrl={activeConfig.qrCodeUrl}
      qrImageAlt={activeConfig.qrImageAlt}
      defaultFilenameStem={activeConfig.defaultFilenameStem}
      instructionBullets={activeConfig.instructionBullets}
      imageLoading="lazy"
      headerExtra={
        hasAssignmentOptions ? (
          <div className="space-y-3 pb-2">
            <div className="space-y-2">
              <Label htmlFor="equipment-qr-variant">{t('equipmentAux.qr.codeType')}</Label>
              <Select value={variant} onValueChange={(value) => setVariant(value as QRVariant)}>
                <SelectTrigger id="equipment-qr-variant">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EQUIPMENT_VARIANT}>{t('equipmentAux.qr.authenticatedScan')}</SelectItem>
                  {enabledAssignments.map((assignment) => (
                    <SelectItem key={assignment.id} value={`assignment:${assignment.id}`}>
                      {t('equipmentAux.qr.dailyCheckin', { name: assignment.template?.name ?? t('equipmentAux.qr.defaultChecklist') })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {showMissingTokenNotice && (
              <Alert>
                <AlertDescription className="space-y-2">
                  {canGenerateCheckinLink ? (
                    <>
                      <p>{t('equipmentAux.qr.noStoredLink', { name: selectedChecklistName })}</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={rotateTokenMutation.isPending}
                        onClick={() => void handleGenerateCheckinLink()}
                      >
                        {rotateTokenMutation.isPending ? t('equipmentAux.qr.generating') : t('equipmentAux.qr.generateLink')}
                      </Button>
                    </>
                  ) : (
                    <p>{t('equipmentAux.qr.unavailable', { name: selectedChecklistName })}</p>
                  )}
                </AlertDescription>
              </Alert>
            )}
            {isDailyCheckinVariant && !showMissingTokenNotice && (
              <p className="text-sm text-muted-foreground">
                <ExternalLink href={localizeDocsUrl(OPERATOR_DAILY_CHECK_INS_DOCS_URL, language)} className="text-sm">
                  {t('equipmentAux.qr.placementGuide')}
                </ExternalLink>
              </p>
            )}
          </div>
        ) : undefined
      }
      suppressQrPanel={Boolean(selectedAssignment && (isTokenLoading || !storedToken))}
    />
  );
};

export default QRCodeDisplay;
