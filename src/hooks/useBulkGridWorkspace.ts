import { useState, type Dispatch, type SetStateAction } from 'react';
import type { SortingState } from '@tanstack/react-table';
import { useBulkGridClickToSelect } from '@/hooks/useBulkGridClickToSelect';
import { useBulkGridPendingApply } from '@/hooks/useBulkGridPendingApply';

type BulkGridWorkspaceOptions<TField extends string> = {
  selectedRowIds: Set<string>;
  fieldLabels: Partial<Record<TField, string>>;
  onSetCellValue: (rowId: string, field: TField, value: unknown) => void;
  onSetCellValueOnRows?: (rowIds: string[], field: TField, value: unknown) => void;
  onToggleSelected: (rowId: string) => void;
  defaultSort?: SortingState;
  /**
   * Controlled sort state. Pass both to keep the sort outside the grid (e.g.
   * in the page) so it survives the grid unmounting; omit for local state.
   */
  sorting?: SortingState;
  onSortingChange?: Dispatch<SetStateAction<SortingState>>;
};

export function useBulkGridWorkspace<TField extends string>({
  selectedRowIds,
  fieldLabels,
  onSetCellValue,
  onSetCellValueOnRows,
  onToggleSelected,
  defaultSort = [{ id: 'name', desc: false }],
  sorting: controlledSorting,
  onSortingChange,
}: BulkGridWorkspaceOptions<TField>) {
  const [localSorting, setLocalSorting] = useState<SortingState>(defaultSort);
  const controlled = controlledSorting !== undefined && onSortingChange !== undefined;
  const sorting = controlled ? controlledSorting : localSorting;
  const setSorting = controlled ? onSortingChange : setLocalSorting;
  const { cancelPendingSelection, handleRowClick } = useBulkGridClickToSelect(onToggleSelected);

  const pendingApply = useBulkGridPendingApply<TField>({
    selectedRowIds,
    fieldLabels,
    onSetCellValue,
    onSetCellValueOnRows:
      onSetCellValueOnRows ??
      ((rowIds, field, value) => {
        rowIds.forEach((rowId) => onSetCellValue(rowId, field, value));
      }),
  });

  return {
    sorting,
    setSorting,
    cancelPendingSelection,
    handleRowClick,
    ...pendingApply,
  };
}
