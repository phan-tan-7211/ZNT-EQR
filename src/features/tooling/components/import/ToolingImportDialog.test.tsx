import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import {
  ToolingImportDialog,
  type ToolingImportDialogProps,
} from '@/features/tooling/components/import/ToolingImportDialog';

const refs = vi.hoisted(() => ({
  tools: [] as Array<{ name: string; serial_number: string | null }>,
  parts: [] as Array<{ part_number: string }>,
  operations: [] as Array<{ code: string }>,
  designs: [] as Array<{ id: string; design_code: string; tooling_type: string; is_active: boolean }>,
  teams: [{ id: 'team-1', name: 'Press line' }],
  members: [
    { userId: 'user-1', email: 'lead@example.com', status: 'active' },
    { userId: 'user-2', email: 'gone@example.com', status: 'inactive' },
  ],
}));
const permissionState = vi.hoisted(() => ({ canManage: true, canOperate: true }));
const serviceMocks = vi.hoisted(() => ({
  createTooling: vi.fn(),
  saveProductPart: vi.fn(),
  saveProductionOperation: vi.fn(),
}));
const downloadBlobMock = vi.hoisted(() => vi.fn());
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

const loaded = <T,>(data: T) => ({ data, isLoading: false, isError: false });

vi.mock('@/i18n', async () => {
  const { toolingResources } = await import('@/i18n/toolingResources');
  const { toolingImportResources } = await import('@/i18n/toolingImportResources');
  const tree: Record<string, unknown> = { ...toolingResources.en, ...toolingImportResources.en };
  const t = (key: string, params?: Record<string, string | number>) => {
    const value = key
      .split('.')
      .reduce<unknown>(
        (node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined),
        tree,
      );
    const text = typeof value === 'string' ? value : key;
    if (!params) return text;
    return text.replace(/{{\s*(\w+)\s*}}/g, (match, token: string) =>
      params[token] === undefined ? match : String(params[token]),
    );
  };
  return { useI18n: () => ({ language: 'en', setLanguage: () => undefined, t }) };
});

vi.mock('sonner', () => ({ toast: toastMock }));
vi.mock('@/utils/exportUtils', () => ({ downloadBlob: downloadBlobMock }));
vi.mock('@/features/tooling/services/toolingService', () => serviceMocks);
vi.mock('@/features/tooling/hooks/useToolingPermissions', () => ({
  useToolingPermissions: () => permissionState,
}));
vi.mock('@/features/tooling/hooks/useTooling', () => ({
  useToolingList: () => loaded(refs.tools),
  useProductParts: () => loaded(refs.parts),
  useProductionOperations: () => loaded(refs.operations),
  useToolingDesigns: () => loaded(refs.designs),
}));
vi.mock('@/features/organization/hooks/useOrganizationMembers', () => ({
  useOrganizationMembersQuery: () => loaded(refs.members),
}));
vi.mock('@/features/teams/hooks/useTeamManagement', () => ({
  useTeams: () => loaded(refs.teams),
}));

function renderDialog(props: Partial<ToolingImportDialogProps> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
  const onOpenChange = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <ToolingImportDialog open onOpenChange={onOpenChange} organizationId="org-1" {...props} />
    </QueryClientProvider>,
  );
  return { invalidateSpy, onOpenChange };
}

function csvFile(lines: string[], name = 'import.csv') {
  return new File([lines.join('\n')], name, { type: 'text/csv' });
}

async function upload(user: ReturnType<typeof userEvent.setup>, file: File) {
  await user.upload(screen.getByLabelText('Upload import file (.xlsx or .csv)'), file);
}

