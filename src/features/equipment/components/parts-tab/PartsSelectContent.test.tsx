import React from 'react';
import { render, screen, fireEvent } from '@vitest-harness/utils/test-utils';
import { describe, it, expect, vi } from 'vitest';
import { Select, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PartsSelectContent } from './PartsSelectContent';
import { SORT_OPTIONS, STOCK_FILTER_OPTIONS } from './types';

const renderOpenSelect = (
  options: ReadonlyArray<{ value: string; labelKey: string }>,
  value: string,
  onValueChange = vi.fn(),
) =>
  render(
    <Select defaultOpen value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <PartsSelectContent options={options} />
    </Select>,
  );

describe('PartsSelectContent', () => {
  it('renders one translated item per sort option and marks the current value', () => {
    renderOpenSelect(SORT_OPTIONS, 'stock-desc');

    const items = screen.getAllByRole('option');
    expect(items.map((item) => item.textContent)).toEqual([
      'Name (A-Z)',
      'Name (Z-A)',
      'Stock (Low to High)',
      'Stock (High to Low)',
      'Location (A-Z)',
    ]);
    expect(screen.getByRole('option', { name: 'Stock (High to Low)' })).toHaveAttribute(
      'data-state',
      'checked',
    );
    expect(screen.getByRole('option', { name: 'Name (A-Z)' })).toHaveAttribute(
      'data-state',
      'unchecked',
    );
  });

  it('reports the value of the chosen stock filter option', () => {
    const onValueChange = vi.fn();
    renderOpenSelect(STOCK_FILTER_OPTIONS, 'all', onValueChange);

    expect(screen.getAllByRole('option')).toHaveLength(STOCK_FILTER_OPTIONS.length);
    fireEvent.keyDown(screen.getByRole('option', { name: 'Low Stock' }), { key: 'Enter' });

    expect(onValueChange).toHaveBeenCalledWith('low_stock');
  });
});
