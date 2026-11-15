/**
 * Audit Log Page
 *
 * Dedicated, organization-scoped audit surface buried under Organization
 * settings (issue #1122). Owner/admin only — audit data is sensitive
 * high-privilege information and is never mixed with operational pages or
 * general data exports. Uses the Logflare-style explorer (issue #641):
 * timeline histogram on top, dense severity-tagged list below, persistent
 * detail panel on the right, with a dedicated CSV / JSON export path.
 */

import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { History, Shield } from 'lucide-react';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useOrganization } from '@/contexts/OrganizationContext';
import { AuditExplorer } from '@/components/audit/explorer';
import { AdminOnlyPageAlert, NoOrganizationPageAlert } from '@/features/organization/components/OrganizationPageAlerts';
import { OrganizationSubnav } from '@/features/organization/components/OrganizationSubnav';
import { AUDIT_ENTITY_TYPES, type AuditEntityType, type AuditLogFilters } from '@/types/audit';
import { useI18n } from '@/i18n/I18nProvider';

/**
 * Audit Log Page Component
 */
function AuditLog() {
  const { t } = useI18n();
  const { currentOrganization } = useOrganization();
  const [searchParams] = useSearchParams();

  // Deep links from detail pages, e.g. ?entityType=work_order&entityId=<uuid>.
  const initialFilters = useMemo<Omit<AuditLogFilters, 'dateFrom' | 'dateTo'>>(() => {
    const entityTypeParam = searchParams.get('entityType');
    const entityId = searchParams.get('entityId') ?? undefined;
    const entityType = (Object.values(AUDIT_ENTITY_TYPES) as string[]).includes(
      entityTypeParam ?? '',
    )
      ? (entityTypeParam as AuditEntityType)
      : undefined;
    return { entityType, entityId };
  }, [searchParams]);

  if (!currentOrganization) {
    return (
      <NoOrganizationPageAlert
        title={t('auditLogControls.noOrganization')}
        description={t('auditLogControls.chooseOrganization')}
      />
    );
  }

  const isAdmin =
    currentOrganization.userRole === 'owner' || currentOrganization.userRole === 'admin';

  if (!isAdmin) {
    return (
      <AdminOnlyPageAlert
        title={t('auditLogControls.accessDenied')}
        description={t('auditLogControls.adminOnly')}
      />
    );
  }

  return (
    <Page maxWidth="full" padding="workspace">
      <OrganizationSubnav />
      <div className="space-y-5">
        <PageHeader
          title={t('auditLogControls.title')}
          icon={<History className="h-5 w-5" />}
          description={
            <>
              {t('auditLogControls.introduction')}{' '}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="inline-flex items-center gap-0.5 text-muted-foreground hover:text-foreground underline decoration-dotted underline-offset-2 text-sm">
                    <Shield className="h-3 w-3" />
                    {t('auditLogControls.regulatory')}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                  {t('auditLogControls.regulatoryHelp')}
                </TooltipContent>
              </Tooltip>
            </>
          }
        />

        {/* Customizable dashboard: key metrics, timeline, and events (#1166) */}
        <AuditExplorer organizationId={currentOrganization.id} initialFilters={initialFilters} />
      </div>
    </Page>
  );
}

export default AuditLog;
