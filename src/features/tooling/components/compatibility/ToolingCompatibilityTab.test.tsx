import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ToolingCompatibilityTab } from '@/features/tooling/components/compatibility/ToolingCompatibilityTab';
import type { ProductPart, ProductionOperation, ToolingCompatibility, ToolingOverview } from '@/features/tooling/types';

const mockCreateMutateAsync = vi.fn();
const mockStatusMutateAsync = vi.fn();
const mockUseToolingCompatibility = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

const products: ProductPart[] = [
  {
    id: 'part-1',
    organization_id: 'org-1',
    part_number: 'PN-100',
    name: 'Front bracket',
    customer_name: null,
    revision: 'C',
    description: null,
    is_active: true,
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
    description: null,
    is_active: true,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  },
];

const machines = [
  { id: 'machine-1', name: 'Welder A', management_code: 'MC-001' },
  { id: 'machine-2', name: 'Welder B', management_code: 'MC-002' },
  { id: 'machine-3', name: 'Press C', management_code: 'MC-003' },
];

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

vi.mock('@/features/tooling/hooks/useTooling', () => ({
  useToolingCompatibility: (...args: unknown[]) => mockUseToolingCompatibility(...args),
  useProductParts: (organizationId?: string) => ({
    data: organizationId ? products : undefined,
    isLoading: false,
  }),
  useProductionOperations: (organizationId?: string) => ({
    data: organizationId ? operations : undefined,
    isLoading: false,
  }),
  useMachineCandidates: () => ({ data: machines, isLoading: false }),
  useCreateToolingCompatibility: () => ({ mutateAsync: mockCreateMutateAsync, isPending: false }),
  useSetToolingCompatibilityStatus: () => ({ mutateAsync: mockStatusMutateAsync, isPending: false }),
}));

const tool = {
  id: 'tool-1',
  organization_id: 'org-1',
  name: 'Weld jig 7',
  management_code: 'TL-007',
  requires_machine: true,
} as ToolingOverview;

function makeRule(overrides: Partial<ToolingCompatibility>): ToolingCompatibility {
  return {
    id: 'rule-1',
    organization_id: 'org-1',
    tooling_equipment_id: 'tool-1',
    product_part_id: 'part-1',
    operation_id: 'op-1',
    machine_equipment_id: 'machine-1',
    drawing_revision: 'Rev C',
    effective_from: '2026-10-01',
    effective_to: null,
    approval_status: 'pending',
    approved_by: null,
    approved_at: null,
    is_active: true,
    notes: null,
    created_at: '2026-10-01T00:00:00Z',
    product_part: { id: 'part-1', part_number: 'PN-100', name: 'Front bracket' },
    operation: { id: 'op-1', code: 'OP-20', name: 'Spot weld' },
    machine: { id: 'machine-1', name: 'Welder A', management_code: 'MC-001' },
    ...overrides,
  };
}

const rules: ToolingCompatibility[] = [
  makeRule({ id: 'rule-pending' }),
  makeRule({
    id: 'rule-manual',
    approval_status: 'approved',
    operation_id: null,
    operation: null,
    machine_equipment_id: null,
    machine: null,
  }),
];

function renderTab(canManage: boolean, toolOverrides: Partial<ToolingOverview> = {}) {
  return render(
    <MemoryRouter>
      <ToolingCompatibilityTab tool={{ ...tool, ...toolOverrides }} canManage={canManage} canOperate={canManage} />
    </MemoryRouter>,
  );
}

async function openAddDialogAndPickProduct() {
  fireEvent.click(screen.getByRole('button', { name: 'Add rule' }));
  const dialog = await screen.findByRole('dialog');
  fireEvent.click(within(dialog).getByRole('combobox', { name: /Product part/ }));
  fireEvent.click(await screen.findByRole('option', { name: 'PN-100 – Front bracket' }));
  return screen.getByRole('dialog');
}

