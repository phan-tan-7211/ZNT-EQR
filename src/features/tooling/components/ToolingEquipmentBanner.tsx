import { Link } from 'react-router-dom';
import { Wrench } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ToolingStatusBadges } from '@/features/tooling/components/ToolingStatusBadges';
import { useTooling } from '@/features/tooling/hooks/useTooling';
import { useI18n } from '@/i18n';

/**
 * Shown on the equipment details page (the landing page of an equipment QR
 * scan) when the asset is registered tooling, so a scan leads straight to
 * issue / return and tool-life actions. Renders nothing for other equipment.
 */
export function ToolingEquipmentBanner({ equipmentId }: { equipmentId: string }) {
  const { t } = useI18n();
  const { data: tool } = useTooling(equipmentId);
  if (!tool) return null;

  return (
    <Alert data-testid="tooling-equipment-banner">
      <Wrench className="h-4 w-4" aria-hidden="true" />
      <AlertTitle>{t('tooling.equipmentBanner.title', { type: t(`tooling.types.${tool.tooling_type}`) })}</AlertTitle>
      <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ToolingStatusBadges tool={tool} />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" asChild>
            <Link to={`/dashboard/tooling/${tool.id}?tab=issueReturn`}>{t('tooling.equipmentBanner.issueReturn')}</Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link to={`/dashboard/tooling/${tool.id}`}>{t('tooling.equipmentBanner.open')}</Link>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
