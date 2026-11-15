import type {
  EquipmentColumnFilterOptions,
  SortConfig,
} from '@/features/equipment/hooks/useEquipmentFiltering';
import type { EquipmentPMStatus } from '@/features/equipment/hooks/useEquipmentPMStatus';
import type {
  EquipmentColumnFilterKey,
  EquipmentColumnFilters,
} from '@/features/equipment/services/EquipmentService';

/**
 * Props `EquipmentTable` takes besides its rows. `EquipmentGrid` accepts the
 * same props and forwards them to `EquipmentTable` when `viewMode === 'table'`.
 */
export interface EquipmentTableViewProps {
  onShowQRCode: (id: string) => void;
  pmStatuses?: Map<string, EquipmentPMStatus>;
  sortConfig?: SortConfig;
  onSortChange?: (field: string, direction?: 'asc' | 'desc') => void;
  visibleColumns?: Record<string, boolean>;
  onToggleColumn?: (key: string) => void;
  organizationId?: string;
  columnFilterOptions?: EquipmentColumnFilterOptions;
  columnFilters?: EquipmentColumnFilters;
  onColumnFilterChange?: (key: EquipmentColumnFilterKey, values: string[]) => void;
}
