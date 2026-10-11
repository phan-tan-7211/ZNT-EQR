import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ExternalLink, QrCode, Wrench } from 'lucide-react';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import QRCodeDisplay from '@/features/equipment/components/QRCodeDisplay';
import { ToolingStatusBadges } from '@/features/tooling/components/ToolingStatusBadges';
import { ToolingHistoryExportButton } from '@/features/tooling/components/reports/ToolingHistoryExportButton';
import { ToolingOverviewTab } from '@/features/tooling/components/master/ToolingOverviewTab';
import { ToolingDocumentsTab } from '@/features/tooling/components/master/ToolingDocumentsTab';
import { ToolingHistoryTab } from '@/features/tooling/components/master/ToolingHistoryTab';
import { ToolingCompatibilityTab } from '@/features/tooling/components/compatibility/ToolingCompatibilityTab';
import { ToolingIssueReturnTab } from '@/features/tooling/components/operations/ToolingIssueReturnTab';
import { ToolingUsageTab } from '@/features/tooling/components/operations/ToolingUsageTab';
import { ToolingMaintenanceTab } from '@/features/tooling/components/operations/ToolingMaintenanceTab';
import { useTooling } from '@/features/tooling/hooks/useTooling';
import { useToolingPermissions } from '@/features/tooling/hooks/useToolingPermissions';
import { useI18n } from '@/i18n';

const TABS = ['overview', 'compatibility', 'issueReturn', 'usage', 'maintenance', 'documents', 'history'] as const;
type ToolingTab = (typeof TABS)[number];

function isToolingTab(value: string | null): value is ToolingTab {
  return value !== null && (TABS as readonly string[]).includes(value);
}

export default function ToolingDetailPage() {
  const { t } = useI18n();
  const { toolingId } = useParams<{ toolingId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [qrOpen, setQrOpen] = useState(false);
  const { data: tool, isLoading, error } = useTooling(toolingId);
  const { canManage, canOperate } = useToolingPermissions(tool?.team_id);

  const tabParam = searchParams.get('tab');
  const activeTab: ToolingTab = isToolingTab(tabParam) ? tabParam : 'overview';
  const setTab = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', value);
    setSearchParams(next, { replace: true });
  };

  if (isLoading) {
    return (
      <Page maxWidth="full" padding="workspace">
        <div className="space-y-4" aria-busy="true" aria-label={t('tooling.loading')}>
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Page>
    );
  }

  if (error || !tool) {
    return (
      <Page maxWidth="full" padding="workspace">
        <PageHeader
          title={t('tooling.title')}
          backLink={{ label: t('tooling.backToList'), href: '/dashboard/tooling' }}
        />
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{error ? t('tooling.loadFailed') : t('tooling.notFound')}</AlertDescription>
        </Alert>
      </Page>
    );
  }

  const tabProps = { tool, canManage, canOperate };

  return (
    <Page maxWidth="full" padding="workspace">
      <div className="space-y-4">
        <PageHeader
          title={tool.name}
          icon={<Wrench className="h-6 w-6" aria-hidden="true" />}
          backLink={{ label: t('tooling.backToList'), href: '/dashboard/tooling' }}
          description={
            <span className="font-mono text-sm" data-testid="tooling-management-code">
              {tool.management_code ?? t('tooling.none')} · {t(`tooling.types.${tool.tooling_type}`)}
            </span>
          }
          meta={<ToolingStatusBadges tool={tool} />}
          actions={
            <div className="flex flex-wrap gap-2">
              <ToolingHistoryExportButton tool={tool} />
              <Button variant="outline" size="sm" onClick={() => setQrOpen(true)}>
                <QrCode className="mr-2 h-4 w-4" aria-hidden="true" />
                {t('tooling.showQr')}
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/dashboard/equipment/${tool.id}`}>
                  <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t('tooling.openEquipmentRecord')}
                </Link>
              </Button>
            </div>
          }
        />

        {!canOperate && (
          <Alert>
            <AlertDescription>{t('tooling.readOnlyHint')}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setTab} className="space-y-4">
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <TabsList className="inline-flex h-auto w-max min-w-full justify-start">
              {TABS.map((tab) => (
                <TabsTrigger key={tab} value={tab} className="whitespace-nowrap" data-testid={`tooling-tab-${tab}`}>
                  {t(`tooling.tabs.${tab}`)}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <TabsContent value="overview"><ToolingOverviewTab {...tabProps} /></TabsContent>
          <TabsContent value="compatibility"><ToolingCompatibilityTab {...tabProps} /></TabsContent>
          <TabsContent value="issueReturn"><ToolingIssueReturnTab {...tabProps} /></TabsContent>
          <TabsContent value="usage"><ToolingUsageTab {...tabProps} /></TabsContent>
          <TabsContent value="maintenance"><ToolingMaintenanceTab {...tabProps} /></TabsContent>
          <TabsContent value="documents"><ToolingDocumentsTab {...tabProps} /></TabsContent>
          <TabsContent value="history"><ToolingHistoryTab {...tabProps} /></TabsContent>
        </Tabs>
      </div>

      <QRCodeDisplay open={qrOpen} onClose={() => setQrOpen(false)} equipmentId={tool.id} equipmentName={tool.name} organizationId={tool.organization_id} />
    </Page>
  );
}
