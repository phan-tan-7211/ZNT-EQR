import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@vitest-harness/utils/test-utils';
import { ToolingIssueReturnTab } from '@/features/tooling/components/operations/ToolingIssueReturnTab';
import type { ToolingCompatibility, ToolingOverview } from '@/features/tooling/types';

const issueMutate = vi.fn();
const returnMutate = vi.fn();
const transferMutate = vi.fn();
const usabilityMutate = vi.fn();
let compatibilityRules: ToolingCompatibility[] = [];

const mutation = (mutate: ReturnType<typeof vi.fn>) => ({ mutate, isPending: false });

vi.mock('@/features/tooling/hooks/useTooling', () => ({
  useToolingAssignments: () => ({ data: [], isLoading: false, error: null }),
  useToolingCompatibility: () => ({ data: compatibilityRules }),
  useProductParts: () => ({
    data: [
      { id: 'part-1', part_number: 'P-100', name: 'Bracket', is_active: true },
      { id: 'part-2', part_number: 'P-200', name: 'Housing', is_active: true },
    ],
  }),
  useProductionOperations: () => ({
    data: [{ id: 'op-1', code: 'OP10', name: 'Spot weld', is_active: true }],
  }),
  useMachineCandidates: () => ({ data: [{ id: 'machine-1', name: 'Press 1', management_code: 'M-01' }] }),
  useIssueTooling: () => mutation(issueMutate),
  useReturnTooling: () => mutation(returnMutate),
  useTransferToolingLocation: () => mutation(transferMutate),
  useSetToolingUsability: () => mutation(usabilityMutate),
}));

