import { describe, expect, it, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, within } from '@vitest-harness/utils/test-utils';
import ToolingListPage from '@/features/tooling/pages/ToolingListPage';
import type { ToolingOverview } from '@/features/tooling/types';

const mockNavigate = vi.fn();
const listState = vi.hoisted(() => ({
  data: [] as unknown[],
  isLoading: false,
  error: null as Error | null,
}));
const permissionState = vi.hoisted(() => ({ canManage: true, canOperate: true }));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({ currentOrganization: { id: 'org-1', name: 'Org' } }),
}));

vi.mock('@/features/tooling/hooks/useTooling', () => ({
  useToolingList: () => listState,
}));

vi.mock('@/features/tooling/hooks/useToolingPermissions', () => ({
  useToolingPermissions: () => permissionState,
}));

vi.mock('@/features/tooling/components/master/ToolingFormDialog', () => ({
  ToolingFormDialog: ({ open }: { open: boolean }) => (open ? <div data-testid="tooling-form-dialog-stub" /> : null),
}));
vi.mock('@/features/tooling/components/master/ToolingDesignsCatalog', () => ({
  ToolingDesignsCatalog: () => <div data-testid="designs-catalog-stub" />,
}));
vi.mock('@/features/tooling/components/compatibility/ProductPartsCatalog', () => ({
  ProductPartsCatalog: () => <div data-testid="products-catalog-stub" />,
}));
vi.mock('@/features/tooling/components/compatibility/ProductionOperationsCatalog', () => ({
  ProductionOperationsCatalog: () => <div data-testid="operations-catalog-stub" />,
}));

function makeTool(overrides: Partial<ToolingOverview>): ToolingOverview {
  return {
    id: 'tool-1',
    organization_id: 'org-1',
    name: 'Weld jig A',
    management_code: 'TL-0001',
    manufacturer: '-',
    model: '-',
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
    storage_location: 'Rack 1',
    responsible_user_id: null,
    responsible_name: null,
    condition: 'good',
    usability_state: 'available',
    approval_status: 'approved',
    approved_by: null,
    approved_at: null,
    requires_machine: true,
    drawing_number: null,
    drawing_revision: null,
    revision_effective_date: null,
    usage_unit: 'cycles',
    warning_limit: 800,
    life_limit: 1000,
    maintenance_interval: null,
    inspection_interval_days: null,
    cumulative_usage: 100,
    usage_since_maintenance: 0,
    last_maintenance_at: null,
    last_inspection_at: null,
    next_inspection_due: null,
    notes: null,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
    remaining_life: 900,
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

const TOOLS = [
  makeTool({}),
  makeTool({
    id: 'tool-2',
    name: 'Press die B',
    management_code: 'TL-0002',
    tooling_type: 'die',
    storage_location: null,
    is_issued: true,
    issued_to_name: 'Linh Tran',
    cumulative_usage: 850,
    warning_reached: true,
  }),
  makeTool({ id: 'tool-3', name: 'Checking fixture C', management_code: 'TL-0003', tooling_type: 'checking_fixture' }),
];

const desktopRows = () => screen.getAllByTestId('tooling-row');

describe('ToolingListPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    listState.data = TOOLS;
    listState.isLoading = false;
    listState.error = null;
    permissionState.canManage = true;
  });

  it('lists tools with life usage and holder information', () => {
    render(<ToolingListPage />);
    expect(desktopRows()).toHaveLength(3);
    expect(screen.getByTestId('tooling-list-count')).toHaveTextContent('3 of 3 tools');
    const issuedRow = desktopRows()[1];
    expect(within(issuedRow).getByText('Held by Linh Tran')).toBeInTheDocument();
    expect(within(issuedRow).getByText('850 / 1,000 cycles')).toBeInTheDocument();
    expect(within(issuedRow).getByText('85% used')).toBeInTheDocument();
  });

  it('filters by search across holder name and management code', async () => {
    const user = userEvent.setup();
    render(<ToolingListPage />);
    const search = screen.getByLabelText('Search tools');

    await user.type(search, 'linh');
    expect(desktopRows()).toHaveLength(1);
    expect(within(desktopRows()[0]).getByText('Press die B')).toBeInTheDocument();

    await user.clear(search);
    await user.type(search, 'tl-0003');
    expect(desktopRows()).toHaveLength(1);
    expect(screen.getByTestId('tooling-list-count')).toHaveTextContent('1 of 3 tools');
  });

  it('shows a filtered empty state with a clear action when nothing matches', async () => {
    const user = userEvent.setup();
    render(<ToolingListPage />);
    await user.type(screen.getByLabelText('Search tools'), 'no such tool');

    expect(screen.getByText('No tools match these filters')).toBeInTheDocument();
    expect(screen.queryByText('No tools registered yet')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(desktopRows()).toHaveLength(3);
  });

  it('shows the registration empty state when the organization has no tools', () => {
    listState.data = [];
    render(<ToolingListPage />);
    expect(screen.getByText('No tools registered yet')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Register tool' }).length).toBeGreaterThan(0);
  });

  it('hides registration for users without manage permission', () => {
    listState.data = [];
    permissionState.canManage = false;
    render(<ToolingListPage />);
    expect(screen.queryByRole('button', { name: 'Register tool' })).not.toBeInTheDocument();
    expect(
      screen.getByText('Tools registered by your organization administrators will appear here.'),
    ).toBeInTheDocument();
  });

  it('opens the register dialog for managers', async () => {
    const user = userEvent.setup();
    render(<ToolingListPage />);
    await user.click(screen.getByRole('button', { name: 'Register tool' }));
    expect(screen.getByTestId('tooling-form-dialog-stub')).toBeInTheDocument();
  });

  it('navigates to the tool detail on row click', async () => {
    const user = userEvent.setup();
    render(<ToolingListPage />);
    await user.click(desktopRows()[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/tooling/tool-1');
  });

  it('shows an error alert when loading fails', () => {
    listState.data = [];
    listState.error = new Error('boom');
    render(<ToolingListPage />);
    expect(screen.getByText('Unable to load tooling.')).toBeInTheDocument();
  });

  it('restores the active section from the view search param', () => {
    render(<ToolingListPage />, { initialEntries: ['/dashboard/tooling?view=designs'] });
    expect(screen.getByTestId('designs-catalog-stub')).toBeInTheDocument();
    expect(screen.queryByTestId('tooling-row')).not.toBeInTheDocument();
  });
});
