import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronDown, Plus } from 'lucide-react';
import type { EquipmentViewMode } from '@/features/equipment/components/EquipmentCard';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useEquipmentFiltering } from '@/features/equipment/hooks/useEquipmentFiltering';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSelectedTeam } from '@/hooks/useSelectedTeam';
import { UNASSIGNED_TEAM_ID } from '@/contexts/selected-team-context';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { EquipmentRecord } from '@/features/equipment/types/equipment';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import { useI18n } from '@/i18n';

import EquipmentForm from '@/features/equipment/components/EquipmentForm';
import QRCodeDisplay from '@/features/equipment/components/QRCodeDisplay';
import { EquipmentFilters } from '@/features/equipment/components/EquipmentFilters';
import EquipmentGrid from '@/features/equipment/components/EquipmentGrid';
import EquipmentLoadingState from '@/features/equipment/components/EquipmentLoadingState';
const ImportCsvWizard = lazy(() => import('@/features/equipment/components/ImportCsvWizard'));
import EquipmentColumnPicker from '@/features/equipment/components/EquipmentColumnPicker';
import EquipmentPaginationFooter from '@/features/equipment/components/EquipmentPaginationFooter';
import { EQUIPMENT_TABLE_COLUMN_META } from '@/features/equipment/components/equipmentTableColumns';
import { useEquipmentTableColumns } from '@/features/equipment/hooks/useEquipmentTableColumns';
import { useOfflineMergedEquipment } from '@/features/equipment/hooks/useOfflineMergedEquipment';
import { useOrgEquipmentPMStatuses } from '@/features/equipment/hooks/useEquipmentPMStatus';
import { EquipmentListTransitionRoot } from '@/features/equipment/transitions/EquipmentListTransitionRoot';
import { useWhenPreferenceStorageAllowed } from '@/contexts/CookieConsentContext';
import { getPreferenceLocalStorage, setPreferenceLocalStorage } from '@/lib/cookieConsent';

function readEquipmentViewMode(isMobile: boolean): EquipmentViewMode {
  const stored = getPreferenceLocalStorage('znteqr:equipment-view-mode');
  let initial: EquipmentViewMode;
  switch (stored) {
    case 'table': initial = 'table'; break;
    case 'list': initial = 'grid'; break;
    default: initial = 'grid';
  }
  return initial === 'table' && isMobile ? 'grid' : initial;
}

