import type { InventoryItem, InventoryQuickFilterKey } from '@/features/inventory/types/inventory';
import {
  buildInventoryTableRowViewModel,
  type InventoryTableRowViewModel,
} from '@/features/inventory/utils/inventoryListViewModel';

export function matchesQuickFilter(
  row: InventoryTableRowViewModel,
  filter: InventoryQuickFilterKey,
  recentlyAdjustedIds: Set<string>,
): boolean {
  const { item } = row;

  switch (filter) {
    case 'low-stock':
      return row.stockTier === 'low';
    case 'out-of-stock':
      return row.stockTier === 'out';
    case 'negative-stock':
      return row.stockTier === 'negative';
    case 'has-alternates':
      return row.alternateGroupCount > 0;
    case 'missing-location':
      return row.missingLocation;
    case 'missing-unit-cost':
      return row.missingUnitCost;
    case 'missing-sku':
      return row.missingSku;
    case 'missing-data':
      return row.missingData;
    case 'recently-adjusted':
      return recentlyAdjustedIds.has(item.id);
    case 'reorder-needed':
      return row.reorderPriority >= 2;
    default:
      return true;
  }
}

export function applyQuickFilters(
  rows: InventoryTableRowViewModel[],
  activeQuickFilters: InventoryQuickFilterKey[],
  recentlyAdjustedIds: Set<string>,
): InventoryTableRowViewModel[] {
  if (activeQuickFilters.length === 0) return rows;
  return rows.filter((row) =>
    activeQuickFilters.every((filter) =>
      matchesQuickFilter(row, filter, recentlyAdjustedIds),
    ),
  );
}

export function countQuickFilterMatches(
  items: InventoryItem[],
  groupMembershipCounts: Record<string, number>,
  filter: InventoryQuickFilterKey,
  recentlyAdjustedIds: Set<string>,
): number {
  return items.filter((item) => {
    const row = buildInventoryTableRowViewModel(item, groupMembershipCounts);
    return matchesQuickFilter(row, filter, recentlyAdjustedIds);
  }).length;
}
