import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@vitest-harness/utils/test-utils';
import ToolingAttentionWidget from '@/features/tooling/components/ToolingAttentionWidget';
import { SelectedTeamContext, type SelectedTeamId } from '@/contexts/selected-team-context';
import type { ToolingOverview } from '@/features/tooling/types';

const listState = vi.hoisted(() => ({
  data: undefined as unknown[] | undefined,
  isLoading: false,
  error: null as Error | null,
}));
const useToolingListMock = vi.hoisted(() => vi.fn());

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({ currentOrganization: { id: 'org-1', name: 'Org' } }),
}));

vi.mock('@/features/tooling/hooks/useTooling', () => ({
  useToolingList: (organizationId?: string) => {
    useToolingListMock(organizationId);
    return listState;
  },
}));

// toolingInsights is registered in I18nProvider by the lead; resolve it here so
// the test does not depend on that wiring.
vi.mock('@/i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/i18n')>();
  const { toolingInsightsResources } = await import('@/i18n/toolingInsightsResources');
  const lookup = (key: string): unknown =>
    key
      .split('.')
      .reduce<unknown>(
        (node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined),
        toolingInsightsResources.en,
      );
  return {
    ...actual,
    useI18n: () => {
      const base = actual.useI18n();
      return {
        ...base,
        t: (key: string, params?: Record<string, string | number>) => {
          const value = lookup(key);
          if (typeof value !== 'string') return base.t(key, params);
          return value.replace(/{{\s*(\w+)\s*}}/g, (_match, token: string) => String(params?.[token] ?? `{{${token}}}`));
        },
      };
    },
  };
});

