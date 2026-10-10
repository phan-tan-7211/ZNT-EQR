import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { BulkEquipmentGrid } from './BulkEquipmentGrid';
import type { EquipmentRecord } from '@/features/equipment/types/equipment';
import { getEquipmentStatusRailClass } from '@/lib/status-colors';

vi.mock('@/services/imageUploadService', async () => {
  const actual = await vi.importActual<typeof import('@/services/imageUploadService')>(
    '@/services/imageUploadService',
  );
  return {
    ...actual,
    getEquipmentDisplayImageUrl: (ref: string | null | undefined, variant = 'full') =>
      ref ? `https://img.test/${variant}/${ref}` : null,
  };
});

/**
 * Build the minimal subset of `EquipmentRecord` the grid actually reads.
 * Fields the columns don't render are filled in as nulls/empty strings; the
 * test does not exercise those code paths.
 */
function buildRow(id: string, overrides: Partial<EquipmentRecord> = {}): EquipmentRecord {
  // Cast through `unknown` so the test fixture only specifies the fields the
  // grid actually reads. The full Supabase row shape has many fields the bulk
  // grid does not surface (location coords, customer_id, etc.) and stubbing
  // each one adds noise without exercising any code path.
  return {
    id,
    organization_id: 'org-1',
    name: `Equipment ${id}`,
    manufacturer: 'Caterpillar',
    model: 'D6',
    serial_number: 'SN-1',
    status: 'active',
    location: 'Yard A',
    working_hours: 100,
    team_id: null,
    team_name: undefined,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    installation_date: '2026-01-01',
    use_team_location: false,
    notes: null,
    image_url: null,
    warranty_expiration: null,
    last_maintenance: null,
    custom_attributes: null,
    last_known_location: null,
    ...overrides,
  } as unknown as EquipmentRecord;
}

function renderGrid(props: Partial<React.ComponentProps<typeof BulkEquipmentGrid>> = {}) {
  const rows = props.rows ?? [buildRow('eq-1'), buildRow('eq-2')];
  const onSetCellValue = props.onSetCellValue ?? vi.fn();
  const onSetCellValueOnRows = props.onSetCellValueOnRows ?? vi.fn();
  const onToggleSelected = props.onToggleSelected ?? vi.fn();
  const onSelectAll = props.onSelectAll ?? vi.fn();
  const onClearSelection = props.onClearSelection ?? vi.fn();
  const dirtyRows = props.dirtyRows ?? new Map();
  const selectedRowIds = props.selectedRowIds ?? new Set<string>();

  const utils = render(
    <MemoryRouter>
      <BulkEquipmentGrid
        rows={rows}
        dirtyRows={dirtyRows}
        selectedRowIds={selectedRowIds}
        onSetCellValue={onSetCellValue}
        onSetCellValueOnRows={onSetCellValueOnRows}
        onToggleSelected={onToggleSelected}
        onSelectAll={onSelectAll}
        onClearSelection={onClearSelection}
        sortConfig={props.sortConfig}
        onSortChange={props.onSortChange}
      />
    </MemoryRouter>
  );

  return { ...utils, onToggleSelected, rows };
}

/**
 * Single-click on a row toggles row selection AFTER the dblclick debounce
 * window — the click handler now lives on `<TableRow>` so dead-zone clicks
 * (Team text, padding, empty cells) also select the row, addressing the
 * Copilot feedback that selection was previously cell-only.
 */
describe('BulkEquipmentGrid — row-level selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: false });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function getRowFor(id: string): HTMLElement {
    // Row accessible name varies by row content; rather than rely on it, look
    // up the row by walking up from the row's checkbox aria-label.
    const checkbox = screen.getByRole('checkbox', {
      name: new RegExp(`Select Equipment ${id}`, 'i'),
    });
    const row = checkbox.closest('tr');
    if (!row) throw new Error(`Could not find row for ${id}`);
    return row;
  }

  it('row click toggles selection after the 250ms dblclick debounce window', () => {
    const onToggleSelected = vi.fn();
    renderGrid({ onToggleSelected });

    const firstRow = getRowFor('eq-1');
    fireEvent.click(firstRow);
    expect(onToggleSelected).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(onToggleSelected).toHaveBeenCalledWith('eq-1');
  });

  it('double-click on a cell cancels the row-level pending toggle (no spurious selection on edit)', () => {
    const onToggleSelected = vi.fn();
    renderGrid({ onToggleSelected });

    const firstRow = getRowFor('eq-1');
    const manufacturerCell = within(firstRow).getByRole('button', {
      name: /manufacturer: Caterpillar/i,
    });

    fireEvent.click(firstRow);
    fireEvent.doubleClick(manufacturerCell);

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onToggleSelected).not.toHaveBeenCalled();
  });

  it('checkbox click does NOT bubble through to the row toggle (avoids double-toggle)', () => {
    const onToggleSelected = vi.fn();
    renderGrid({ onToggleSelected });

    const firstRow = getRowFor('eq-1');
    const checkbox = within(firstRow).getByRole('checkbox', {
      name: /Select Equipment eq-1/i,
    });
    fireEvent.click(checkbox);

    act(() => {
      vi.advanceTimersByTime(250);
    });
    // The checkbox's own onCheckedChange calls onToggleSelected once; the
    // bubbled row click is suppressed via stopPropagation on the checkbox.
    expect(onToggleSelected).toHaveBeenCalledTimes(1);
    expect(onToggleSelected).toHaveBeenCalledWith('eq-1');
  });
});

