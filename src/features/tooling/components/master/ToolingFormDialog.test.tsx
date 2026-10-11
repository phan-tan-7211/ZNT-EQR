import { describe, expect, it, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@vitest-harness/utils/test-utils';
import { ToolingFormDialog } from '@/features/tooling/components/master/ToolingFormDialog';

const mockNavigate = vi.fn();
const createMutateAsync = vi.fn();
const updateMutateAsync = vi.fn();
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock('sonner', () => ({ toast: toastMock }));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/features/tooling/hooks/useTooling', () => ({
  useCreateTooling: () => ({ mutateAsync: createMutateAsync, isPending: false }),
  useUpdateToolingDetails: () => ({ mutateAsync: updateMutateAsync, isPending: false }),
  useToolingDesigns: () => ({ data: [] }),
  useEnrollableTlEquipment: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/features/organization/hooks/useOrganizationMembers', () => ({
  useOrganizationMembersQuery: () => ({ data: [] }),
}));

vi.mock('@/features/teams/hooks/useTeamManagement', () => ({
  useTeams: () => ({ data: [] }),
}));

function renderDialog() {
  return render(<ToolingFormDialog open onOpenChange={vi.fn()} organizationId="org-1" />);
}

describe('ToolingFormDialog (create)', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    createMutateAsync.mockReset();
    updateMutateAsync.mockReset();
    toastMock.success.mockReset();
    toastMock.error.mockReset();
  });

  it('requires a tool name for a new TL asset', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole('button', { name: 'Register tool' }));

    expect(screen.getByText('Tool name is required.')).toBeInTheDocument();
    expect(screen.getByLabelText('Tool name')).toHaveAttribute('aria-invalid', 'true');
    expect(createMutateAsync).not.toHaveBeenCalled();
  });

  it('rejects a warning limit above the life limit and non-positive intervals', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.type(screen.getByLabelText('Tool name'), 'Weld jig');
    await user.type(screen.getByLabelText(/Warning limit/), '1200');
    await user.type(screen.getByLabelText(/Life limit/), '1000');
    await user.type(screen.getByLabelText(/Inspection interval/), '0');
    await user.click(screen.getByRole('button', { name: 'Register tool' }));

    expect(screen.getByText('The warning limit must not exceed the life limit.')).toBeInTheDocument();
    expect(screen.getByText('Enter a whole number of days greater than zero.')).toBeInTheDocument();
    expect(createMutateAsync).not.toHaveBeenCalled();
    expect(toastMock.error).toHaveBeenCalledWith('Please fix the highlighted fields.');
  });

  it('submits a valid new asset and navigates to the created tool', async () => {
    createMutateAsync.mockResolvedValue('tool-new');
    const user = userEvent.setup();
    renderDialog();
    await user.type(screen.getByLabelText('Tool name'), '  Weld jig  ');
    await user.type(screen.getByLabelText(/Storage location/), 'Rack 4');
    await user.type(screen.getByLabelText(/Warning limit/), '800');
    await user.type(screen.getByLabelText(/Life limit/), '1000');
    await user.click(screen.getByRole('button', { name: 'Register tool' }));

    expect(createMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Weld jig',
        storage_location: 'Rack 4',
        tooling_type: 'jig',
        ownership_type: 'company',
        requires_machine: true,
        usage_unit: 'cycles',
        warning_limit: 800,
        life_limit: 1000,
        maintenance_interval: null,
        inspection_interval_days: null,
        team_id: null,
        design_id: null,
      }),
    );
    expect(createMutateAsync.mock.calls[0][0]).not.toHaveProperty('equipment_id');
    expect(toastMock.success).toHaveBeenCalledWith('Tool registered.');
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/tooling/tool-new');
  });

  it('maps RPC error codes to translated toasts', async () => {
    createMutateAsync.mockRejectedValue({ message: 'TOOLING_PERMISSION_DENIED', code: '42501' });
    const user = userEvent.setup();
    renderDialog();
    await user.type(screen.getByLabelText('Tool name'), 'Weld jig');
    await user.click(screen.getByRole('button', { name: 'Register tool' }));

    expect(toastMock.error).toHaveBeenCalledWith('You do not have permission for this tooling action.');
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