function makeTool(overrides: Partial<ToolingOverview>): ToolingOverview {
  return {
    id: 'tool-ok',
    organization_id: 'org-1',
    name: 'Healthy jig',
    management_code: 'TL-0000',
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
    storage_location: 'Rack A',
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

function countFor(label: string): string {
  const tile = screen.getAllByTestId('tooling-attention-count').find((node) => within(node).queryByText(label));
  if (!tile) throw new Error(`No count tile labelled ${label}`);
  return tile.querySelector('dd')?.textContent ?? '';
}

describe('ToolingAttentionWidget', () => {
  beforeEach(() => {
    listState.data = undefined;
    listState.isLoading = false;
    listState.error = null;
    useToolingListMock.mockReset();
  });

  it('loads the current organization and shows a skeleton while loading', () => {
    listState.isLoading = true;
    render(<ToolingAttentionWidget />);

    expect(useToolingListMock).toHaveBeenCalledWith('org-1');
    expect(screen.getByTestId('tooling-attention-loading')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText('All tooling OK')).not.toBeInTheDocument();
  });

  it('counts each attention reason, excludes retired tools and lists the most severe first', () => {
    listState.data = [
      makeTool({ id: 'ok-issued', name: 'Issued OK', is_issued: true }),
      makeTool({ id: 'warn', name: 'Warning jig', management_code: 'TL-0002', warning_reached: true }),
      makeTool({
        id: 'limit',
        name: 'Limit die',
        management_code: 'TL-0003',
        warning_reached: true,
        life_limit_reached: true,
        maintenance_due: true,
        is_issued: true,
      }),
      makeTool({ id: 'inspect', name: 'Overdue fixture', management_code: 'TL-0004', inspection_overdue: true }),
      makeTool({ id: 'maint', name: 'Maintenance mold', management_code: 'TL-0005', maintenance_due: true }),
      makeTool({ id: 'quar', name: 'Quarantined jig', management_code: 'TL-0006', usability_state: 'quarantined' }),
      makeTool({ id: 'repair', name: 'Repair jig', management_code: 'TL-0007', usability_state: 'under_repair' }),
      makeTool({ id: 'pending', name: 'Pending jig', management_code: 'TL-0008', usability_state: 'pending_inspection' }),
      makeTool({
        id: 'retired',
        name: 'Retired die',
        usability_state: 'retired',
        life_limit_reached: true,
        inspection_overdue: true,
      }),
    ];
    render(<ToolingAttentionWidget />);

    expect(countFor('Life limit')).toBe('1');
    // A tool at its hard limit is not double-counted as a warning.
    expect(countFor('Life warning')).toBe('1');
    expect(countFor('Inspection overdue')).toBe('1');
    expect(countFor('Maintenance due')).toBe('2');
    expect(countFor('Out of service')).toBe('3');
    expect(countFor('Issued now')).toBe('2');
    expect(screen.getByTestId('tooling-attention-total')).toHaveTextContent('7 need attention');

    const items = screen.getAllByTestId('tooling-attention-item');
    expect(items).toHaveLength(5);
    expect(items[0]).toHaveTextContent('Limit die');
    expect(items[0]).toHaveTextContent('Life limit reached');
    expect(items[0]).toHaveTextContent('+1');
    expect(items[0]).toHaveAttribute('href', '/dashboard/tooling/limit');
    expect(items[1]).toHaveTextContent('Overdue fixture');
    expect(items[2]).toHaveTextContent('Quarantined');
    expect(screen.queryByText('Retired die')).not.toBeInTheDocument();
    expect(screen.getByTestId('tooling-attention-more')).toHaveTextContent('2 more tools need attention');
    expect(screen.getByRole('link', { name: 'View all tooling' })).toHaveAttribute('href', '/dashboard/tooling');
  });

  it('shows the all-clear state when no tool needs attention', () => {
    listState.data = [makeTool({ id: 'a' }), makeTool({ id: 'b', is_issued: true })];
    render(<ToolingAttentionWidget />);

    expect(screen.getByTestId('tooling-attention-empty')).toHaveTextContent('All tooling OK');
    expect(screen.getByText('No tools need attention right now.')).toBeInTheDocument();
    expect(screen.queryByTestId('tooling-attention-item')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tooling-attention-total')).not.toBeInTheDocument();
    expect(countFor('Issued now')).toBe('1');
  });

  it('explains when no tools are registered yet', () => {
    listState.data = [];
    render(<ToolingAttentionWidget />);

    expect(screen.getByText('All tooling OK')).toBeInTheDocument();
    expect(screen.getByText('No tools are registered yet.')).toBeInTheDocument();
  });

  it.each([
    ['team-a', ['Team A jig']],
    ['unassigned', ['Unassigned jig']],
    [null, ['Team A jig', 'Team B jig', 'Unassigned jig']],
  ] as Array<[SelectedTeamId, string[]]>)('respects the TopBar team scope %s', (selectedTeamId, expected) => {
    listState.data = [
      makeTool({ id: 'a', name: 'Team A jig', team_id: 'team-a', maintenance_due: true }),
      makeTool({ id: 'b', name: 'Team B jig', team_id: 'team-b', maintenance_due: true }),
      makeTool({ id: 'u', name: 'Unassigned jig', team_id: null, maintenance_due: true }),
    ];
    render(
      <SelectedTeamContext.Provider value={{ selectedTeamId, selectedTeam: null, setSelectedTeamId: vi.fn() }}>
        <ToolingAttentionWidget />
      </SelectedTeamContext.Provider>,
    );

    const names = screen.getAllByTestId('tooling-attention-item').map((item) => item.querySelector('p')?.textContent);
    expect(names.sort()).toEqual(expected);
    expect(countFor('Maintenance due')).toBe(String(expected.length));
  });

  it('shows an error instead of counts when the list fails to load', () => {
    listState.error = new Error('boom');
    render(<ToolingAttentionWidget />);

    expect(screen.getByText('Unable to load tooling status.')).toBeInTheDocument();
    expect(screen.queryByTestId('tooling-attention-count')).not.toBeInTheDocument();
  });
});
