import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useEquipmentManufacturersAndModels } from '@/features/equipment/hooks/useEquipment';
import { useCompatibilityRuleManufacturers } from './useCompatibilityRuleManufacturers';

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: vi.fn(),
}));

vi.mock('@/features/equipment/hooks/useEquipment', () => ({
  useEquipmentManufacturersAndModels: vi.fn(),
}));

type OrganizationValue = ReturnType<typeof useOrganization>;
type ManufacturersQuery = ReturnType<typeof useEquipmentManufacturersAndModels>;

const mockOrganization = (id: string | null) =>
  vi.mocked(useOrganization).mockReturnValue({
    currentOrganization: id ? { id, name: 'Test Org' } : null,
  } as unknown as OrganizationValue);

const mockManufacturersQuery = (query: { data?: { manufacturer: string; models: string[] }[]; isLoading: boolean }) =>
  vi.mocked(useEquipmentManufacturersAndModels).mockReturnValue(query as unknown as ManufacturersQuery);

describe('useCompatibilityRuleManufacturers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries the current organization and exposes its manufacturers and models', () => {
    mockOrganization('org-1');
    mockManufacturersQuery({
      data: [
        { manufacturer: 'Caterpillar', models: ['D6T', 'D8T'] },
        { manufacturer: 'Toyota', models: ['8FGU25'] },
      ],
      isLoading: false,
    });

    const { result } = renderHook(() => useCompatibilityRuleManufacturers());

    expect(useEquipmentManufacturersAndModels).toHaveBeenCalledWith('org-1');
    expect(result.current.organizationId).toBe('org-1');
    expect(result.current.isLoadingManufacturers).toBe(false);
    expect(result.current.manufacturers).toEqual(['Caterpillar', 'Toyota']);
    expect(result.current.getModelsForManufacturer('caterpillar')).toEqual(['D6T', 'D8T']);
    expect(result.current.getModelsForManufacturer('Unknown')).toEqual([]);
  });

  it('reports loading and an empty list while the manufacturers are not loaded', () => {
    mockOrganization('org-1');
    mockManufacturersQuery({ data: undefined, isLoading: true });

    const { result } = renderHook(() => useCompatibilityRuleManufacturers());

    expect(result.current.isLoadingManufacturers).toBe(true);
    expect(result.current.manufacturers).toEqual([]);
    expect(result.current.getModelsForManufacturer('Caterpillar')).toEqual([]);
  });

  it('passes an undefined organization id when no organization is selected', () => {
    mockOrganization(null);
    mockManufacturersQuery({ data: [], isLoading: false });

    const { result } = renderHook(() => useCompatibilityRuleManufacturers());

    expect(useEquipmentManufacturersAndModels).toHaveBeenCalledWith(undefined);
    expect(result.current.organizationId).toBeUndefined();
  });
});
