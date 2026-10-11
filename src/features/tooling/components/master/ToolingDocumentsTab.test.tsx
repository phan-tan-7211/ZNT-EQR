import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@vitest-harness/utils/test-utils';
import { ToolingDocumentsTab } from '@/features/tooling/components/master/ToolingDocumentsTab';
import type { ToolingDrawingRevision, ToolingOverview } from '@/features/tooling/types';

const releaseMutate = vi.hoisted(() => vi.fn());
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
const revisionsState = vi.hoisted(() => ({
  data: [] as unknown[],
  isLoading: false,
  error: null as Error | null,
}));

vi.mock('sonner', () => ({ toast: toastMock }));

vi.mock('@/features/equipment/components/EquipmentImagesTab', () => ({
  default: () => <div data-testid="equipment-images-stub" />,
}));

vi.mock('@/features/tooling/hooks/useTooling', () => ({
  useToolingDesigns: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/features/tooling/hooks/useToolingRevisions', () => ({
  useToolingDrawingRevisions: () => revisionsState,
  useReleaseToolingDrawingRevision: () => ({ mutate: releaseMutate, isPending: false }),
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

const tool = {
  id: 'tool-1',
  organization_id: 'org-1',
  name: 'Weld jig 7',
  management_code: 'TL-007',
  team_id: null,
  image_url: null,
  design_id: null,
  design_code: null,
  design_name: null,
  usability_state: 'available',
  drawing_number: 'DRW-100',
  drawing_revision: 'B',
  revision_effective_date: '2026-09-01',
} as ToolingOverview;

function makeRevision(overrides: Partial<ToolingDrawingRevision>): ToolingDrawingRevision {
  return {
    id: 'rev-b',
    organization_id: 'org-1',
    tooling_equipment_id: 'tool-1',
    drawing_number: 'DRW-100',
    revision: 'B',
    effective_date: '2026-09-01',
    change_description: 'Clamp height raised',
    status: 'released',
    released_by: 'user-1',
    released_by_name: 'Alex Admin',
    released_at: '2026-09-01T08:00:00Z',
    superseded_at: null,
    ...overrides,
  };
}

const history: ToolingDrawingRevision[] = [
  makeRevision({}),
  makeRevision({
    id: 'rev-a',
    revision: 'A',
    effective_date: '2026-01-10',
    change_description: 'Initial release',
    status: 'superseded',
    released_at: '2026-01-10T08:00:00Z',
    superseded_at: '2026-09-01T08:00:00Z',
  }),
];

function renderTab(canManage: boolean, toolOverrides: Partial<ToolingOverview> = {}) {
  return render(<ToolingDocumentsTab tool={{ ...tool, ...toolOverrides }} canManage={canManage} canOperate={canManage} />);
}

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

async function openReleaseDialog() {
  fireEvent.click(screen.getByRole('button', { name: 'Release new revision' }));
  return screen.findByRole('dialog');
}

describe('ToolingDocumentsTab drawing revisions', () => {
  beforeEach(() => {
    releaseMutate.mockReset();
    toastMock.success.mockReset();
    toastMock.error.mockReset();
    revisionsState.data = history;
    revisionsState.isLoading = false;
    revisionsState.error = null;
  });

  it('shows the current revision and full history read-only for non-admins', () => {
    renderTab(false);

    const current = screen.getByTestId('tooling-current-revision');
    expect(within(current).getByText('Revision B')).toBeInTheDocument();
    expect(within(current).getByText('Clamp height raised')).toBeInTheDocument();
    expect(screen.getAllByTestId('tooling-revision-row')).toHaveLength(2);
    expect(screen.getAllByTestId('tooling-revision-card')).toHaveLength(2);
    expect(screen.getAllByText('Superseded').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Initial release').length).toBeGreaterThan(0);

    expect(screen.queryByRole('button', { name: 'Release new revision' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('tooling-revision-legacy-note')).not.toBeInTheDocument();
    // Existing drawing / attachments content is kept.
    expect(screen.getByText('Drawing & revision')).toBeInTheDocument();
    expect(screen.getByTestId('equipment-images-stub')).toBeInTheDocument();
  });

  it('explains the legacy Edit details field to admins', () => {
    renderTab(true);
    expect(screen.getByTestId('tooling-revision-legacy-note')).toHaveTextContent(/legacy shortcut/);
  });

  it('flags a drawing revision edited outside the release flow', () => {
    renderTab(false, { drawing_revision: 'B2' });
    expect(screen.getByTestId('tooling-revision-out-of-sync')).toHaveTextContent('(B2)');
  });

  it('shows the legacy revision on record when nothing has been released yet', () => {
    revisionsState.data = [];
    renderTab(false);
    expect(screen.getByText('No revision has been released through the revision register yet.')).toBeInTheDocument();
    expect(screen.getByText(/Drawing revision on record: B/)).toBeInTheDocument();
    expect(screen.getByText('No revisions have been released yet.')).toBeInTheDocument();
  });

  it('disables release for retired tools', () => {
    renderTab(true, { usability_state: 'retired' });
    expect(screen.getByRole('button', { name: 'Release new revision' })).toBeDisabled();
    expect(screen.getByText('Retired tools cannot receive new revisions.')).toBeInTheDocument();
  });

  it('prefills the drawing number and today as the effective date', async () => {
    renderTab(true);
    const dialog = await openReleaseDialog();

    expect(within(dialog).getByLabelText(/Drawing number/)).toHaveValue('DRW-100');
    expect(within(dialog).getByLabelText('Effective date')).toHaveValue(todayIso());
  });

  it('requires a revision and change description and rejects an existing revision', async () => {
    renderTab(true);
    const dialog = await openReleaseDialog();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Continue' }));
    expect(within(dialog).getByText('Enter the revision.')).toBeInTheDocument();
    expect(within(dialog).getByText('Describe the change.')).toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText('Revision'), { target: { value: ' a ' } });
    fireEvent.change(within(dialog).getByLabelText('Change description'), { target: { value: 'Retry' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Continue' }));
    expect(within(dialog).getByText('This revision already exists for this tool.')).toBeInTheDocument();

    expect(screen.queryByTestId('tooling-revision-confirm')).not.toBeInTheDocument();
    expect(releaseMutate).not.toHaveBeenCalled();
  });

  it('confirms that the release supersedes the current revision before calling the RPC', async () => {
    releaseMutate.mockImplementation((_args: unknown, options?: { onSuccess?: () => void }) => options?.onSuccess?.());
    renderTab(true);
    const dialog = await openReleaseDialog();

    fireEvent.change(within(dialog).getByLabelText('Revision'), { target: { value: ' C ' } });
    fireEvent.change(within(dialog).getByLabelText(/Drawing number/), { target: { value: 'DRW-200' } });
    fireEvent.change(within(dialog).getByLabelText('Effective date'), { target: { value: '2026-10-15' } });
    fireEvent.change(within(dialog).getByLabelText('Change description'), {
      target: { value: '  Locator pin moved 2 mm  ' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Continue' }));

    const confirm = await screen.findByTestId('tooling-revision-confirm');
    expect(confirm).toHaveTextContent('Releasing revision C supersedes the current revision B.');
    expect(releaseMutate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Release revision' }));

    expect(releaseMutate).toHaveBeenCalledTimes(1);
    expect(releaseMutate.mock.calls[0][0]).toEqual({
      revision: 'C',
      changeDescription: 'Locator pin moved 2 mm',
      drawingNumber: 'DRW-200',
      effectiveDate: '2026-10-15',
    });
    expect(toastMock.success).toHaveBeenCalledWith('Revision C released.');
  });

  it('returns to the form and shows the mapped error when the release fails', async () => {
    releaseMutate.mockImplementation((_args: unknown, options?: { onError?: (error: unknown) => void }) =>
      options?.onError?.({ message: 'TOOLING_REVISION_DUPLICATE' }),
    );
    revisionsState.data = [];
    renderTab(true, { drawing_revision: null });
    const dialog = await openReleaseDialog();

    fireEvent.change(within(dialog).getByLabelText('Revision'), { target: { value: 'A' } });
    fireEvent.change(within(dialog).getByLabelText('Change description'), { target: { value: 'First release' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Continue' }));

    expect(await screen.findByTestId('tooling-revision-confirm')).toHaveTextContent(
      'Revision A will become the first released revision for this tool.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Release revision' }));

    expect(toastMock.error).toHaveBeenCalledWith('This revision already exists for this tool.');
    expect(await screen.findByRole('button', { name: 'Continue' })).toBeInTheDocument();
  });
});
