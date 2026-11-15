/**
 * Both master-data catalogs are composed from the pieces in `CompatibilityShared` and
 * the hooks in `compatibilitySharedState`. These flows run against each of them so the
 * shared list / dialog behaviour stays identical for product parts and production operations.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ProductPartsCatalog } from '@/features/tooling/components/compatibility/ProductPartsCatalog';
import { ProductionOperationsCatalog } from '@/features/tooling/components/compatibility/ProductionOperationsCatalog';
import type { ProductPart, ProductionOperation } from '@/features/tooling/types';

const mockUseProductParts = vi.fn();
const mockUseProductionOperations = vi.fn();
const mockSavePart = vi.fn();
const mockSaveOperation = vi.fn();
const mockRefetch = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

vi.mock('@/features/tooling/hooks/useTooling', () => ({
  useProductParts: (...args: unknown[]) => mockUseProductParts(...args),
  useSaveProductPart: () => ({ mutateAsync: mockSavePart, isPending: false }),
  useProductionOperations: (...args: unknown[]) => mockUseProductionOperations(...args),
  useSaveProductionOperation: () => ({ mutateAsync: mockSaveOperation, isPending: false }),
}));

const parts: ProductPart[] = [
  {
    id: 'part-1',
    organization_id: 'org-1',
    part_number: 'PN-100',
    name: 'Front bracket',
    customer_name: 'Acme',
    revision: 'C',
    description: 'Left hand side',
    is_active: true,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  },
  {
    id: 'part-2',
    organization_id: 'org-1',
    part_number: 'PN-200',
    name: 'Rear plate',
    customer_name: null,
    revision: null,
    description: null,
    is_active: false,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  },
];

const operations: ProductionOperation[] = [
  {
    id: 'op-1',
    organization_id: 'org-1',
    code: 'OP-20',
    name: 'Spot weld',
    operation_type: 'welding',
    description: 'Robot cell 2',
    is_active: true,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  },
  {
    id: 'op-2',
    organization_id: 'org-1',
    code: 'OP-30',
    name: 'Final check',
    operation_type: 'inspection',
    description: null,
    is_active: false,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  },
];

interface QueryState {
  data: unknown[];
  isLoading?: boolean;
  error?: Error | null;
}

const catalogs = [
  {
    label: 'product parts',
    Catalog: ProductPartsCatalog,
    setQuery: (state: QueryState) =>
      mockUseProductParts.mockReturnValue({ isLoading: false, error: null, refetch: mockRefetch, ...state }),
    rows: parts,
    mockSave: mockSavePart,
    addName: 'Add product part',
    searchName: 'Search product parts',
    matchingSearch: 'acme',
    matchCount: '1 parts',
    noMatch: 'No product parts match your search.',
    emptyTitle: 'No product parts yet',
    firstCode: 'PN-100',
    secondCode: 'PN-200',
    editFirstName: 'Edit product part PN-100',
    editTitle: 'Edit product part',
    requiredMessage: 'Part number and name are required.',
    codeLabel: /^Part number/,
    fillNewRow: async (dialog: HTMLElement) => {
      fireEvent.change(within(dialog).getByLabelText(/^Part number/), { target: { value: ' PN-300 ' } });
      fireEvent.change(within(dialog).getByLabelText(/^Name/), { target: { value: ' Side rail ' } });
      fireEvent.change(within(dialog).getByLabelText('Customer'), { target: { value: 'Globex' } });
      fireEvent.change(within(dialog).getByLabelText('Description'), { target: { value: '  ' } });
    },
    createdInput: {
      part_number: 'PN-300',
      name: 'Side rail',
      customer_name: 'Globex',
      revision: null,
      description: null,
      is_active: false,
    },
    createdMessage: 'Product part created.',
    updatedInput: {
      part_number: 'PN-100',
      name: 'Front bracket v2',
      customer_name: 'Acme',
      revision: 'C',
      description: 'Left hand side',
      is_active: true,
    },
    updatedMessage: 'Product part updated.',
  },
  {
    label: 'production operations',
    Catalog: ProductionOperationsCatalog,
    setQuery: (state: QueryState) =>
      mockUseProductionOperations.mockReturnValue({ isLoading: false, error: null, refetch: mockRefetch, ...state }),
    rows: operations,
    mockSave: mockSaveOperation,
    addName: 'Add operation',
    searchName: 'Search production operations',
    matchingSearch: 'inspect',
    matchCount: '1 operations',
    noMatch: 'No operations match your search.',
    emptyTitle: 'No production operations yet',
    firstCode: 'OP-20',
    secondCode: 'OP-30',
    editFirstName: 'Edit operation OP-20',
    editTitle: 'Edit production operation',
    requiredMessage: 'Code, name and operation type are required.',
    codeLabel: /^Code/,
    fillNewRow: async (dialog: HTMLElement) => {
      fireEvent.change(within(dialog).getByLabelText(/^Code/), { target: { value: ' OP-40 ' } });
      fireEvent.change(within(dialog).getByLabelText(/^Name/), { target: { value: ' Press fit ' } });
      fireEvent.change(within(dialog).getByLabelText('Description'), { target: { value: '  ' } });
      fireEvent.click(within(dialog).getByRole('combobox', { name: /^Operation type/ }));
      fireEvent.click(await screen.findByRole('option', { name: 'Welding' }));
    },
    createdInput: {
      code: 'OP-40',
      name: 'Press fit',
      operation_type: 'welding',
      description: null,
      is_active: false,
    },
    createdMessage: 'Operation created.',
    updatedInput: {
      code: 'OP-20',
      name: 'Spot weld v2',
      operation_type: 'welding',
      description: 'Robot cell 2',
      is_active: true,
    },
    updatedMessage: 'Operation updated.',
  },
];

describe.each(catalogs)('$label catalog', (catalog) => {
  const { Catalog } = catalog;

  beforeEach(() => {
    vi.clearAllMocks();
    catalog.setQuery({ data: catalog.rows });
  });

  it('lists every row on desktop and mobile and filters them by the search text', () => {
    render(<Catalog organizationId="org-1" canManage />);

    expect(screen.getAllByText(catalog.firstCode)).toHaveLength(2);
    expect(screen.getAllByText(catalog.secondCode)).toHaveLength(2);
    expect(screen.getAllByText('Inactive')).toHaveLength(2);

    const search = screen.getByRole('searchbox', { name: catalog.searchName });
    fireEvent.change(search, { target: { value: catalog.matchingSearch } });
    expect(screen.getByText(catalog.matchCount)).toBeInTheDocument();

    fireEvent.change(search, { target: { value: 'no such row' } });
    expect(screen.getByText(catalog.noMatch)).toBeInTheDocument();
    expect(screen.queryByText(catalog.firstCode)).not.toBeInTheDocument();
  });

  it('is read-only for viewers', () => {
    render(<Catalog organizationId="org-1" canManage={false} />);

    expect(screen.getByText(/^View only\./)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: catalog.addName })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: catalog.editFirstName })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Actions' })).not.toBeInTheDocument();
  });

  it('offers the add action from the empty state to managers only', () => {
    catalog.setQuery({ data: [] });
    const view = render(<Catalog organizationId="org-1" canManage />);

    expect(screen.getByText(catalog.emptyTitle)).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: catalog.addName })).toHaveLength(2);

    view.rerender(<Catalog organizationId="org-1" canManage={false} />);
    expect(screen.queryByRole('button', { name: catalog.addName })).not.toBeInTheDocument();
  });

  it('retries a failed load', () => {
    catalog.setQuery({ data: [], error: new Error('network') });
    render(<Catalog organizationId="org-1" canManage />);

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('validates the required fields, then creates the row and closes the dialog', async () => {
    catalog.mockSave.mockResolvedValue(undefined);
    render(<Catalog organizationId="org-1" canManage />);

    fireEvent.click(screen.getByRole('button', { name: catalog.addName }));
    const dialog = await screen.findByRole('dialog');
    // Blank values pass the native `required` check, so the catalog's own trimmed validation answers.
    fireEvent.change(within(dialog).getByLabelText(catalog.codeLabel), { target: { value: ' ' } });
    fireEvent.change(within(dialog).getByLabelText(/^Name/), { target: { value: ' ' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent(catalog.requiredMessage);
    expect(catalog.mockSave).not.toHaveBeenCalled();

    await catalog.fillNewRow(dialog);
    fireEvent.click(within(dialog).getByRole('switch', { name: 'Active' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(catalog.mockSave).toHaveBeenCalledWith({ input: catalog.createdInput, id: undefined }),
    );
    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith(catalog.createdMessage));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('prefills the dialog when editing and saves the change under the row id', async () => {
    catalog.mockSave.mockResolvedValue(undefined);
    render(<Catalog organizationId="org-1" canManage />);

    fireEvent.click(screen.getAllByRole('button', { name: catalog.editFirstName })[0]);
    const dialog = await screen.findByRole('dialog', { name: catalog.editTitle });
    const name = within(dialog).getByLabelText(/^Name/);
    expect(name).toHaveValue(catalog.updatedInput.name.replace(' v2', ''));
    fireEvent.change(name, { target: { value: catalog.updatedInput.name } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(catalog.mockSave).toHaveBeenCalledWith({ input: catalog.updatedInput, id: catalog.rows[0].id }),
    );
    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith(catalog.updatedMessage));
  });

  it('keeps the dialog open and reports the translated error when saving fails', async () => {
    catalog.mockSave.mockRejectedValue({ code: '42501', message: 'permission denied' });
    render(<Catalog organizationId="org-1" canManage />);

    fireEvent.click(screen.getAllByRole('button', { name: catalog.editFirstName })[0]);
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith('You do not have permission for this tooling action.'),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  it('discards unsaved input when the dialog is cancelled and reopened', async () => {
    render(<Catalog organizationId="org-1" canManage />);

    fireEvent.click(screen.getByRole('button', { name: catalog.addName }));
    let dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(catalog.codeLabel), { target: { value: ' ' } });
    fireEvent.change(within(dialog).getByLabelText(/^Name/), { target: { value: 'Draft' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(within(dialog).getByRole('alert')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: catalog.addName }));
    dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText(/^Name/)).toHaveValue('');
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument();
  });
});