describe('ToolingImportDialog', () => {
  beforeEach(() => {
    serviceMocks.createTooling.mockReset();
    serviceMocks.saveProductPart.mockReset();
    serviceMocks.saveProductionOperation.mockReset();
    downloadBlobMock.mockReset();
    toastMock.error.mockReset();
    permissionState.canManage = true;
    refs.parts = [{ part_number: 'P-200' }];
    refs.tools = [];
  });

  it('previews per-row errors and imports only the valid product parts', async () => {
    serviceMocks.saveProductPart.mockResolvedValue(undefined);
    const user = userEvent.setup();
    const { invalidateSpy } = renderDialog({ defaultKind: 'products' });

    expect(screen.getByRole('radio', { name: /Product parts/ })).toBeChecked();
    await upload(
      user,
      csvFile([
        'Part number,Part name,Customer,Colour',
        'P-100,Bracket,ACME,red',
        'p-100,Duplicate bracket,ACME,blue',
        ',Missing number,,',
        'P-200,Existing part,,',
      ]),
    );

    expect(await screen.findByText('Review before importing')).toBeInTheDocument();
    expect(screen.getByText('File: import.csv')).toBeInTheDocument();
    expect(screen.getByText('These columns are not recognized and will be ignored: Colour')).toBeInTheDocument();

    const table = within(screen.getByTestId('tooling-import-preview-table'));
    expect(table.getByText('Part number "P-100" repeats row 2 in this file.')).toBeInTheDocument();
    expect(table.getByText('Part number is required.')).toBeInTheDocument();
    expect(table.getByText('Part number "P-200" already exists in your organization.')).toBeInTheDocument();
    expect(table.getAllByText('Error')).toHaveLength(3);
    expect(table.getAllByText('Ready')).toHaveLength(1);

    // Mobile cards carry the same per-row errors.
    const cards = within(screen.getByTestId('tooling-import-preview-cards'));
    expect(cards.getByText('Row 3')).toBeInTheDocument();
    expect(cards.getByText('Part number is required.')).toBeInTheDocument();

    await user.click(screen.getByRole('switch', { name: 'Show only rows with errors' }));
    expect(table.queryByText('P-100 — Bracket')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Import valid rows (1)' }));

    const result = within(await screen.findByTestId('tooling-import-result'));
    expect(serviceMocks.saveProductPart).toHaveBeenCalledTimes(1);
    expect(serviceMocks.saveProductPart).toHaveBeenCalledWith('org-1', {
      part_number: 'P-100',
      name: 'Bracket',
      customer_name: 'ACME',
    });
    expect(result.getByText('Created').nextSibling).toHaveTextContent('1');
    expect(result.getByText('Skipped (validation errors)').nextSibling).toHaveTextContent('3');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tooling'] });
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: ['equipment'] });
  });

  it('creates each valid tool once, shows progress and summarizes partial failures', async () => {
    let releaseFirst: (id: string) => void = () => undefined;
    serviceMocks.createTooling
      .mockImplementationOnce(
        () =>
          new Promise<string>((resolve) => {
            releaseFirst = resolve;
          }),
      )
      .mockRejectedValueOnce({ message: 'TOOLING_CROSS_ORGANIZATION', code: '23514' })
      .mockResolvedValueOnce('tool-3');
    const user = userEvent.setup();
    const { invalidateSpy, onOpenChange } = renderDialog();

    await upload(
      user,
      csvFile([
        'Tool name,Tooling type,Team,Responsible person email,Warning limit,Life limit,Requires a machine',
        'Weld jig A,Fixture,press LINE,LEAD@example.com,800,1000,yes',
        'Weld jig B,jig,,,,,no',
        'Mold C,Khuôn,,,,,',
        'Broken D,Spaceship,,gone@example.com,1200,1000,maybe',
      ]),
    );

    const table = within(await screen.findByTestId('tooling-import-preview-table'));
    expect(table.getByText('Tooling type: "Spaceship" is not an allowed value.')).toBeInTheDocument();
    expect(table.getByText('No active organization member has the email "gone@example.com".')).toBeInTheDocument();
    expect(table.getByText('Warning limit must not exceed the life limit.')).toBeInTheDocument();
    expect(table.getByText('Requires a machine: "maybe" must be Yes or No.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Import valid rows (3)' }));

    expect(await screen.findByText('0 of 3 rows processed')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Import progress' })).toBeInTheDocument();
    // Closing is blocked while the import runs.
    await user.keyboard('{Escape}');
    expect(onOpenChange).not.toHaveBeenCalled();

    releaseFirst('tool-1');

    const result = within(await screen.findByTestId('tooling-import-result'));
    expect(serviceMocks.createTooling).toHaveBeenCalledTimes(3);
    expect(serviceMocks.createTooling).toHaveBeenNthCalledWith(1, 'org-1', {
      name: 'Weld jig A',
      tooling_type: 'fixture',
      team_id: 'team-1',
      responsible_user_id: 'user-1',
      ownership_type: 'company',
      requires_machine: true,
      usage_unit: 'cycles',
      warning_limit: 800,
      life_limit: 1000,
    });
    expect(serviceMocks.createTooling).toHaveBeenNthCalledWith(
      3,
      'org-1',
      expect.objectContaining({ name: 'Mold C', tooling_type: 'mold' }),
    );

    expect(result.getByText('Created').nextSibling).toHaveTextContent('2');
    expect(result.getByText('Failed').nextSibling).toHaveTextContent('1');
    expect(result.getByText('Skipped (validation errors)').nextSibling).toHaveTextContent('1');
    const failures = within(screen.getByTestId('tooling-import-failures'));
    expect(failures.getByText('Row 3 · Weld jig B')).toBeInTheDocument();
    expect(failures.getByText('Linked records must belong to the same organization.')).toBeInTheDocument();
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tooling'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['equipment'] });

    // First match is the footer button; the dialog's own X button (sr-only "Close") renders last.
    await user.click(screen.getAllByRole('button', { name: 'Close' })[0]);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('imports production operations with localized enum labels', async () => {
    serviceMocks.saveProductionOperation.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole('radio', { name: /Production operations/ }));
    await upload(user, csvFile(['Mã công đoạn,Tên công đoạn,Loại công đoạn', 'op-10,Hàn điểm,Hàn']));
    await user.click(await screen.findByRole('button', { name: 'Import valid rows (1)' }));

    expect(await screen.findByText('All rows were imported (1).')).toBeInTheDocument();
    expect(serviceMocks.saveProductionOperation).toHaveBeenCalledWith('org-1', {
      code: 'OP-10',
      name: 'Hàn điểm',
      operation_type: 'welding',
    });
  });

  it('rejects files above the row limit and unsupported file types', async () => {
    const user = userEvent.setup({ applyAccept: false });
    renderDialog({ defaultKind: 'products' });

    const rows = Array.from({ length: 1001 }, (_, index) => `P-${index},Part ${index}`);
    await upload(user, csvFile(['Part number,Part name', ...rows]));
    expect(
      await screen.findByText(
        'The file has 1001 data rows. Import at most 1000 rows per file — split it into smaller files.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Review before importing')).not.toBeInTheDocument();

    await upload(user, new File(['x'], 'notes.txt', { type: 'text/plain' }));
    expect(await screen.findByText('Unsupported file type. Upload an .xlsx or .csv file.')).toBeInTheDocument();
    expect(serviceMocks.saveProductPart).not.toHaveBeenCalled();
  });

  it('reports a file whose headers match no template column', async () => {
    const user = userEvent.setup();
    renderDialog({ defaultKind: 'operations' });
    await upload(user, csvFile(['Foo,Bar', '1,2']));
    expect(
      await screen.findByText(
        'None of the column headers match the template. Download the template and copy your data into it.',
      ),
    ).toBeInTheDocument();
  });

  it('downloads an .xlsx template for the selected kind', async () => {
    const user = userEvent.setup();
    renderDialog({ defaultKind: 'operations' });
    await user.click(screen.getByRole('button', { name: 'Download template (.xlsx)' }));
    await waitFor(() =>
      expect(downloadBlobMock).toHaveBeenCalledWith(expect.any(Blob), 'tooling-operations-import-template.xlsx'),
    );
    expect(toastMock.error).not.toHaveBeenCalled();
  });

  it('blocks non-admins', () => {
    permissionState.canManage = false;
    renderDialog();
    expect(screen.getByText('Only organization owners and admins can import tooling data.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Upload import file (.xlsx or .csv)')).not.toBeInTheDocument();
  });
});
