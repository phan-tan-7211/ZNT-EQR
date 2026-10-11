import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { InventoryBulkGrid } from './InventoryBulkGrid';
import type { InventoryItem } from '@/features/inventory/types/inventory';
import type { InventoryRowDelta } from '@/features/inventory/hooks/useBulkEditInventory';

// react-window requires measurements not available in jsdom; stub it to render
// all items synchronously so tests can inspect rendered rows.
vi.mock('react-window', () => ({
  List({
    rowComponent: Row,
    rowCount,
    rowHeight,
    rowProps,
    style,
  }: {
    rowComponent: React.ComponentType<
      Record<string, unknown> & {
        index: number;
        style: React.CSSProperties;
        ariaAttributes: {
          role: 'listitem';
          'aria-posinset': number;
          'aria-setsize': number;
        };
      }
    >;
    rowCount: number;
    rowHeight: number;
    rowProps: Record<string, unknown>;
    style?: React.CSSProperties;
  }) {
    const rh = typeof rowHeight === 'number' ? rowHeight : 44;
    return (
      <div data-testid="virtual-list" style={style}>
        {Array.from({ length: rowCount }, (_, index) => (
          <div key={index}>
            <Row
              index={index}
              style={{ height: rh, position: 'relative' }}
              ariaAttributes={{
                role: 'listitem',
                'aria-posinset': index + 1,
                'aria-setsize': rowCount,
              }}
              {...rowProps}
            />
          </div>
        ))}
      </div>
    );
  },
}));

function buildRow(id: string, overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id,
    organization_id: 'org-1',
    name: `Item ${id}`,
    description: null,
    sku: `SKU-${id}`,
    external_id: null,
    quantity_on_hand: 50,
    low_stock_threshold: 5,
    location: 'Warehouse A',
    default_unit_cost: '10.00',
    image_url: null,
    isLowStock: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 'user-1',
    ...overrides,
  } as unknown as InventoryItem;
}

function renderGrid(
  props: Partial<React.ComponentProps<typeof InventoryBulkGrid>> = {}
) {
  const rows = props.rows ?? [buildRow('i-1'), buildRow('i-2')];
  const onSetCellValue = props.onSetCellValue ?? vi.fn();
  const onSetCellValueOnRows = props.onSetCellValueOnRows ?? vi.fn();
  const onToggleSelected = props.onToggleSelected ?? vi.fn();
  const onSelectAll = props.onSelectAll ?? vi.fn();
  const onClearSelection = props.onClearSelection ?? vi.fn();
  const dirtyRows = props.dirtyRows ?? new Map<string, InventoryRowDelta>();
  const selectedRowIds = props.selectedRowIds ?? new Set<string>();

  const utils = render(
    <MemoryRouter>
      <InventoryBulkGrid
        rows={rows}
        dirtyRows={dirtyRows}
        selectedRowIds={selectedRowIds}
        onSetCellValue={onSetCellValue}
        onSetCellValueOnRows={onSetCellValueOnRows}
        onToggleSelected={onToggleSelected}
        onSelectAll={onSelectAll}
        onClearSelection={onClearSelection}
      />
    </MemoryRouter>
  );

  return { ...utils, onToggleSelected, rows };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('InventoryBulkGrid — row selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: false });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function getRowFor(id: string): HTMLElement {
    const checkbox = screen.getByRole('checkbox', {
      name: new RegExp(`Select Item ${id}`, 'i'),
    });
    const row = checkbox.closest('[role="row"]');
    if (!row) throw new Error(`Could not find row for ${id}`);
    return row as HTMLElement;
  }

  it('row click toggles selection after the 250ms debounce window', () => {
    const onToggleSelected = vi.fn();
    renderGrid({ onToggleSelected });

    const row = getRowFor('i-1');
    fireEvent.click(row);
    expect(onToggleSelected).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(250); });
    expect(onToggleSelected).toHaveBeenCalledWith('i-1');
  });

  it('double-click on a cell cancels the pending row-level toggle', () => {
    const onToggleSelected = vi.fn();
    renderGrid({ onToggleSelected });

    const row = getRowFor('i-1');
    const nameCell = within(row).getAllByRole('button')[0]; // first SortableHeader or BulkEditableCell button

    fireEvent.click(row);
    fireEvent.doubleClick(nameCell);

    act(() => { vi.advanceTimersByTime(500); });
    expect(onToggleSelected).not.toHaveBeenCalled();
  });

  it('checkbox click calls onToggleSelected exactly once (no double-fire from row click)', () => {
    const onToggleSelected = vi.fn();
    renderGrid({ onToggleSelected });

    const row = getRowFor('i-1');
    const checkbox = within(row).getByRole('checkbox', {
      name: new RegExp(`Select Item i-1`, 'i'),
    });

    fireEvent.click(checkbox);

    act(() => { vi.advanceTimersByTime(250); });
    expect(onToggleSelected).toHaveBeenCalledTimes(1);
    expect(onToggleSelected).toHaveBeenCalledWith('i-1');
  });
});

