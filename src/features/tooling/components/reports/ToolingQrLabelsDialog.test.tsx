import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor, within } from '@vitest-harness/utils/test-utils';
import { ToolingQrLabelsDialog } from '@/features/tooling/components/reports/ToolingQrLabelsDialog';
import { ToolingPdfFontError, type ToolingQrLabelOptions } from '@/features/tooling/services/toolingExportService';
import type { ToolingOverview } from '@/features/tooling/types';

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
const downloadLabels = vi.hoisted(() => vi.fn());
const loggerError = vi.hoisted(() => vi.fn());

vi.mock('sonner', () => ({ toast: toastMock }));

vi.mock('@/utils/logger', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/logger')>();
  return { ...actual, logger: { ...actual.logger, error: loggerError } };
});

vi.mock('@/features/tooling/services/toolingExportService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/tooling/services/toolingExportService')>()),
  downloadToolingQrLabels: downloadLabels,
}));

vi.mock('@/i18n', async (importOriginal) => {
  const { toolingResources } = await import('@/i18n/toolingResources');
  const { toolingReportsResources } = await import('@/i18n/toolingReportsResources');
  const tree: object = { ...toolingResources.en, ...toolingReportsResources.en };
  const t = (key: string, params?: Record<string, string | number>) => {
    const value = key.split('.').reduce<unknown>((node, segment) => {
      if (!node || typeof node !== 'object') return undefined;
      return (node as Record<string, unknown>)[segment];
    }, tree);
    const text = typeof value === 'string' ? value : key;
    return text.replace(/{{\s*([^}\s]+)\s*}}/g, (match, token: string) =>
      params?.[token] === undefined ? match : String(params[token]),
    );
  };
  return {
    ...(await importOriginal<typeof import('@/i18n')>()),
    useI18n: () => ({ t, language: 'en' as const, setLanguage: vi.fn() }),
  };
});

function makeTool(id: string, name: string, overrides: Partial<ToolingOverview> = {}): ToolingOverview {
  return {
    id,
    organization_id: 'org-1',
    name,
    management_code: `TL-${id}`,
    manufacturer: '',
    model: '',
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
    storage_location: null,
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
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
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

const TOOLS = [
  makeTool('1', 'Weld jig A', { storage_location: 'Rack 4' }),
  makeTool('2', 'Press die B', { tooling_type: 'die' }),
  makeTool('3', 'Mold C', { tooling_type: 'mold' }),
];

function renderDialog(tools: ToolingOverview[] = TOOLS) {
  const onOpenChange = vi.fn();
  render(<ToolingQrLabelsDialog open onOpenChange={onOpenChange} tools={tools} />);
  return { onOpenChange };
}

const downloadButton = () => screen.getByRole('button', { name: 'Download PDF' });

describe('ToolingQrLabelsDialog', () => {
  beforeEach(() => {
    downloadLabels.mockReset();
    loggerError.mockReset();
    toastMock.success.mockReset();
    toastMock.error.mockReset();
  });

  it('pre-selects every tool and supports select none / select all', async () => {
    const user = userEvent.setup();
    renderDialog();

    expect(screen.getByRole('dialog', { name: 'Print QR labels' })).toBeInTheDocument();
    expect(screen.getByText('3 of 3 selected')).toBeInTheDocument();
    for (const name of ['Weld jig A', 'Press die B', 'Mold C']) {
      expect(screen.getByRole('checkbox', { name: new RegExp(name) })).toBeChecked();
    }
    expect(screen.getByRole('button', { name: 'Select all' })).toBeDisabled();
    expect(downloadButton()).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Select none' }));
    expect(screen.getByText('0 of 3 selected')).toBeInTheDocument();
    const list = screen.getByTestId('tooling-label-tool-list');
    within(list)
      .getAllByRole('checkbox')
      .forEach((checkbox) => expect(checkbox).not.toBeChecked());
    expect(downloadButton()).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Select all' }));
    expect(screen.getByText('3 of 3 selected')).toBeInTheDocument();
    expect(downloadButton()).toBeEnabled();
  });

  it('disables download when the last selected tool is unchecked', async () => {
    const user = userEvent.setup();
    renderDialog([TOOLS[0]]);

    await user.click(screen.getByRole('checkbox', { name: /Weld jig A/ }));
    expect(screen.getByText('0 of 1 selected')).toBeInTheDocument();
    expect(downloadButton()).toBeDisabled();
    await user.click(downloadButton());
    expect(downloadLabels).not.toHaveBeenCalled();
  });

  it('filters by search and only toggles the visible tools', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByRole('searchbox', { name: 'Search tools to label' }), 'rack');
    const list = screen.getByTestId('tooling-label-tool-list');
    expect(within(list).getAllByRole('checkbox')).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Select none' }));
    expect(screen.getByText('2 of 3 selected')).toBeInTheDocument();

    await user.clear(screen.getByRole('searchbox', { name: 'Search tools to label' }));
    await user.type(screen.getByRole('searchbox', { name: 'Search tools to label' }), 'nothing-matches');
    expect(screen.getByText('No tools match your search.')).toBeInTheDocument();
  });

  it('shows an empty state without tools', () => {
    renderDialog([]);
    expect(screen.getByText('There are no tools to label.')).toBeInTheDocument();
    expect(downloadButton()).toBeDisabled();
  });

  it('generates the selected labels with the chosen size and fields, showing progress', async () => {
    let finish: (count: number) => void = () => undefined;
    downloadLabels.mockImplementation((_tools: ToolingOverview[], options: ToolingQrLabelOptions) => {
      options.onProgress?.(1, 2);
      return new Promise<number>((resolve) => {
        finish = resolve;
      });
    });
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await user.click(screen.getByRole('checkbox', { name: /Press die B/ }));
    await user.click(screen.getByRole('radio', { name: /Large/ }));
    await user.click(screen.getByRole('checkbox', { name: 'Storage location' }));
    await user.click(downloadButton());

    expect(downloadLabels).toHaveBeenCalledTimes(1);
    const [tools, options] = downloadLabels.mock.calls[0] as [ToolingOverview[], ToolingQrLabelOptions];
    expect(tools.map((tool) => tool.id)).toEqual(['1', '3']);
    expect(options.size).toBe('large');
    expect(options.fields).toEqual({ name: true, managementCode: true, type: true, storageLocation: true });

    expect(await screen.findByText('Generated 1 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generating labels/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();

    finish(2);
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Labels downloaded: 2'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows a font-specific error when the PDF font cannot load', async () => {
    downloadLabels.mockRejectedValue(new ToolingPdfFontError());
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await user.click(downloadButton());

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith('Could not load the PDF font. Check your connection and try again.'),
    );
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(downloadButton()).toBeEnabled();
    expect(loggerError).toHaveBeenCalledWith('Tooling QR label generation failed', expect.any(ToolingPdfFontError));
  });

  it('shows a generic error for other failures', async () => {
    downloadLabels.mockRejectedValue(new Error('boom'));
    const user = userEvent.setup();
    renderDialog();

    await user.click(downloadButton());

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith('Could not generate the labels PDF. Please try again.'),
    );
  });
});