describe('ToolingCompatibilityTab', () => {
  beforeEach(() => {
    mockCreateMutateAsync.mockReset();
    mockStatusMutateAsync.mockReset();
    mockToastSuccess.mockReset();
    mockToastError.mockReset();
    mockUseToolingCompatibility.mockReturnValue({
      data: rules,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('renders rules with operation / machine fallbacks and the not-assignment explanation', () => {
    renderTab(false);

    expect(screen.getByText(/does not assign the tool to a machine/i)).toBeInTheDocument();
    expect(screen.getAllByText('PN-100 – Front bracket').length).toBeGreaterThan(0);
    expect(screen.getAllByText('OP-20 – Spot weld').length).toBeGreaterThan(0);
    expect(screen.getAllByText('MC-001 – Welder A').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Any operation').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Manual / no machine').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pending approval').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('compat-rule-row')).toHaveLength(2);
  });

  it('shows the manual-tool badge when the tool does not require a machine', () => {
    renderTab(false, { requires_machine: false });
    expect(screen.getByText('Manual tool (no machine required)')).toBeInTheDocument();
  });

  it('hides admin actions for non-admin viewers', () => {
    renderTab(false);

    expect(screen.queryByRole('button', { name: 'Add rule' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Approve rule/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Reject rule/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Deactivate rule/ })).not.toBeInTheDocument();
  });

  it('shows approve / reject / deactivate for admins and confirms before calling the RPC', async () => {
    mockStatusMutateAsync.mockResolvedValue(undefined);
    renderTab(true);

    const approveButtons = screen.getAllByRole('button', { name: /^Approve rule for PN-100/ });
    // Only the pending rule can be approved (table + mobile card render the same rule).
    expect(approveButtons).toHaveLength(2);
    fireEvent.click(approveButtons[0]);

    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/Note/), { target: { value: 'Checked on line' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm' }));

    await waitFor(() =>
      expect(mockStatusMutateAsync).toHaveBeenCalledWith({
        compatibilityId: 'rule-pending',
        action: 'approve',
        note: 'Checked on line',
      }),
    );
  });

  it('creates one rule per selected machine', async () => {
    mockCreateMutateAsync.mockResolvedValue('new-id');
    renderTab(true);

    const dialog = await openAddDialogAndPickProduct();
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'MC-001 – Welder A' }));
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'MC-003 – Press C' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create rules' }));

    await waitFor(() => expect(mockCreateMutateAsync).toHaveBeenCalledTimes(2));
    const machineIds = mockCreateMutateAsync.mock.calls.map(
      ([input]) => (input as { machineEquipmentId: string | null }).machineEquipmentId,
    );
    expect(machineIds).toEqual(['machine-1', 'machine-3']);
    for (const [input] of mockCreateMutateAsync.mock.calls) {
      expect(input).toMatchObject({ productPartId: 'part-1', operationId: null });
    }
    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith('2 rule(s) created and waiting for approval.'));
  });

  it('sends a null machine for the manual "no machine" option', async () => {
    mockCreateMutateAsync.mockResolvedValue('new-id');
    renderTab(true);

    const dialog = await openAddDialogAndPickProduct();
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'No machine (manual)' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create rules' }));

    await waitFor(() => expect(mockCreateMutateAsync).toHaveBeenCalledTimes(1));
    expect(mockCreateMutateAsync.mock.calls[0][0]).toMatchObject({
      productPartId: 'part-1',
      machineEquipmentId: null,
    });
  });

  it('requires at least one machine target and a valid date range', async () => {
    renderTab(true);

    const dialog = await openAddDialogAndPickProduct();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create rules' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/Select at least one machine/);

    fireEvent.change(within(dialog).getByLabelText('Effective from'), { target: { value: '2026-10-10' } });
    fireEvent.change(within(dialog).getByLabelText('Effective to'), { target: { value: '2026-10-01' } });
    expect(within(dialog).getByText('Effective to must be on or after effective from.')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Create rules' })).toBeDisabled();
    expect(mockCreateMutateAsync).not.toHaveBeenCalled();
  });

  it('reports partial failures with the translated first error', async () => {
    mockCreateMutateAsync
      .mockResolvedValueOnce('new-id')
      .mockRejectedValueOnce({ message: 'TOOLING_COMPATIBILITY_DUPLICATE' });
    renderTab(true);

    const dialog = await openAddDialogAndPickProduct();
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'MC-001 – Welder A' }));
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'MC-002 – Welder B' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create rules' }));

    await waitFor(() => expect(mockToastError).toHaveBeenCalledTimes(1));
    expect(String(mockToastError.mock.calls[0][0])).toMatch(/^1 of 2 rules created\./);
    // The failed machine stays selected for retry; the created one is cleared.
    expect(within(screen.getByRole('dialog')).getByRole('checkbox', { name: 'MC-002 – Welder B' })).toBeChecked();
    expect(within(screen.getByRole('dialog')).getByRole('checkbox', { name: 'MC-001 – Welder A' })).not.toBeChecked();
  });
});
