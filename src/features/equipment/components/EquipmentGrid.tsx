import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import EquipmentCard from './EquipmentCard';
import EquipmentEmptyState from './EquipmentEmptyState';
import EquipmentTable from './EquipmentTable';
import type { EquipmentViewMode } from './EquipmentCard';
import type { EquipmentTableViewProps } from '@/features/equipment/components/equipmentTableViewTypes';
import { supabase } from '@/integrations/supabase/client';

interface Equipment {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  status: string;
  location: string;
  last_maintenance?: string;
  image_url?: string;
  team_name?: string;
  management_code?: string | null;
  custom_attributes?: Record<string, unknown> | null;
  management_responsible_primary?: string | null;
  management_responsible_secondary?: string | null;
}

interface EquipmentManagementCodeRow {
  id: string;
  management_code: string | null;
  management_responsible_primary?: string | null;
  management_responsible_secondary?: string | null;
}

interface EquipmentGridProps extends EquipmentTableViewProps {
  equipment: Equipment[];
  searchQuery: string;
  statusFilter: string;
  organizationName: string;
  canCreate: boolean;
  onAddEquipment: () => void;
  onClearFilters?: () => void;
  viewMode?: EquipmentViewMode;
}

const EquipmentGrid: React.FC<EquipmentGridProps> = ({
  equipment,
  searchQuery,
  statusFilter,
  organizationName,
  canCreate,
  onShowQRCode,
  onAddEquipment,
  onClearFilters,
  viewMode = 'grid',
  pmStatuses,
  sortConfig,
  onSortChange,
  visibleColumns,
  onToggleColumn,
  organizationId,
  columnFilterOptions,
  columnFilters,
  onColumnFilterChange,
}) => {
  const equipmentIds = useMemo(() => equipment.map((item) => item.id).sort(), [equipment]);
  const { data: managementCodes = [] } = useQuery({
    queryKey: ['equipment-management-codes', equipmentIds, viewMode],
    enabled: equipmentIds.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment')
        .select<string, EquipmentManagementCodeRow>(viewMode === 'table' ? 'id, management_code, management_responsible_primary, management_responsible_secondary' : 'id, management_code')
        .in('id', equipmentIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const equipmentWithCodes = useMemo(() => {
    const codeById = new Map(managementCodes.map((row) => [row.id, row.management_code]));
    const primaryById = new Map(managementCodes.map((row) => [row.id, row.management_responsible_primary ?? null]));
    const secondaryById = new Map(managementCodes.map((row) => [row.id, row.management_responsible_secondary ?? null]));
    return equipment.map((item) => ({
      ...item,
      management_code: item.management_code ?? codeById.get(item.id) ?? null,
      management_responsible_primary: item.management_responsible_primary ?? primaryById.get(item.id) ?? null,
      management_responsible_secondary: item.management_responsible_secondary ?? secondaryById.get(item.id) ?? null,
    }));
  }, [equipment, managementCodes]);

  if (equipment.length === 0) {
    return (
      <EquipmentEmptyState
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        organizationName={organizationName}
        canCreate={canCreate}
        onAddEquipment={onAddEquipment}
        onClearFilters={onClearFilters}
      />
    );
  }

  if (viewMode === 'table') {
    return (
      <EquipmentTable
        equipment={equipmentWithCodes}
        onShowQRCode={onShowQRCode}
        pmStatuses={pmStatuses}
        sortConfig={sortConfig}
        onSortChange={onSortChange}
        visibleColumns={visibleColumns}
        onToggleColumn={onToggleColumn}
        organizationId={organizationId}
        columnFilterOptions={columnFilterOptions}
        columnFilters={columnFilters}
        onColumnFilterChange={onColumnFilterChange}
      />
    );
  }

  return (
    <div className="flex min-w-0 w-full flex-col gap-2 md:grid md:grid-cols-2 md:gap-3 lg:grid-cols-3 lg:gap-4">
      {equipmentWithCodes.map((item, index) => (
        <div key={item.id} className="min-w-0 md:cv-auto-lg md:h-full">
          <EquipmentCard
            equipment={item}
            onShowQRCode={onShowQRCode}
            viewMode="grid"
            pmStatus={pmStatuses?.get(item.id)}
            listIndex={index}
          />
        </div>
      ))}
    </div>
  );
};

export default EquipmentGrid;
