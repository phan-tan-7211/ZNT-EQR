import { useI18n } from '@/i18n';
import React from 'react';
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
import { useInventoryItems } from '@/features/inventory/hooks/useInventory';
import { useIsPartsManager } from '@/features/inventory/hooks/usePartsManagers';
import { useBulkEditInventory } from '@/features/inventory/hooks/useBulkEditInventory';
import { InventoryBulkGrid } from '@/features/inventory/components/InventoryBulkGrid';
import { useInventoryBulkGridView } from '@/features/inventory/hooks/useInventoryBulkGridView';

const BulkInventory: React.FC = () => {
  const { t } = useI18n();
  const { currentOrganization } = useOrganization();
  const { data: isPartsManager = false } = useIsPartsManager(currentOrganization?.id);
  const { canManageInventory } = usePermissions();
  const canBulkEdit = canManageInventory(isPartsManager);
  const isOnline = useBrowserOnline();
  const isMobile = useIsMobile();

  const { data: inventoryItems = [], isLoading } = useInventoryItems(
    currentOrganization?.id,
    {},
    { staleTime: 0 }
  );

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
  } = useBulkEditInventory(inventoryItems, { canCommit: canBulkEdit });

  // Held here so the offline panel (which unmounts only the grid) doesn't
  // reset the page, page size and sort.
  const gridView = useInventoryBulkGridView();

  // Desktop-only surface — redirect mobile to the standard inventory list.
  // Placed after hook calls to keep React's hook ordering stable.
  if (isMobile) {
    return <Navigate to="/dashboard/inventory" replace />;
  }

  if (!currentOrganization) {
    return (
      <Page maxWidth="full" padding="workspace">
        <PageHeader
          title={t('inventoryBulk.title')}
          description={t('inventoryBulk.selectOrganization')}
          actions={<BulkEditBackButton to="/dashboard/inventory" />}
        />
      </Page>
    );
  }

  if (!canBulkEdit) {
    return (
      <Page maxWidth="full" padding="workspace">
        <PageHeader
          title={t('inventoryBulk.title')}
          description={t('inventoryBulk.restricted')}
          actions={<BulkEditBackButton to="/dashboard/inventory" />}
        />
      </Page>
    );
  }

  if (!isOnline) {
    return (
      <Page maxWidth="full" padding="workspace">
        <PageHeader title={t('inventoryBulk.title')} actions={<BulkEditBackButton to="/dashboard/inventory" />} />
        <BulkEditOfflinePanel
          message={t('inventoryBulk.offline')}
          backHref="/dashboard/inventory"
          backLabel={t('inventoryBulk.back')}
        />
      </Page>
    );
  }

  if (isLoading) {
    return (
      <Page maxWidth="full" padding="workspace">
        <PageHeader title={t('inventoryBulk.title')} actions={<BulkEditBackButton to="/dashboard/inventory" />} />
        <div className="space-y-2 animate-pulse">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-11 rounded-md bg-muted" />
          ))}
        </div>
      </Page>
    );
  }

  return (
    <Page maxWidth="full" padding="workspace">
      <div className="space-y-4 pb-4">
        <PageHeader
          title={t('inventoryBulk.title')}
          description={t('inventoryBulk.description', { organization: currentOrganization.name })}
          hideDescriptionOnMobile
          actions={<BulkEditBackButton to="/dashboard/inventory" />}
        />

        <InventoryBulkGrid
          rows={inventoryItems}
          dirtyRows={dirtyRows}
          selectedRowIds={selectedRowIds}
          onSetCellValue={setCellValue}
          onSetCellValueOnRows={setCellValueOnRows}
          onToggleSelected={toggleSelected}
          onSelectAll={selectAll}
          onClearSelection={clearSelection}
          view={gridView}
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

export default BulkInventory;