const Equipment = () => {
  const { t } = useI18n();
  const { currentOrganization } = useOrganization();
  const { canCreateEquipment, canCreateEquipmentForAnyTeam, hasRole } = usePermissions();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initializedFromUrl = useRef(false);
  const { selectedTeamId, setSelectedTeamId } = useSelectedTeam();

  const [showForm, setShowForm] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<EquipmentRecord | null>(null);
  const [showQRCode, setShowQRCode] = useState<string | null>(null);
  const [showImportCsv, setShowImportCsv] = useState(false);
  const [viewMode, setViewMode] = useState<EquipmentViewMode>(() => readEquipmentViewMode(isMobile));
  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;

  const rehydrateOrFlushViewMode = useCallback(() => {
    const stored = getPreferenceLocalStorage('znteqr:equipment-view-mode');
    if (stored) { setViewMode(readEquipmentViewMode(isMobile)); return; }
    setPreferenceLocalStorage('znteqr:equipment-view-mode', viewModeRef.current);
  }, [isMobile]);
  useWhenPreferenceStorageAllowed(rehydrateOrFlushViewMode);

  const { filters, sortConfig, paginatedEquipment, filterOptions, columnFilterOptions, columnFilters, isLoading, hasActiveFilters, activeQuickFilter, equipment, currentPage, pageSize, pageSizeOptions, totalFilteredCount, updateFilter, updateColumnFilter, updateSort, clearFilters, applyQuickFilter, setCurrentPage, setPageSize } = useEquipmentFiltering(currentOrganization?.id, viewMode);
  const mergedEquipment = useOfflineMergedEquipment(paginatedEquipment);
  const { visibleColumns, toggleColumn, resetToDefaults: resetColumnVisibility, hasOverrides: hasColumnOverrides } = useEquipmentTableColumns(currentOrganization?.id);
  const { data: pmStatusList } = useOrgEquipmentPMStatuses(currentOrganization?.id);
  const pmStatuses = React.useMemo(() => {
    if (!pmStatusList) return undefined;
    const map = new Map<string, (typeof pmStatusList)[number]>();
    for (const s of pmStatusList) map.set(s.equipment_id, s);
    return map;
  }, [pmStatusList]);

  useEffect(() => { if (isMobile && viewMode === 'table') setViewMode('grid'); }, [isMobile, viewMode]);
  const handleViewModeChange = useCallback((mode: EquipmentViewMode) => { setViewMode(mode); setPreferenceLocalStorage('znteqr:equipment-view-mode', mode); }, []);

  useEffect(() => {
    if (initializedFromUrl.current) return;
    let didApply = false;
    const team = searchParams.get('team');
    const status = searchParams.get('status');
    if (team) { setSelectedTeamId(team === 'all' ? null : team); didApply = true; }
    if (status) {
      const normalizedStatus = status === 'out_of_service' ? 'out_of_service' : ['active', 'maintenance', 'inactive'].includes(status) ? status : null;
      if (normalizedStatus) { updateFilter('status', normalizedStatus); didApply = true; }
    }
    if (searchParams.get('create') === 'true') { setShowForm(true); didApply = true; }
    if (didApply) initializedFromUrl.current = true;
  }, [searchParams, updateFilter, setSelectedTeamId]);

  useEffect(() => {
    const value = selectedTeamId === null ? 'all' : selectedTeamId === UNASSIGNED_TEAM_ID ? 'unassigned' : selectedTeamId;
    updateFilter('team', value);
  }, [selectedTeamId, updateFilter]);

  const canCreate = canCreateEquipment() || canCreateEquipmentForAnyTeam();
  const canImport = hasRole(['owner', 'admin']);
  const canExport = hasRole(['owner', 'admin', 'member']);

  if (!currentOrganization) return <Page maxWidth="full" padding="workspace"><PageHeader title={t('equipment.title')} description={t('equipment.selectOrganization')} /></Page>;
  if (isLoading) return <Page maxWidth="full" padding="workspace"><EquipmentLoadingState /></Page>;

  const handleAddEquipment = () => { setEditingEquipment(null); setShowForm(true); };
  const handleCloseForm = () => { setShowForm(false); setEditingEquipment(null); };
  const handleEquipmentCreated = (equipmentId: string) => { setSelectedTeamId(null); navigate(`/dashboard/equipment/${equipmentId}`); };

  return (
    <Page maxWidth="full" padding="workspace">
      <EquipmentListTransitionRoot className={cn('flex min-h-0 flex-1 flex-col gap-px overflow-hidden', isMobile && canCreate && 'pb-28')}>
        <div data-equipment-list-chrome="" className="shrink-0">
          <PageHeader
            title={t('equipment.title')}
            description={t('equipment.manageFor', { name: currentOrganization.name })}
            hideDescriptionOnMobile
            density="compact"
            actions={canCreate && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button className="hidden sm:inline-flex"><Plus className="h-4 w-4 mr-2" />{t('equipment.addEquipment')}<ChevronDown className="ml-1 h-4 w-4" aria-hidden /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={handleAddEquipment}>{t('equipment.addSingleEquipment')}</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => navigate('/dashboard/equipment/bulk')}>{t('equipment.bulkEditGrid')}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          />
        </div>

        <div data-equipment-list-chrome="" className="shrink-0">
          {/* KNOWN GAP (pre-existing, not introduced here): `equipment` is now the
              lightweight EquipmentSummary[] projection (see useEquipmentFiltering's
              doc comment), which lacks team_name/warranty_expiration/
              installation_date/management_responsible_primary/secondary that
              EquipmentDownloadMenu's CSV export reads — those columns will be
              blank in the exported file until this is wired to a fuller query. */}
          <EquipmentFilters filters={filters} sortConfig={sortConfig} onFilterChange={updateFilter} onClearFilters={clearFilters} onQuickFilter={applyQuickFilter} onSortChange={updateSort} filterOptions={filterOptions} hasActiveFilters={hasActiveFilters} activeQuickFilter={activeQuickFilter} viewMode={viewMode} onViewModeChange={handleViewModeChange} canImport={canImport} canExport={canExport} onImportCsv={() => setShowImportCsv(true)} equipment={equipment as unknown as EquipmentRecord[]} columnPicker={viewMode === 'table' ? <EquipmentColumnPicker allColumns={EQUIPMENT_TABLE_COLUMN_META} visibleColumns={visibleColumns} onToggle={toggleColumn} onReset={resetColumnVisibility} hasOverrides={hasColumnOverrides} /> : undefined} />
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-px">
          <div className={cn('min-h-0 flex-1', viewMode === 'table' ? 'flex flex-col' : 'overflow-auto overscroll-contain')}>
            {/* EquipmentGrid's local `Equipment` type is a narrow display-only
                subset independently declared from MergedEquipment; the fields
                it reads are all present on the real data. */}
            <EquipmentGrid equipment={mergedEquipment as unknown as React.ComponentProps<typeof EquipmentGrid>['equipment']} searchQuery={filters.search} statusFilter={filters.status} organizationName={currentOrganization.name} canCreate={canCreate} onShowQRCode={setShowQRCode} onAddEquipment={handleAddEquipment} onClearFilters={clearFilters} viewMode={viewMode} pmStatuses={pmStatuses} sortConfig={sortConfig} onSortChange={updateSort} visibleColumns={visibleColumns} onToggleColumn={toggleColumn} organizationId={currentOrganization.id} columnFilterOptions={columnFilterOptions} columnFilters={columnFilters} onColumnFilterChange={updateColumnFilter} />
          </div>
          <div data-equipment-list-chrome="" className="shrink-0"><EquipmentPaginationFooter totalItems={totalFilteredCount} page={currentPage} pageSize={pageSize} pageSizeOptions={pageSizeOptions} itemLabel={t('equipment.result')} onPageChange={setCurrentPage} onPageSizeChange={setPageSize} /></div>
        </div>

        <EquipmentForm open={showForm} onClose={handleCloseForm} equipment={editingEquipment ?? undefined} onCreated={editingEquipment ? undefined : handleEquipmentCreated} />
        <QRCodeDisplay equipmentId={showQRCode || ''} open={!!showQRCode} onClose={() => setShowQRCode(null)} equipmentName={equipment.find(eq => eq.id === showQRCode)?.name} organizationId={currentOrganization?.id} />
        {showImportCsv && <Suspense fallback={null}><ImportCsvWizard open={showImportCsv} onClose={() => setShowImportCsv(false)} organizationId={currentOrganization.id} organizationName={currentOrganization.name} /></Suspense>}
        {isMobile && canCreate && <Button type="button" size="icon" data-equipment-list-chrome="" onClick={handleAddEquipment} aria-label={t('equipment.addEquipmentAria')} className={cn('fixed bottom-[78px] right-4 z-fixed h-14 w-14 rounded-full shadow-elevation-3','touch-manipulation transition-transform duration-100 active:scale-[0.97]','motion-reduce:active:scale-100','focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2')}><Plus className="h-6 w-6" aria-hidden /></Button>}
      </EquipmentListTransitionRoot>
    </Page>
  );
};

export default Equipment;
