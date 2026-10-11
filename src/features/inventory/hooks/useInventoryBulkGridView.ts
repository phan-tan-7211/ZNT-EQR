import { useState, type Dispatch, type SetStateAction } from 'react';
import type { SortingState } from '@tanstack/react-table';
import { DEFAULT_INVENTORY_DESKTOP_PAGE_SIZE } from '@/features/inventory/utils/inventoryListPagination';

export type InventoryBulkGridView = {
  sorting: SortingState;
  setSorting: Dispatch<SetStateAction<SortingState>>;
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  pageSize: number;
  setPageSize: Dispatch<SetStateAction<number>>;
};

/**
 * Sort and paging state for the inventory bulk grid. The page holds it (not
 * the grid) so going offline and back, which unmounts only the grid, returns
 * the user to the same page, page size and sort.
 */
export function useInventoryBulkGridView(): InventoryBulkGridView {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_INVENTORY_DESKTOP_PAGE_SIZE);
  return { sorting, setSorting, page, setPage, pageSize, setPageSize };
}