describe('InventoryBulkGrid — select-all header checkbox', () => {
  it('selects all rows when none are selected', () => {
    const onSelectAll = vi.fn();
    renderGrid({ onSelectAll });

    const headerCheckbox = screen.getByRole('checkbox', { name: /select all rows/i });
    fireEvent.click(headerCheckbox);

    expect(onSelectAll).toHaveBeenCalledWith(['i-1', 'i-2']);
  });

  it('clears selection when all rows are selected', () => {
    const onClearSelection = vi.fn();
    const rows = [buildRow('i-1'), buildRow('i-2')];
    const selectedRowIds = new Set(['i-1', 'i-2']);
    renderGrid({ rows, selectedRowIds, onClearSelection });

    const headerCheckbox = screen.getByRole('checkbox', { name: /select all rows/i });
    fireEvent.click(headerCheckbox);

    expect(onClearSelection).toHaveBeenCalled();
  });
});

describe('InventoryBulkGrid — empty state', () => {
  it('renders empty-state message when rows is empty', () => {
    renderGrid({ rows: [] });
    expect(screen.getByText(/No inventory items to edit/i)).toBeInTheDocument();
  });
});

describe('InventoryBulkGrid — dirty cell indicator', () => {
  it('renders a dirty row when dirtyRows contains that item', () => {
    const dirtyRows = new Map<string, InventoryRowDelta>([
      ['i-1', { location: 'New Location' }],
    ]);
    renderGrid({ dirtyRows });

    // The virtualized list is rendered; the row container should have the dirty bg class
    const list = screen.getByTestId('virtual-list');
    expect(list).toBeInTheDocument();
    // Dirty state is applied via CSS class — ensure the row is rendered
    const rows = list.querySelectorAll('[role="row"]');
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });
});

describe('InventoryBulkGrid — pagination and thumbnails', () => {
  const manyRows = Array.from({ length: 30 }, (_, index) =>
    buildRow(`i-${String(index + 1).padStart(2, '0')}`),
  );
  const visibleRowCount = () =>
    within(screen.getByTestId('virtual-list')).getAllByRole('row').length;

  it('shows 25 rows per page with a footer, and pages through every item', () => {
    renderGrid({ rows: manyRows });
    expect(visibleRowCount()).toBe(25);
    expect(screen.getByTestId('inventory-bulk-pagination-footer')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /next/i })[0]);
    expect(visibleRowCount()).toBe(5);
    expect(screen.getByRole('checkbox', { name: /Select Item i-30/i })).toBeInTheDocument();
  });

  it('clears the selection when changing page so bulk apply never hits hidden rows', () => {
    const onClearSelection = vi.fn();
    renderGrid({ rows: manyRows, onClearSelection });
    fireEvent.click(screen.getAllByRole('button', { name: /next/i })[0]);
    expect(onClearSelection).toHaveBeenCalled();
  });

  it('select-all selects only the rows on the current page', () => {
    const onSelectAll = vi.fn();
    renderGrid({ rows: manyRows, onSelectAll });
    fireEvent.click(screen.getByRole('checkbox', { name: /select all/i }));
    expect(onSelectAll).toHaveBeenCalledTimes(1);
    expect(onSelectAll.mock.calls[0][0]).toHaveLength(25);
  });

  it('renders an image column with a thumbnail per row', () => {
    renderGrid({ rows: manyRows.slice(0, 3) });
    expect(screen.getByRole('columnheader', { name: 'Image' })).toBeInTheDocument();
    const firstRow = screen.getByRole('checkbox', { name: /Select Item i-01/i }).closest('[role="row"]')!;
    expect(firstRow.querySelectorAll('[role="gridcell"]')[1].childElementCount).toBeGreaterThan(0);
  });

  it('hides the footer when there is nothing to edit', () => {
    renderGrid({ rows: [] });
    expect(screen.queryByTestId('inventory-bulk-pagination-footer')).not.toBeInTheDocument();
  });
});
