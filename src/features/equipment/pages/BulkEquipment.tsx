import React, { useCallback, useEffect } from 'react';
import {
  Navigate,
  BulkEditOfflinePanel,
  useBrowserOnline,
  BulkEditBackButton,
  Page,
  PageHeader,
  useOrganization,
  usePermissions,
  useIsMobile,
  BulkCommitToolbar,
} from '@/components/bulk-edit/bulkEditPageImports';
import { useEquipmentFiltering } from '@/features/equipment/hooks/useEquipmentFiltering';
import { useBulkEditEquipment } from '@/features/equipment/hooks/useBulkEditEquipment';
import EquipmentLoadingState from '@/features/equipment/components/EquipmentLoadingState';
import EquipmentPaginationFooter from '@/features/equipment/components/EquipmentPaginationFooter';
import { BulkEquipmentGrid } from '../components/BulkEquipmentGrid';
import { useSelectedTeam } from '@/hooks/useSelectedTeam';
import { UNASSIGNED_TEAM_ID } from '@/contexts/selected-team-context';
import { useI18n } from '@/i18n';
import type { EquipmentRecord } from '@/features/equipment/types/equipment';

const BulkEquipment: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const { canCreateEquipment, canCreateEquipmentForAnyTeam } = usePermissions();
  const isOnline = useBrowserOnline();
  const isMobile = useIsMobile();
  const { selectedTeamId } = useSelectedTeam();
  const { t } = useI18n();

  // 'table' shares the Equipment table view's page, page size, sort and filters,
  // so this grid lists the same rows on the same pages as the view it edits.
  const {
    paginatedEquipment,
    isLoading,
    sortConfig,
    updateSort,
    updateFilter,
    currentPage,
    pageSize,
    pageSizeOptions,
    totalFilteredCount,
    setCurrentPage,
    setPageSize,
  } = useEquipmentFiltering(currentOrganization?.id, 'table');

  // Same TopBar team scope the Equipment list applies on mount.
  useEffect(() => {
    const value =
      selectedTeamId === null
        ? 'all'
        : selectedTeamId === UNASSIGNED_TEAM_ID
          ? 'unassigned'
          : selectedTeamId;
    updateFilter('team', value);
  }, [selectedTeamId, updateFilter]);

  const {
    dirtyRows,
    selectedRowIds,
    dirtyCount,
    selectedCount,
    isPending,
    setCellValue,
    setCellValueOnRows,
    clearDirty,
    toggleSelected,
    selectAll,
    clearSelection,
    commit,
  // paginatedEquipment is EquipmentWithTeam[] from EquipmentService.ts (the
  // paginated list query), a differently-declared type from EquipmentRecord
  // that happens to share the same field names useBulkEditEquipment and
  // BulkEquipmentGrid actually read.
  } = useBulkEditEquipment(paginatedEquipment as unknown as EquipmentRecord[]);

  // Pending edits survive page/sort changes (the commit walks every dirty row),
  // but the selection is cleared so "apply to selected" never reaches rows that
  // are no longer on screen.
  const handlePageChange = useCallback(
    (page: number) => {
      clearSelection();
      setCurrentPage(page);
    },
    [clearSelection, setCurrentPage],
  );
  const handlePageSizeChange = useCallback(
    (size: number) => {
      clearSelection();
      setPageSize(size);
    },
    [clearSelection, setPageSize],
  );
  const handleSortChange = useCallback(
    (field: string, direction: 'asc' | 'desc') => {
      clearSelection();
      updateSort(field, direction);
    },
    [clearSelection, updateSort],
  );

  if (isMobile) {
    return <Navigate to="/dashboard/equipment" replace />;
  }

  if (!currentOrganization) {
    return (
      <Page maxWidth="full" padding="workspace">
        <PageHeader
          title={t('equipmentBulk.title')}
          description={t('equipmentBulk.selectOrganization')}
          actions={<BulkEditBackButton to="/dashboard/equipment" />}
        />
      </Page>
    );
  }

  if (!canCreateEquipment() && !canCreateEquipmentForAnyTeam()) {
    return (
      <Page maxWidth="full" padding="workspace">
        <PageHeader
          title={t('equipmentBulk.title')}
          description={t('equipmentBulk.restricted')}
          actions={<BulkEditBackButton to="/dashboard/equipment" />}
        />
      </Page>
    );
  }

  if (!isOnline) {
    return (
      <Page maxWidth="full" padding="workspace">
        <PageHeader
          title={t('equipmentBulk.title')}
          actions={<BulkEditBackButton to="/dashboard/equipment" />}
        />
        <BulkEditOfflinePanel
          message={t('equipmentBulk.offlineMessage')}
          backHref="/dashboard/equipment"
          backLabel={t('equipmentBulk.backToEquipment')}
        />
      </Page>
    );
  }

  if (isLoading) {
    return (
      <Page maxWidth="full" padding="workspace">
        <EquipmentLoadingState />
      </Page>
    );
  }

  return (
    <Page maxWidth="full" padding="workspace">
      <div className="space-y-4 pb-4">
        <PageHeader
          title={t('equipmentBulk.title')}
          description={t('equipmentBulk.description', { name: currentOrganization.name })}
          hideDescriptionOnMobile
          actions={<BulkEditBackButton to="/dashboard/equipment" />}
        />

        <BulkEquipmentGrid
          rows={paginatedEquipment as unknown as EquipmentRecord[]}
          dirtyRows={dirtyRows}
          selectedRowIds={selectedRowIds}
          onSetCellValue={setCellValue}
          onSetCellValueOnRows={setCellValueOnRows}
          onToggleSelected={toggleSelected}
          onSelectAll={selectAll}
          onClearSelection={clearSelection}
          sortConfig={sortConfig}
          onSortChange={handleSortChange}
        />

        <EquipmentPaginationFooter
          totalItems={totalFilteredCount}
          page={currentPage}
          pageSize={pageSize}
          pageSizeOptions={pageSizeOptions}
          itemLabel={t('equipment.result')}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />

        <BulkCommitToolbar
          dirtyCount={dirtyCount}
          selectedCount={selectedCount}
          isPending={isPending}
          onDiscard={clearDirty}
          onCommit={() => {
            void commit();
          }}
        />
      </div>
    </Page>
  );
};

export default BulkEquipment;