vi.mock('@/features/organization/hooks/useOrganizationMembers', () => ({
  useOrganizationMembersQuery: () => ({
    data: [
      { id: 'user-1', userId: 'user-1', name: 'Current User', status: 'active' },
      { id: 'user-2', userId: 'user-2', name: 'Operator Two', status: 'active' },
      { id: 'user-3', userId: 'user-3', name: 'Pending Person', status: 'pending' },
    ],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function makeTool(overrides: Partial<ToolingOverview> = {}): ToolingOverview {
  return {
    id: 'tool-1',
    organization_id: 'org-1',
    name: 'Weld Jig A',
    management_code: 'TL-001',
    manufacturer: 'Acme',
    model: 'J1',
    serial_number: null,
    equipment_status: 'active',
    team_id: null,
    image_url: null,
    tooling_type: 'jig',
    design_id: null,
    design_code: null,
    design_name: null,
    ownership_type: 'company',
    owner_name: null,
    storage_location: 'Rack A1',
    responsible_user_id: null,
    responsible_name: null,
    condition: 'good',
    usability_state: 'available',
    approval_status: 'approved',
    approved_by: null,
    approved_at: null,
    requires_machine: false,
    drawing_number: null,
    drawing_revision: null,
    revision_effective_date: null,
    usage_unit: 'cycles',
    warning_limit: null,
    life_limit: null,
    maintenance_interval: null,
    inspection_interval_days: null,
    cumulative_usage: 0,
    usage_since_maintenance: 0,
    last_maintenance_at: null,
    last_inspection_at: null,
    next_inspection_due: null,
    notes: null,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
    remaining_life: null,
    warning_reached: false,
    life_limit_reached: false,
    maintenance_due: false,
    inspection_overdue: false,
    active_assignment_id: null,
    issued_to_user_id: null,
    issued_to_name: null,
    issued_at: null,
    issued_machine_id: null,
    is_issued: false,
    is_issuable: true,
    ...overrides,
  };
}

async function chooseOption(comboboxName: RegExp, optionName: string) {
  fireEvent.click(screen.getByRole('combobox', { name: comboboxName }));
  fireEvent.click(await screen.findByRole('option', { name: optionName }));
}

describe('ToolingIssueReturnTab', () => {
  beforeEach(() => {
    issueMutate.mockReset();
    returnMutate.mockReset();
    transferMutate.mockReset();
    usabilityMutate.mockReset();
    compatibilityRules = [];
  });

  it('disables issue and lists the blocker when the tool is not approved', () => {
    render(<ToolingIssueReturnTab tool={makeTool({ approval_status: 'pending', is_issuable: false })} canManage={false} canOperate />);

    expect(screen.getByRole('button', { name: 'Issue tool' })).toBeDisabled();
    const blockers = screen.getByTestId('tooling-issue-blockers');
    expect(within(blockers).getByText('Not approved for use')).toBeInTheDocument();
    expect(screen.getByText('Resolve the blockers listed above before issuing this tool.')).toBeInTheDocument();
    expect(screen.getByTestId('tooling-in-storage')).toHaveTextContent('In storage at Rack A1');
  });

  it('submits the recipient and production context to the issue mutation', async () => {
    render(<ToolingIssueReturnTab tool={makeTool()} canManage={false} canOperate />);

    fireEvent.click(screen.getByRole('button', { name: 'Issue tool' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/checked against the approved, active compatibility rules/i)).toBeInTheDocument();

    await chooseOption(/Recipient/, 'Operator Two');
    expect(screen.queryByRole('option', { name: 'Pending Person' })).not.toBeInTheDocument();
    await chooseOption(/Product \/ part/, 'P-200 · Housing');
    await chooseOption(/Operation/, 'OP10 · Spot weld');
    fireEvent.change(within(dialog).getByLabelText(/Issue location/), { target: { value: 'Line 3' } });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Issue tool' }));

    expect(issueMutate).toHaveBeenCalledTimes(1);
    expect(issueMutate.mock.calls[0][0]).toEqual({
      issuedToUserId: 'user-2',
      productPartId: 'part-2',
      operationId: 'op-1',
      machineEquipmentId: null,
      issueLocation: 'Line 3',
      condition: 'good',
      notes: null,
    });
  });

  it('defaults the recipient to the current user and offers only rule-backed context when rules exist', async () => {
    compatibilityRules = [
      {
        id: 'rule-1',
        organization_id: 'org-1',
        tooling_equipment_id: 'tool-1',
        product_part_id: 'part-1',
        operation_id: null,
        machine_equipment_id: null,
        drawing_revision: null,
        effective_from: null,
        effective_to: null,
        approval_status: 'approved',
        approved_by: null,
        approved_at: null,
        is_active: true,
        notes: null,
        created_at: '2026-10-01T00:00:00Z',
        product_part: { id: 'part-1', part_number: 'P-100', name: 'Bracket' },
        operation: null,
        machine: null,
      },
    ];
    render(<ToolingIssueReturnTab tool={makeTool()} canManage={false} canOperate />);

    fireEvent.click(screen.getByRole('button', { name: 'Issue tool' }));
    const dialog = await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('combobox', { name: /Product \/ part/ }));
    expect(await screen.findByRole('option', { name: 'P-100 · Bracket' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'P-200 · Housing' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: 'None' }));

    fireEvent.click(within(dialog).getByRole('button', { name: 'Issue tool' }));
    expect(issueMutate.mock.calls[0][0]).toMatchObject({ issuedToUserId: 'user-1', productPartId: null });
  });

  it('requires a condition before returning the tool', async () => {
    const issued = makeTool({
      is_issued: true,
      is_issuable: false,
      issued_to_user_id: 'user-2',
      issued_to_name: 'Operator Two',
      issued_at: '2026-10-10T08:00:00Z',
      active_assignment_id: 'assign-1',
    });
    render(<ToolingIssueReturnTab tool={issued} canManage={false} canOperate />);

    expect(screen.queryByRole('button', { name: 'Issue tool' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Return tool' }));
    const dialog = await screen.findByRole('dialog');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Return tool' }));
    expect(within(dialog).getByText('Select the condition after use.')).toBeInTheDocument();
    expect(returnMutate).not.toHaveBeenCalled();

    await chooseOption(/Condition after use/, 'Damaged');
    expect(within(dialog).getByText(/quarantines it until an authorized inspection/i)).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText(/Usage this checkout/), { target: { value: '120' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Return tool' }));

    expect(returnMutate).toHaveBeenCalledTimes(1);
    expect(returnMutate.mock.calls[0][0]).toEqual({
      condition: 'damaged',
      returnLocation: 'Rack A1',
      usageQuantity: 120,
      notes: null,
    });
  });

  it('shows no action buttons to a viewer without operate permission', () => {
    render(<ToolingIssueReturnTab tool={makeTool()} canManage={false} canOperate={false} />);

    expect(screen.queryByRole('button', { name: 'Issue tool' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Return tool' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Transfer location' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Quarantine' })).not.toBeInTheDocument();
    expect(screen.getByTestId('tooling-issue-no-permission')).toBeInTheDocument();
  });
});
