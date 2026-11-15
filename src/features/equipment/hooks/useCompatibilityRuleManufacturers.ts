import { useOrganization } from '@/contexts/OrganizationContext';
import { useEquipmentManufacturersAndModels } from '@/features/equipment/hooks/useEquipment';
import { useManufacturerModelLookup } from '@/features/equipment/utils/manufacturerModelLookup';

export interface CompatibilityRuleManufacturers {
  /** Current organization id, for the editor's own match-count query. */
  organizationId: string | undefined;
  isLoadingManufacturers: boolean;
  manufacturers: string[];
  getModelsForManufacturer: (manufacturer: string) => string[];
}

/**
 * Manufacturer/model dropdown data of the current organization's equipment,
 * shared by the compatibility rule editors (inventory parts and PM templates).
 */
export function useCompatibilityRuleManufacturers(): CompatibilityRuleManufacturers {
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id;
  const { data: manufacturersData = [], isLoading: isLoadingManufacturers } =
    useEquipmentManufacturersAndModels(organizationId);
  const { manufacturers, getModelsForManufacturer } = useManufacturerModelLookup(manufacturersData);

  return { organizationId, isLoadingManufacturers, manufacturers, getModelsForManufacturer };
}
