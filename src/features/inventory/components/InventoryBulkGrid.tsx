import { useI18n } from '@/i18n';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { List, type RowComponentProps } from 'react-window';
import { BulkGridSortableHeader } from '@/components/bulk-edit/BulkGridSortableHeader';
import { useBulkGridEditorState } from '@/hooks/useBulkGridEditorState';
import { useBulkGridDisplayValue } from '@/hooks/useBulkGridDisplayValue';
import { BulkPendingApplyDialog } from '@/components/bulk-edit/BulkPendingApplyDialog';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { handleKeyboardActivation } from '@/components/a11y/keyboard';
import type { InventoryItem } from '@/features/inventory/types/inventory';
import { InventoryItemThumbnail } from '@/features/inventory/components/InventoryItemThumbnail';
import ListPaginationFooter from '@/components/common/ListPaginationFooter';
import {
  useInventoryBulkGridView,
  type InventoryBulkGridView,
} from '@/features/inventory/hooks/useInventoryBulkGridView';
import { clampListPage, paginateListItems } from '@/utils/listPagination';
import {
  INVENTORY_DESKTOP_PAGE_SIZE_OPTIONS,
} from '@/features/inventory/utils/inventoryListPagination';

import {
  BulkEditableCell,
  type BulkEditableCellProps,
} from '@/features/equipment/components/BulkEditableCell';
import type {
  BulkEditableField,
  InventoryRowDelta,
} from '@/features/inventory/hooks/useBulkEditInventory';

// ============================================
// Column layout constants
// ============================================

const COL = {
  select: 48,
  thumbnail: 56,
  name: 220,
  sku: 120,
  external_id: 130,
  location: 150,
  quantity_on_hand: 110,
  low_stock_threshold: 110,
  default_unit_cost: 120,
} as const;

const TOTAL_COL_WIDTH = Object.values(COL).reduce((a, b) => a + b, 0);
const ROW_HEIGHT = 44;


type InventoryBulkListRowProps = {
  sortedRows: InventoryItem[];
  selectedRowIds: Set<string>;
  dirtyRows: Map<string, InventoryRowDelta>;
  editableTextCell: (
    row: InventoryItem,
    field: 'name' | 'sku' | 'external_id' | 'location',
    extra?: Partial<BulkEditableCellProps>
  ) => React.ReactElement;
  editableNumericCell: (
    row: InventoryItem,
    field: 'quantity_on_hand' | 'low_stock_threshold' | 'default_unit_cost'
  ) => React.ReactElement;
  handleRowClick: (rowId: string, e: React.MouseEvent<HTMLDivElement>) => void;
  onToggleSelected: (id: string) => void;
};

function InventoryBulkListRow({
  index,
  style,
  ariaAttributes,
  sortedRows,
  selectedRowIds,
  dirtyRows,
  editableTextCell,
  editableNumericCell,
  handleRowClick,
  onToggleSelected,
}: RowComponentProps<InventoryBulkListRowProps>) {
  const { t } = useI18n();
  const row = sortedRows[index];
  if (!row) return null;
  const isSelected = selectedRowIds.has(row.id);
  const isRowDirty = dirtyRows.has(row.id);

  return (
    <div
      {...ariaAttributes}
      role="row"
      style={{ ...style, display: 'flex', width: TOTAL_COL_WIDTH }}
      aria-selected={isSelected}
      tabIndex={0}
      className={cn(
        'border-b transition-colors',
        isSelected && 'bg-muted/30',
        isRowDirty && !isSelected && 'bg-primary/5',
        'cursor-pointer hover:bg-muted/20'
      )}
      onClick={(e) => handleRowClick(row.id, e)}
      onKeyDown={(e) => {
        // Only react to keys pressed while the row itself has focus. Keys from
        // the checkbox, a static cell or an open cell editor bubble up here;
        // handling them would swallow a typed space, toggle the row when Enter
        // commits an edit, and double-toggle on a cell's own Space shortcut.
        if (e.target !== e.currentTarget) return;
        handleKeyboardActivation(e, () => onToggleSelected(row.id));
      }}
    >
      <div
        style={{ width: COL.select, flexShrink: 0 }}
        className="flex items-center justify-center px-2"
        role="gridcell"
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelected(row.id)}
          aria-label={t('inventoryBulk.selectItem', { name: row.name })}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      <div
        style={{ width: COL.thumbnail, flexShrink: 0 }}
        className="flex items-center justify-center px-1"
        role="gridcell"
      >
        <InventoryItemThumbnail item={row} size="sm" />
      </div>
      <div
        style={{ width: COL.name, flexShrink: 0 }}
        className="flex items-center px-1"
        role="gridcell"
      >
        {editableTextCell(row, 'name')}
      </div>
      <div
        style={{ width: COL.sku, flexShrink: 0 }}
        className="flex items-center px-1"
        role="gridcell"
      >
        {editableTextCell(row, 'sku', { mono: true })}
      </div>
      <div
        style={{ width: COL.external_id, flexShrink: 0 }}
        className="flex items-center px-1"
        role="gridcell"
      >
        {editableTextCell(row, 'external_id', { mono: true })}
      </div>
      <div
        style={{ width: COL.location, flexShrink: 0 }}
        className="flex items-center px-1"
        role="gridcell"
      >
        {editableTextCell(row, 'location')}
      </div>
      <div
        style={{ width: COL.quantity_on_hand, flexShrink: 0 }}
        className="flex items-center px-1"
        role="gridcell"
      >
        {editableNumericCell(row, 'quantity_on_hand')}
      </div>
      <div
        style={{ width: COL.low_stock_threshold, flexShrink: 0 }}
        className="flex items-center px-1"
        role="gridcell"
      >
        {editableNumericCell(row, 'low_stock_threshold')}
      </div>
      <div
        style={{ width: COL.default_unit_cost, flexShrink: 0 }}
        className="flex items-center px-1"
        role="gridcell"
      >
        {editableNumericCell(row, 'default_unit_cost')}
      </div>
    </div>
  );
}

