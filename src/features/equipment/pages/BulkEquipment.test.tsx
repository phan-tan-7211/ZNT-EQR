import React from 'react';
import { render, screen, fireEvent } from '@vitest-harness/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const filtering = vi.hoisted(() => ({
  setCurrentPage: vi.fn(),
  setPageSize: vi.fn(),
  updateSort: vi.fn(),
  updateFilter: vi.fn(),
}));
const bulkState = vi.hoisted(() => ({ clearSelection: vi.fn() }));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(() => ({
    canCreateEquipment: () => true,
    canCreateEquipmentForAnyTeam: () => true,
  })),
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: vi.fn(() => ({
    currentOrganization: { id: 'org-1', name: 'Test Org' },
  })),
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn(() => false),
}));

vi.mock('@/hooks/useBrowserOnline', () => ({
  useBrowserOnline: vi.fn(() => true),
}));

vi.mock('@/hooks/useSelectedTeam', () => ({
  useSelectedTeam: vi.fn(() => ({ selectedTeamId: null })),
}));

vi.mock('@/features/equipment/hooks/useEquipmentFiltering', () => ({
  useEquipmentFiltering: vi.fn(() => ({
    paginatedEquipment: [{ id: 'eq-1' }, { id: 'eq-2' }],
    isLoading: false,
    sortConfig: { field: 'name', direction: 'asc' },
    updateSort: filtering.updateSort,
    updateFilter: filtering.updateFilter,
    currentPage: 1,
    pageSize: 25,
    pageSizeOptions: [25, 50, 100, 200],
    totalFilteredCount: 179,
    setCurrentPage: filtering.setCurrentPage,
    setPageSize: filtering.setPageSize,
  })),
}));

vi.mock('@/features/equipment/hooks/useBulkEditEquipment', () => ({
  useBulkEditEquipment: vi.fn(() => ({
    dirtyRows: new Map(),
    selectedRowIds: new Set(),
    dirtyCount: 0,
    selectedCount: 0,
    isPending: false,
    setCellValue: vi.fn(),
    setCellValueOnRows: vi.fn(),
    clearDirty: vi.fn(),
    toggleSelected: vi.fn(),
    selectAll: vi.fn(),
    clearSelection: bulkState.clearSelection,
    commit: vi.fn(),
  })),
}));

vi.mock('../components/BulkEquipmentGrid', () => ({
  BulkEquipmentGrid: ({
    rows,
    onSortChange,
  }: {
    rows: unknown[];
    onSortChange?: (field: string, direction: 'asc' | 'desc') => void;
  }) => (
    <button type="button" data-testid="bulk-grid" onClick={() => onSortChange?.('manufacturer', 'desc')}>
      {rows.length} rows
    </button>
  ),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => <div data-testid="navigate" data-to={to} />,
  };
});

import { useEquipmentFiltering } from '@/features/equipment/hooks/useEquipmentFiltering';
import BulkEquipment from './BulkEquipment';

describe('BulkEquipment page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the table view pagination so it lists the same pages as the Equipment table', () => {
    render(<BulkEquipment />);

    expect(vi.mocked(useEquipmentFiltering)).toHaveBeenCalledWith('org-1', 'table');
    expect(screen.getByTestId('bulk-grid')).toHaveTextContent('2 rows');
  });

  it('renders the pagination footer with the full filtered count, not just the first page', () => {
    render(<BulkEquipment />);

    const footer = screen.getByTestId('equipment-list-pagination-footer');
    expect(footer).toHaveTextContent('179');
  });

  it('keeps the same TopBar team scope as the Equipment list', () => {
    render(<BulkEquipment />);

    expect(filtering.updateFilter).toHaveBeenCalledWith('team', 'all');
  });

  it('changes page and clears the selection so "apply to selected" cannot reach hidden rows', () => {
    render(<BulkEquipment />);

    fireEvent.click(screen.getByRole('button', { name: /next page/i }));

    expect(bulkState.clearSelection).toHaveBeenCalledTimes(1);
    expect(filtering.setCurrentPage).toHaveBeenCalledWith(2);
  });

  it('sorts through the shared list query and clears the selection', () => {
    render(<BulkEquipment />);

    fireEvent.click(screen.getByTestId('bulk-grid'));

    expect(bulkState.clearSelection).toHaveBeenCalledTimes(1);
    expect(filtering.updateSort).toHaveBeenCalledWith('manufacturer', 'desc');
  });

  it('redirects mobile users back to the equipment list', async () => {
    const { useIsMobile } = await import('@/hooks/use-mobile');
    vi.mocked(useIsMobile).mockReturnValueOnce(true);

    render(<BulkEquipment />);

    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/dashboard/equipment');
  });
});
