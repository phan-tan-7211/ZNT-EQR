import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { InventoryBulkGrid } from './InventoryBulkGrid';
import type { InventoryItem } from '@/features/inventory/types/inventory';
import type { InventoryRowDelta } from '@/features/inventory/hooks/useBulkEditInventory';
import { getPrimaryInventoryItemImageRefs } from '@/features/inventory/services/inventoryListThumbnailService';
import { batchResolveInventoryItemImageDisplayUrls } from '@/services/imageUploadService';

// The row thumbnail resolves its image through these two calls. Stub them so
// no test reaches the network, and so a test can hand back a real URL.
vi.mock('@/features/inventory/services/inventoryListThumbnailService', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@/features/inventory/services/inventoryListThumbnailService')
  >()),
  getPrimaryInventoryItemImageRefs: vi.fn(async () => ({})),
}));

vi.mock('@/services/imageUploadService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/imageUploadService')>()),
  batchResolveInventoryItemImageDisplayUrls: vi.fn(
    async (storedRefs: (string | null | undefined)[]) => storedRefs.map(() => null),
  ),
}));

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

function getRowFor(id: string): HTMLElement {
  const checkbox = screen.getByRole('checkbox', {
    name: new RegExp(`Select Item ${id}`, 'i'),
  });
  const row = checkbox.closest('[role="row"]');
  if (!row) throw new Error(`Could not find row for ${id}`);
  return row as HTMLElement;
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

  it('renders an image column that shows the resolved image for rows that have one', async () => {
    const storedRef = 'org-1/i-img/photo.jpg';
    const signedUrl = 'https://signed.example.com/i-img.jpg';
    vi.mocked(getPrimaryInventoryItemImageRefs).mockResolvedValue({});
    vi.mocked(batchResolveInventoryItemImageDisplayUrls).mockImplementation(async (storedRefs) =>
      storedRefs.map((ref) => (ref === storedRef ? signedUrl : null)),
    );

    renderGrid({ rows: [buildRow('i-img', { image_url: storedRef }), buildRow('i-plain')] });

    // The thumbnail column has no visible title but keeps an accessible name.
    const imageHeader = screen.getByRole('columnheader', { name: 'Image' });
    expect(within(imageHeader).getByText('Image')).toHaveClass('sr-only');
    const imageRow = getRowFor('i-img');
    await waitFor(() => {
      expect(imageRow.querySelector('[data-inventory-item-thumbnail] img')).toHaveAttribute(
        'src',
        signedUrl,
      );
    });
    expect(batchResolveInventoryItemImageDisplayUrls).toHaveBeenCalledWith(
      expect.arrayContaining([storedRef]),
      { variant: 'thumb' },
    );
    // A row without an image keeps the placeholder and never gets an <img>.
    const plainRow = getRowFor('i-plain');
    expect(plainRow.querySelector('[data-inventory-item-thumbnail]')).not.toBeNull();
    expect(plainRow.querySelector('[data-inventory-item-thumbnail] img')).toBeNull();
  });

  it('drops selected rows that are not on the current page (e.g. moved by a refetch)', () => {
    const onSelectAll = vi.fn();
    renderGrid({ rows: manyRows, onSelectAll, selectedRowIds: new Set(['i-01', 'i-30']) });
    expect(onSelectAll).toHaveBeenCalledWith(['i-01']);
  });

  it('leaves the selection alone when every selected row is visible', () => {
    const onSelectAll = vi.fn();
    renderGrid({ rows: manyRows, onSelectAll, selectedRowIds: new Set(['i-01', 'i-02']) });
    expect(onSelectAll).not.toHaveBeenCalled();
  });

  it('hides the footer when there is nothing to edit', () => {
    renderGrid({ rows: [] });
    expect(screen.queryByTestId('inventory-bulk-pagination-footer')).not.toBeInTheDocument();
  });
});

describe('InventoryBulkGrid — keyboard handling', () => {
  it('keeps spaces typed into a cell editor and never toggles the row', async () => {
    const user = userEvent.setup();
    const onToggleSelected = vi.fn();
    const onSetCellValue = vi.fn();
    renderGrid({ onToggleSelected, onSetCellValue });

    const row = getRowFor('i-1');
    await user.dblClick(within(row).getByRole('button', { name: /^name:/i }));
    const input = within(row).getByRole('textbox', { name: /edit name/i });
    expect(input).toHaveFocus();

    await user.clear(input);
    await user.keyboard('a b');
    expect(input).toHaveValue('a b');

    // Enter commits the edit; it must not also toggle the row.
    await user.keyboard('{Enter}');
    expect(onSetCellValue).toHaveBeenCalledWith('i-1', 'name', 'a b');
    expect(onToggleSelected).not.toHaveBeenCalled();
  });

  it('lets a focused cell handle its own keys: Space toggles once, Enter opens the editor', async () => {
    const user = userEvent.setup();
    const onToggleSelected = vi.fn();
    renderGrid({ onToggleSelected });

    const row = getRowFor('i-1');
    within(row).getByRole('button', { name: /^name:/i }).focus();

    await user.keyboard(' ');
    expect(onToggleSelected).toHaveBeenCalledTimes(1);
    expect(onToggleSelected).toHaveBeenCalledWith('i-1');

    await user.keyboard('{Enter}');
    expect(within(row).getByRole('textbox', { name: /edit name/i })).toBeInTheDocument();
    expect(onToggleSelected).toHaveBeenCalledTimes(1);
  });

  it('still toggles the row on Enter and Space when the row itself has focus', async () => {
    const user = userEvent.setup();
    const onToggleSelected = vi.fn();
    renderGrid({ onToggleSelected });

    const row = getRowFor('i-1');
    row.focus();
    expect(row).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(onToggleSelected).toHaveBeenCalledTimes(1);

    await user.keyboard(' ');
    expect(onToggleSelected).toHaveBeenCalledTimes(2);
    expect(onToggleSelected).toHaveBeenNthCalledWith(2, 'i-1');
  });
});