describe('BulkEquipmentGrid — thumbnails', () => {
  it('shows the equipment thumbnail like the table view, with a fallback when there is no image', () => {
    const { container } = renderGrid({
      rows: [buildRow('eq-1', { image_url: 'one.jpg' }), buildRow('eq-2', { image_url: undefined })],
    });

    const thumbnails = container.querySelectorAll('[data-equipment-thumbnail]');
    expect(thumbnails).toHaveLength(2);

    const image = screen.getByRole('img', { name: 'Equipment eq-1' });
    expect(image).toHaveAttribute('src', 'https://img.test/thumb/one.jpg');
    // The row without an image renders the icon fallback instead of an <img>.
    expect(screen.queryByRole('img', { name: 'Equipment eq-2' })).not.toBeInTheDocument();
  });

  it('draws the status rail from the status being shown, including a pending edit', () => {
    const { container } = renderGrid({
      rows: [buildRow('eq-1', { status: 'active' })],
      dirtyRows: new Map([['eq-1', { status: 'maintenance' }]]),
    });

    const rail = container.querySelector('[data-equipment-thumbnail] span.w-1');
    expect(rail).not.toBeNull();
    expect(rail?.className).toContain(getEquipmentStatusRailClass('maintenance'));
    expect(rail?.className).not.toContain(getEquipmentStatusRailClass('active'));
  });
});

describe('BulkEquipmentGrid — thumbnail hover preview', () => {
  const hoverRows = [
    buildRow('eq-1', { image_url: 'one.jpg' }),
    buildRow('eq-2', { image_url: undefined }),
  ];

  function stubPointer(hoverCapable: boolean) {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: hoverCapable && query.includes('hover'),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  }

  function getThumbnail(container: HTMLElement, index: number): Element {
    return container.querySelectorAll('[data-equipment-thumbnail]')[index];
  }

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('opens the same larger preview as the table, using the preview image variant', () => {
    stubPointer(true);
    const { container } = renderGrid({ rows: hoverRows });
    const thumbnail = getThumbnail(container, 0);
    expect(thumbnail).toHaveClass('cursor-zoom-in');

    fireEvent.pointerMove(thumbnail, { clientX: 220, clientY: 240 });

    // Rendered in a portal so table cells cannot clip or offset it.
    const preview = document.body.querySelector('[data-equipment-image-hover-preview]');
    expect(preview).not.toBeNull();
    expect(container.contains(preview)).toBe(false);
    expect(preview).toHaveClass('fixed', 'opacity-100');
    expect(preview?.querySelector('img')).toHaveAttribute('src', 'https://img.test/preview/one.jpg');
  });

  it('fades the preview out when the pointer leaves the thumbnail', () => {
    stubPointer(true);
    const { container } = renderGrid({ rows: hoverRows });
    const thumbnail = getThumbnail(container, 0);

    fireEvent.pointerMove(thumbnail, { clientX: 220, clientY: 240 });
    fireEvent.pointerLeave(thumbnail);
    expect(document.body.querySelector('[data-equipment-image-hover-preview]')).toHaveClass('opacity-0');

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(document.body.querySelector('[data-equipment-image-hover-preview]')).toBeNull();
  });

  it('does not open a preview for rows without an image or on touch-like pointers', () => {
    stubPointer(true);
    const { container, unmount } = renderGrid({ rows: hoverRows });

    fireEvent.pointerMove(getThumbnail(container, 1), { clientX: 220, clientY: 240 });
    expect(document.body.querySelector('[data-equipment-image-hover-preview]')).toBeNull();
    unmount();

    stubPointer(false);
    const second = renderGrid({ rows: hoverRows });
    fireEvent.pointerMove(getThumbnail(second.container, 0), { clientX: 220, clientY: 240 });
    expect(document.body.querySelector('[data-equipment-image-hover-preview]')).toBeNull();
  });
});

describe('BulkEquipmentGrid — server-side sorting', () => {
  const rows = [
    buildRow('eq-1', { name: 'Zeta', manufacturer: 'Komatsu' }),
    buildRow('eq-2', { name: 'Alpha', manufacturer: 'Caterpillar' }),
  ];

  function renderedNames(): string[] {
    return screen
      .getAllByRole('link', { name: /^(Zeta|Alpha)$/ })
      .map((link) => link.textContent ?? '');
  }

  it('keeps the order the server returned and reports header clicks to the page', () => {
    const onSortChange = vi.fn();
    renderGrid({ rows, sortConfig: { field: 'name', direction: 'asc' }, onSortChange });

    // The page owns the sort: rows are not re-sorted locally.
    expect(renderedNames()).toEqual(['Zeta', 'Alpha']);

    fireEvent.click(screen.getByRole('button', { name: 'Manufacturer' }));
    expect(onSortChange).toHaveBeenLastCalledWith('manufacturer', 'asc');

    // Name is the active ascending column, so clicking it flips to descending.
    fireEvent.click(screen.getByRole('button', { name: 'Name' }));
    expect(onSortChange).toHaveBeenLastCalledWith('name', 'desc');
  });

  it('sorts by Team through the server like every other column', () => {
    const onSortChange = vi.fn();
    renderGrid({ rows, sortConfig: { field: 'name', direction: 'asc' }, onSortChange });

    fireEvent.click(screen.getByRole('button', { name: 'Team' }));
    expect(onSortChange).toHaveBeenLastCalledWith('team_name', 'asc');
  });

  it('still sorts the visible rows locally when no server sort is provided', () => {
    renderGrid({ rows });
    expect(renderedNames()).toEqual(['Alpha', 'Zeta']);
    expect(screen.getByRole('button', { name: 'Team' })).toBeInTheDocument();
  });
});