// ============================================
// Props
// ============================================

export interface InventoryBulkGridProps {
  /** Sort/paging state owned by the parent; the grid keeps its own if omitted. */
  view?: InventoryBulkGridView;
  rows: InventoryItem[];
  dirtyRows: Map<string, InventoryRowDelta>;
  selectedRowIds: Set<string>;
  onSetCellValue: <K extends BulkEditableField>(
    id: string,
    field: K,
    value: InventoryItem[K]
  ) => void;
  onSetCellValueOnRows: <K extends BulkEditableField>(
    ids: string[],
    field: K,
    value: InventoryItem[K]
  ) => void;
  onToggleSelected: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onClearSelection: () => void;
}

// ============================================
// Main component
// ============================================

export const InventoryBulkGrid: React.FC<InventoryBulkGridProps> = ({
  rows,
  dirtyRows,
  selectedRowIds,
  onSetCellValue,
  onSetCellValueOnRows,
  onToggleSelected,
  onSelectAll,
  onClearSelection,
  view: parentView,
}) => {
  const { t } = useI18n();
  const localView = useInventoryBulkGridView();
  const { page, setPage, pageSize, setPageSize, sorting: viewSorting, setSorting: setViewSorting } =
    parentView ?? localView;
  const fieldLabels = useMemo<Partial<Record<BulkEditableField, string>>>(() => ({
    name: t('inventoryBulk.name'),
    sku: t('inventoryBulk.sku'),
    external_id: t('inventoryBulk.externalId'),
    location: t('inventoryBulk.locationName'),
    quantity_on_hand: t('inventoryBulk.quantity'),
    low_stock_threshold: t('inventoryBulk.lowStock'),
    default_unit_cost: t('inventoryBulk.unitCost'),
  }), [t]);
  const {
    sorting,
    setSorting,
    cancelPendingSelection,
    handleRowClick,
    pendingApply,
    handleCellChange,
    handleApplyAll,
    handleApplyOne,
    clearPendingApply,
  } = useBulkGridEditorState<BulkEditableField, InventoryItem[BulkEditableField]>({
    selectedRowIds,
    fieldLabels,
    onSetCellValue,
    onSetCellValueOnRows,
    onToggleSelected,
    sorting: viewSorting,
    onSortingChange: setViewSorting,
  });

  // Container width measurement for react-window
  const containerRef = useRef<HTMLDivElement>(null);
  const [listWidth, setListWidth] = useState(TOTAL_COL_WIDTH);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? TOTAL_COL_WIDTH;
      setListWidth(Math.max(w, TOTAL_COL_WIDTH));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ── TanStack Table (sort only; selection is managed externally) ────────────

  const columns = useMemo<ColumnDef<InventoryItem>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: ({ column }) => <BulkGridSortableHeader column={column} title={t('inventoryBulk.name')} fullWidth />,
        enableSorting: true,
      },
      {
        id: 'sku',
        accessorKey: 'sku',
        header: ({ column }) => <BulkGridSortableHeader column={column} title={t('inventoryBulk.sku')} fullWidth />,
        enableSorting: true,
      },
      {
        id: 'external_id',
        accessorKey: 'external_id',
        header: ({ column }) => <BulkGridSortableHeader column={column} title={t('inventoryBulk.externalId')} fullWidth />,
        enableSorting: true,
      },
      {
        id: 'location',
        accessorKey: 'location',
        header: ({ column }) => <BulkGridSortableHeader column={column} title={t('inventoryBulk.locationName')} fullWidth />,
        enableSorting: true,
      },
      {
        id: 'quantity_on_hand',
        accessorKey: 'quantity_on_hand',
        header: ({ column }) => <BulkGridSortableHeader column={column} title={t('inventoryBulk.quantity')} align="right" fullWidth />,
        enableSorting: true,
      },
      {
        id: 'low_stock_threshold',
        accessorKey: 'low_stock_threshold',
        header: ({ column }) => <BulkGridSortableHeader column={column} title={t('inventoryBulk.lowStock')} align="right" fullWidth />,
        enableSorting: true,
      },
      {
        id: 'default_unit_cost',
        accessorKey: 'default_unit_cost',
        header: ({ column }) => <BulkGridSortableHeader column={column} title={t('inventoryBulk.unitCostCurrency')} align="right" fullWidth />,
        enableSorting: true,
      },
    ],
    [t]
  );

  // Pages are cut client-side from the full, sorted list (every item is
  // already loaded), matching the inventory list page. Before this the grid
  // put all rows in one fixed 14-row scroll box with no paging controls.
  // Pending edits live in `dirtyRows` keyed by id, so they survive paging;
  // the selection is cleared on page/sort changes so a bulk apply never
  // reaches rows the user can no longer see.
  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: (updater) => {
      cancelPendingSelection();
      setSorting(updater);
      setPage(1);
      onClearSelection();
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.id,
  });

  // TanStack memoizes the row model, so its `rows` array is stable until the
  // data or sorting change. Memoize the mapped list on it so `pageRows`, the
  // row props and the selection-pruning effect do not churn on every render.
  const modelRows = table.getRowModel().rows;
  const sortedRows = useMemo(() => modelRows.map((r) => r.original), [modelRows]);
  const safePage = clampListPage(page, sortedRows.length, pageSize);
  const pageRows = useMemo(
    () => paginateListItems(sortedRows, safePage, pageSize),
    [sortedRows, safePage, pageSize],
  );

  // Keep the stored page in range when the list shrinks (e.g. after a
  // commit refetch), so it doesn't jump back if the list grows again.
  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage, setPage]);

  // Selection must only ever contain rows on the current page. A commit
  // refetch or a background refresh can re-sort or shift rows onto another
  // page while they stay selected; drop those so "apply to selected" can
  // never write to rows the user cannot see.
  useEffect(() => {
    if (selectedRowIds.size === 0) return;
    const pageIds = new Set(pageRows.map((r) => r.id));
    const visibleSelection = [...selectedRowIds].filter((id) => pageIds.has(id));
    if (visibleSelection.length !== selectedRowIds.size) onSelectAll(visibleSelection);
  }, [pageRows, selectedRowIds, onSelectAll]);

  const handlePageChange = (nextPage: number) => {
    // A row click toggles selection after a short debounce; cancel it so a
    // click right before paging can't select a row on the page being left.
    cancelPendingSelection();
    onClearSelection();
    setPage(nextPage);
  };

  const handlePageSizeChange = (nextPageSize: number) => {
    cancelPendingSelection();
    onClearSelection();
    setPageSize(nextPageSize);
    setPage(1);
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  const getDisplayValue = useBulkGridDisplayValue<InventoryItem, BulkEditableField>(dirtyRows);

  // ── Editable cell builder ──────────────────────────────────────────────────

  const editableTextCell = useCallback(
    (
      row: InventoryItem,
      field: 'name' | 'sku' | 'external_id' | 'location',
      extra: Partial<BulkEditableCellProps> = {}
    ) => (
      <BulkEditableCell
        rowId={row.id}
        field={field}
        type="text"
        value={(getDisplayValue(row, field) as string | null) ?? null}
        initialValue={(row[field] as string | null) ?? null}
        onChange={(next) =>
          handleCellChange(row.id, field, next as InventoryItem[typeof field])
        }
        onSelectRow={onToggleSelected}
        onCancelPendingSelect={cancelPendingSelection}
        {...extra}
      />
    ),
    [getDisplayValue, handleCellChange, onToggleSelected, cancelPendingSelection]
  );

  const editableNumericCell = useCallback(
    (
      row: InventoryItem,
      field: 'quantity_on_hand' | 'low_stock_threshold' | 'default_unit_cost'
    ) => (
      <BulkEditableCell
        rowId={row.id}
        field={field}
        type="number"
        align="right"
        mono
        value={(getDisplayValue(row, field) as number | null) ?? null}
        initialValue={(row[field] as number | null) ?? null}
        formatDisplay={(v) =>
          typeof v === 'number' ? v.toLocaleString() : '—'
        }
        onChange={(next) =>
          handleCellChange(row.id, field, (next as number | null) as InventoryItem[typeof field])
        }
        onSelectRow={onToggleSelected}
        onCancelPendingSelect={cancelPendingSelection}
      />
    ),
    [getDisplayValue, handleCellChange, onToggleSelected, cancelPendingSelection]
  );

  // ── All-selected state for header checkbox ─────────────────────────────────

  const allSelected = pageRows.length > 0 && pageRows.every((r) => selectedRowIds.has(r.id));
  const someSelected = pageRows.some((r) => selectedRowIds.has(r.id));
  const headerCheckboxState: boolean | 'indeterminate' = allSelected
    ? true
    : someSelected
    ? 'indeterminate'
    : false;

  const bulkListRowProps: InventoryBulkListRowProps = useMemo(
    () => ({
      sortedRows: pageRows,
      selectedRowIds,
      dirtyRows,
      editableTextCell,
      editableNumericCell,
      handleRowClick,
      onToggleSelected,
    }),
    [
      pageRows,
      selectedRowIds,
      dirtyRows,
      editableTextCell,
      editableNumericCell,
      handleRowClick,
      onToggleSelected,
    ]
  );

  // ── Grid height ────────────────────────────────────────────────────────────

  // The whole page is shown (no inner scroll box); paging limits the height.
  const bodyHeight = Math.max(pageRows.length, 1) * ROW_HEIGHT;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <div
        ref={containerRef}
        className="rounded-md border bg-card overflow-x-auto"
        role="grid"
        aria-label={t('inventoryBulk.gridLabel')}
        aria-rowcount={pageRows.length}
      >
        {/* ── Sticky header ── */}
        <div
          style={{ width: TOTAL_COL_WIDTH, minWidth: TOTAL_COL_WIDTH }}
          className="flex border-b bg-muted/30 sticky top-0 z-10"
          role="rowgroup"
        >
          {/* Checkbox header */}
          <div
            style={{ width: COL.select, flexShrink: 0 }}
            className={cn(
              'flex items-center justify-center h-[38px] px-2',
              'text-xs font-medium text-muted-foreground'
            )}
            role="columnheader"
          >
            <Checkbox
              checked={headerCheckboxState}
              onCheckedChange={(value) => {
                if (value === true) onSelectAll(pageRows.map((r) => r.id));
                else onClearSelection();
              }}
              aria-label={t('inventoryBulk.selectAll')}
            />
          </div>
          <div
            style={{ width: COL.thumbnail, flexShrink: 0 }}
            className="flex items-center justify-center h-[38px] px-1 text-xs font-medium text-muted-foreground"
            role="columnheader"
          >
            {/* Thumbnail column: no visible title (matches the Equipment bulk
                grid), but keep an accessible name for screen readers. */}
            <span className="sr-only">{t('inventoryBulk.image')}</span>
          </div>

          {/* Column headers from TanStack table */}
          {table.getHeaderGroups().map((group) =>
            group.headers
              .filter((h) => h.column.id !== '__select')
              .map((header) => {
                const key = header.column.id as keyof typeof COL;
                const width = COL[key] ?? 120;
                return (
                  <div
                    key={header.id}
                    style={{ width, flexShrink: 0 }}
                    className="flex items-center h-[38px] px-0"
                    role="columnheader"
                    aria-sort={
                      header.column.getIsSorted() === 'asc'
                        ? 'ascending'
                        : header.column.getIsSorted() === 'desc'
                        ? 'descending'
                        : 'none'
                    }
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </div>
                );
              })
          )}
        </div>

        {/* ── Virtualized body ── */}
        {sortedRows.length === 0 ? (
          <div
            style={{ height: ROW_HEIGHT, width: TOTAL_COL_WIDTH }}
            className="flex items-center justify-center text-sm text-muted-foreground"
            role="row"
          >
            {t('inventoryBulk.empty')}
          </div>
        ) : (
          <div role="rowgroup">
            <List
              rowComponent={InventoryBulkListRow}
              rowCount={pageRows.length}
              rowHeight={ROW_HEIGHT}
              rowProps={bulkListRowProps}
              style={{ height: bodyHeight, width: listWidth, overflowX: 'hidden' }}
            />
          </div>
        )}
      </div>

      {sortedRows.length > 0 && (
        <ListPaginationFooter
          testId="inventory-bulk-pagination-footer"
          density="compact"
          totalItems={sortedRows.length}
          page={safePage}
          pageSize={pageSize}
          pageSizeOptions={INVENTORY_DESKTOP_PAGE_SIZE_OPTIONS}
          itemLabel={t('inventoryList.itemLabel')}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      )}

      {/* Bulk-apply confirmation dialog */}
      <BulkPendingApplyDialog
        pendingApply={pendingApply}
        selectedCount={selectedRowIds.size}
        onApplyAll={handleApplyAll}
        onApplyOne={handleApplyOne}
        onCancel={clearPendingApply}
      />
    </>
  );
};
