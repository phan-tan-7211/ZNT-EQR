import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ToolingAssignment,
  ToolingEvent,
  ToolingOverview,
  ToolingUsageLog,
  ToolingVerification,
} from '@/features/tooling/types';
import { toolingReportsResources } from '@/i18n/toolingReportsResources';
import { toolingResources } from '@/i18n/toolingResources';
import {
  buildCustomerOwnedRows,
  buildToolingHistorySections,
  buildToolingLabelLines,
  buildToolingRegisterRows,
  computeToolingLabelGrid,
  DEFAULT_TOOLING_LABEL_FIELDS,
  downloadCustomerOwnedReport,
  downloadToolingHistory,
  downloadToolingQrLabels,
  downloadToolingRegister,
  TOOLING_CSV_BOM,
  toolingFilenamePart,
  toolingHistoryToCsv,
  toolingLabelPosition,
  ToolingPdfFontError,
  toolingSheetName,
  toolingTableToCsv,
  type ToolingHistoryData,
  type ToolingTranslate,
} from './toolingExportService';

const { downloadBlob } = vi.hoisted(() => ({ downloadBlob: vi.fn() }));

vi.mock('@/utils/exportUtils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/exportUtils')>()),
  downloadBlob,
}));

vi.mock('@/utils/qr', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/qr')>()),
  qrFullUrl: (path: string) => `https://eqr.example.test${path}`,
}));

type Language = 'en' | 'vi' | 'ko';

const RESOURCES: Record<Language, object> = {
  en: { ...toolingResources.en, ...toolingReportsResources.en },
  vi: { ...toolingResources.vi, ...toolingReportsResources.vi },
  ko: { ...toolingResources.ko, ...toolingReportsResources.ko },
};

function createT(language: Language = 'en'): ToolingTranslate {
  return (key, params) => {
    const value = key.split('.').reduce<unknown>((node, segment) => {
      if (!node || typeof node !== 'object') return undefined;
      return (node as Record<string, unknown>)[segment];
    }, RESOURCES[language]);
    const text = typeof value === 'string' ? value : key;
    return text.replace(/{{\s*([^}\s]+)\s*}}/g, (match, token: string) =>
      params?.[token] === undefined ? match : String(params[token]),
    );
  };
}

const t = createT('en');

function makeTool(overrides: Partial<ToolingOverview> = {}): ToolingOverview {
  return {
    id: 'tool-1',
    organization_id: 'org-1',
    name: 'Weld jig A',
    management_code: 'TL-001',
    manufacturer: 'Acme',
    model: 'WJ',
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
    storage_location: 'Rack 4',
    responsible_user_id: null,
    responsible_name: null,
    condition: 'good',
    usability_state: 'available',
    approval_status: 'approved',
    approved_by: null,
    approved_at: null,
    requires_machine: false,
    drawing_number: 'DWG-100',
    drawing_revision: 'B',
    revision_effective_date: null,
    usage_unit: 'cycles',
    warning_limit: 800,
    life_limit: 1000,
    maintenance_interval: null,
    inspection_interval_days: null,
    cumulative_usage: 250,
    usage_since_maintenance: 0,
    last_maintenance_at: null,
    last_inspection_at: null,
    next_inspection_due: '2026-11-01',
    notes: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    remaining_life: 750,
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

function makeHistory(): ToolingHistoryData {
  const assignment: ToolingAssignment = {
    id: 'as-1',
    organization_id: 'org-1',
    tooling_equipment_id: 'tool-1',
    status: 'returned',
    issued_to_user_id: 'u-1',
    issued_to_name: 'Nguyễn Văn An',
    issued_by: 'u-2',
    issued_by_name: 'Kim Min-jun',
    issued_at: '2026-10-01T08:00:00.000Z',
    machine_equipment_id: 'm-1',
    product_part_id: 'p-1',
    operation_id: 'op-1',
    compatibility_id: null,
    issue_location: 'Line 2',
    condition_at_issue: 'good',
    notes: null,
    returned_at: '2026-10-02T17:00:00.000Z',
    returned_by: 'u-2',
    returned_by_name: 'Kim Min-jun',
    return_location: 'Rack 4',
    condition_at_return: 'worn',
    usage_at_return: 120,
    return_notes: 'Burr on, "clamp"',
    machine: { id: 'm-1', name: 'Press 7', management_code: 'MC-7' },
    product_part: { id: 'p-1', part_number: 'PN-55', name: 'Bracket' },
    operation: { id: 'op-1', code: 'OP10', name: 'Weld' },
  };
  const usage: ToolingUsageLog = {
    id: 'us-1',
    tooling_equipment_id: 'tool-1',
    entry_type: 'correction',
    quantity: -5,
    usage_unit: 'cycles',
    production_quantity: null,
    assignment_id: null,
    cumulative_after: 245,
    reason: '=HYPERLINK("evil")',
    recorded_by: 'u-2',
    recorded_by_name: 'Kim Min-jun',
    recorded_at: '2026-10-03T09:00:00.000Z',
  };
  const verification: ToolingVerification = {
    id: 've-1',
    tooling_equipment_id: 'tool-1',
    verification_type: 'periodic',
    result: 'pass',
    findings: null,
    work_order_id: null,
    maintenance_completed: true,
    returned_to_service: false,
    usability_before: 'pending_inspection',
    usability_after: 'available',
    cumulative_usage_at: 245,
    next_due: '2027-01-01',
    inspected_by: 'u-3',
    inspected_by_name: 'QA',
    inspected_at: '2026-10-04T10:00:00.000Z',
    approved_by: null,
    approved_by_name: null,
    approved_at: null,
  };
  const event: ToolingEvent = {
    id: 'ev-1',
    tooling_equipment_id: 'tool-1',
    event_type: 'usability_changed',
    from_value: 'available',
    to_value: 'quarantined',
    assignment_id: null,
    reason: 'Crack found',
    details: {},
    actor_id: null,
    actor_name: null,
    created_at: '2026-10-05T11:00:00.000Z',
  };
  return { assignments: [assignment], usage: [usage], verifications: [verification], events: [event] };
}

function parseCsv(csv: string): string[][] {
  return Papa.parse<string[]>(csv.replace(/^\uFEFF/, ''), { skipEmptyLines: false }).data;
}

async function lastBlob(): Promise<{ blob: Blob; filename: string; bytes: Uint8Array }> {
  const [blob, filename] = downloadBlob.mock.lastCall as [Blob, string];
  const bytes = new Uint8Array(await blob.arrayBuffer());
  // Set PDF_VERIFY_OUTPUT=/some/dir/prefix to inspect generated files manually.
  if (process.env.PDF_VERIFY_OUTPUT) writeFileSync(`${process.env.PDF_VERIFY_OUTPUT}-${filename}`, bytes);
  return { blob, filename, bytes };
}

function mockFontFetch() {
  const font = readFileSync(
    fileURLToPath(new URL('../../operator-check-ins/assets/ZNTEQR-Report-KR-VI.ttf', import.meta.url)),
  );
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    arrayBuffer: async () => font.buffer.slice(font.byteOffset, font.byteOffset + font.byteLength),
  } as Response);
}

beforeEach(() => {
  downloadBlob.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('buildToolingRegisterRows', () => {
  it('builds a localized header and one row per tool in the given order', () => {
    const table = buildToolingRegisterRows([makeTool(), makeTool({ id: 'tool-2', name: 'Mold B' })], t);

    expect(table.header).toEqual([
      'Management code', 'Tool name', 'Type', 'Ownership', 'Owner', 'Storage location', 'Current holder',
      'Usability', 'Approval', 'Condition', 'Usage unit', 'Cumulative usage', 'Warning limit', 'Life limit',
      'Remaining life', '% of life used', 'Next inspection due', 'Drawing no.', 'Revision',
    ]);
    expect(table.rows.map((row) => row[1])).toEqual(['Weld jig A', 'Mold B']);
    expect(table.rows[0]).toEqual([
      'TL-001', 'Weld jig A', 'Jig', 'Company', null, 'Rack 4', null, 'Available', 'Approved', 'Good', 'Cycles',
      250, 800, 1000, 750, 25, '2026-11-01', 'DWG-100', 'B',
    ]);
  });

  it('coerces numeric strings, shows the holder only while issued, and leaves unlimited life empty', () => {
    const issued = makeTool({
      cumulative_usage: '1200' as unknown as number,
      life_limit: null,
      warning_limit: null,
      is_issued: true,
      issued_to_name: 'Lee',
      usability_state: 'quarantined',
      approval_status: 'pending',
    });
    const stale = makeTool({ is_issued: false, issued_to_name: 'Former holder' });
    const [issuedRow, staleRow] = buildToolingRegisterRows([issued, stale], t).rows;

    expect(issuedRow[6]).toBe('Lee');
    expect(issuedRow[7]).toBe('Quarantined');
    expect(issuedRow[8]).toBe('Pending approval');
    expect(issuedRow.slice(11, 16)).toEqual([1200, null, null, null, null]);
    expect(staleRow[6]).toBeNull();
  });

  it('localizes enum labels in Vietnamese and Korean', () => {
    const tool = makeTool({ tooling_type: 'mold', condition: 'damaged' });
    expect(buildToolingRegisterRows([tool], createT('vi')).rows[0].slice(2, 4)).toEqual(['Khuôn', 'Công ty']);
    const korean = buildToolingRegisterRows([tool], createT('ko'));
    expect(korean.header[0]).toBe('관리 번호');
    expect(korean.rows[0][2]).toBe('금형');
  });
});

describe('buildCustomerOwnedRows', () => {
  const tools = [
    makeTool({ id: 'c1', name: 'Zeta die', management_code: 'TL-010', ownership_type: 'customer', owner_name: 'Hyundai' }),
    makeTool({ id: 'own', name: 'Company jig', ownership_type: 'company', owner_name: 'Acme' }),
    makeTool({ id: 'c2', name: 'Alpha die', management_code: 'TL-002', ownership_type: 'customer', owner_name: 'acme corp' }),
    makeTool({ id: 'c3', name: 'Unnamed owner', management_code: 'TL-001', ownership_type: 'customer', owner_name: '  ' }),
    makeTool({ id: 'c4', name: 'Beta die', management_code: 'TL-9', ownership_type: 'customer', owner_name: 'ACME Corp' }),
    makeTool({ id: 'sup', name: 'Supplier mold', ownership_type: 'supplier', owner_name: 'Supplier' }),
  ];

  it('keeps only customer-owned tools, sorted by customer then code, unnamed customers last', () => {
    const report = buildCustomerOwnedRows(tools, t, 'en');

    expect(report.header.slice(0, 4)).toEqual(['Customer', 'Management code', 'Tool name', 'Type']);
    expect(report.rows.map((row) => [row[0], row[1]])).toEqual([
      ['acme corp', 'TL-002'],
      ['ACME Corp', 'TL-9'],
      ['Hyundai', 'TL-010'],
      ['Unspecified customer', 'TL-001'],
    ]);
  });

  it('groups case-insensitively by customer and drops the customer column inside groups', () => {
    const report = buildCustomerOwnedRows(tools, t, 'en');

    expect(report.groups.map((group) => [group.owner, group.rows.length])).toEqual([
      ['acme corp', 2],
      ['Hyundai', 1],
      ['Unspecified customer', 1],
    ]);
    expect(report.groups[0].rows[0].length).toBe(report.header.length - 1);
    expect(report.groups[0].rows[0].slice(0, 6)).toEqual(['TL-002', 'Alpha die', 'Jig', 'Good', 'Available', 'Rack 4']);
  });

  it('returns an empty report when nothing is customer-owned', () => {
    const report = buildCustomerOwnedRows([makeTool()], t);
    expect(report.rows).toEqual([]);
    expect(report.groups).toEqual([]);
  });
});

describe('CSV serialization', () => {
  it('prefixes a UTF-8 BOM and round-trips commas, quotes, newlines and vi/ko text', () => {
    const csv = toolingTableToCsv({
      header: ['Name', 'Notes', 'Qty'],
      rows: [
        ['Đồ gá hàn, số 1', 'Line "A"\nsecond line', 12],
        ['용접 지그', null, -3],
      ],
    });

    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.startsWith(TOOLING_CSV_BOM)).toBe(true);
    expect(csv).toContain('"Line ""A""\nsecond line"');
    expect(parseCsv(csv)).toEqual([
      ['Name', 'Notes', 'Qty'],
      ['Đồ gá hàn, số 1', 'Line "A"\nsecond line', '12'],
      ['용접 지그', '', '-3'],
    ]);
  });

  it('neutralizes spreadsheet formulas in text cells but not in numbers', () => {
    const csv = toolingTableToCsv({ header: ['A', 'B'], rows: [['=SUM(A1:A2)', -42], ['@cmd', 7]] });
    expect(parseCsv(csv).slice(1)).toEqual([
      ["'=SUM(A1:A2)", '-42'],
      ["'@cmd", '7'],
    ]);
  });

  it('exports the register as CSV through downloadBlob', async () => {
    await downloadToolingRegister([makeTool({ name: 'Jig, "special"' })], 'csv', t);
    const { blob, filename, bytes } = await lastBlob();

    expect(filename).toMatch(/^tooling-register-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(blob.type).toContain('text/csv');
    expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    const rows = parseCsv(new TextDecoder().decode(bytes));
    expect(rows[1][1]).toBe('Jig, "special"');
  });
});

describe('buildToolingHistorySections', () => {
  it('returns the four sections in order with localized values', () => {
    const sections = buildToolingHistorySections(makeHistory(), t, { formatDateTime: (value) => `@${value.slice(0, 10)}` });

    expect(sections.map((section) => [section.key, section.title])).toEqual([
      ['assignments', 'Issue and return'],
      ['usage', 'Usage log'],
      ['verifications', 'Inspections'],
      ['events', 'Events'],
    ]);

    const [assignments, usage, verifications, events] = sections;
    expect(assignments.header[0]).toBe('Issued at');
    expect(assignments.rows[0].slice(0, 9)).toEqual([
      '@2026-10-01', 'Returned', 'Nguyễn Văn An', 'Kim Min-jun', 'MC-7 — Press 7', 'PN-55 — Bracket', 'OP10 — Weld',
      'Line 2', 'Good',
    ]);
    expect(assignments.rows[0].slice(10, 15)).toEqual(['@2026-10-02', 'Kim Min-jun', 'Rack 4', 'Worn', 120]);

    expect(usage.rows[0]).toEqual(['@2026-10-03', 'Correction', -5, 'Cycles', null, 245, '=HYPERLINK("evil")', 'Kim Min-jun']);
    expect(verifications.rows[0].slice(0, 8)).toEqual([
      '@2026-10-04', 'Periodic inspection', 'Pass', null, 'Yes', 'No', 'Pending inspection', 'Available',
    ]);
    expect(events.rows[0]).toEqual(['@2026-10-05', 'Usability changed', 'Available', 'Quarantined', 'Crack found', 'System']);
  });

  it('defaults timestamps to ISO-8601 UTC and keeps empty sections', () => {
    const sections = buildToolingHistorySections({ ...makeHistory(), usage: [], verifications: [] }, t);
    expect(sections[0].rows[0][0]).toBe('2026-10-01T08:00:00.000Z');
    expect(sections[1].rows).toEqual([]);
    expect(sections[1].header.length).toBeGreaterThan(0);
  });

  it('combines sections into one CSV with a section column, a header per section and blank separators', () => {
    const csv = toolingHistoryToCsv(buildToolingHistorySections(makeHistory(), t), t);
    const rows = parseCsv(csv);

    expect(csv.startsWith(TOOLING_CSV_BOM)).toBe(true);
    expect(rows[0].slice(0, 2)).toEqual(['Section', 'Issued at']);
    expect(rows[1][0]).toBe('Issue and return');
    expect(rows[2]).toEqual(['']);
    expect(rows[3].slice(0, 2)).toEqual(['Section', 'Recorded at']);
    expect(rows[4][0]).toBe('Usage log');
    expect(rows[4][7]).toBe('\'=HYPERLINK("evil")');
    expect(rows.filter((row) => row[0] === 'Section')).toHaveLength(4);
  });
});

describe('workbook exports', () => {
  it('writes one sheet per history section with sanitized localized names', async () => {
    await downloadToolingHistory(makeTool({ management_code: 'TL/001' }), makeHistory(), 'xlsx', createT('vi'));
    const { filename, bytes } = await lastBlob();

    expect(filename).toMatch(/^tooling-history-TL-001-\d{4}-\d{2}-\d{2}\.xlsx$/);
    const workbook = XLSX.read(bytes, { type: 'array' });
    expect(workbook.SheetNames).toEqual(['Cấp phát và thu hồi', 'Nhật ký sử dụng', 'Kiểm tra', 'Sự kiện']);
    const usage = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets['Nhật ký sử dụng'], { header: 1 });
    expect(usage[1][2]).toBe(-5);
  });

  it('keeps numbers numeric in the register workbook', async () => {
    await downloadToolingRegister([makeTool()], 'xlsx', t, 'my-register');
    const { filename, bytes } = await lastBlob();

    expect(filename).toMatch(/^my-register-\d{4}-\d{2}-\d{2}\.xlsx$/);
    const workbook = XLSX.read(bytes, { type: 'array' });
    expect(workbook.SheetNames).toEqual(['Tooling register']);
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets['Tooling register'], { header: 1 });
    expect(rows[1].slice(11, 16)).toEqual([250, 800, 1000, 750, 25]);
  });
});

describe('helpers', () => {
  it('sanitizes and de-duplicates sheet names', () => {
    const used = new Set<string>();
    expect(toolingSheetName('Issue / Return: [A]', used)).toBe('Issue - Return- -A-');
    expect(toolingSheetName('x'.repeat(40), used)).toHaveLength(31);
    expect(toolingSheetName('Usage', used)).toBe('Usage');
    expect(toolingSheetName('usage', used)).toBe('usage (2)');
    expect(toolingSheetName('***', used)).toBe('---');
    expect(toolingSheetName('   ', used)).toBe('Sheet');
  });

  it('builds safe filename parts that keep Unicode letters', () => {
    expect(toolingFilenamePart('TL/001 #A')).toBe('TL-001-A');
    expect(toolingFilenamePart('용접 지그')).toBe('용접-지그');
    expect(toolingFilenamePart('  ')).toBe('tool');
    expect(toolingFilenamePart(null, 'x')).toBe('x');
  });
});

describe('QR label layout', () => {
  it.each([
    ['small', 4, 9, 36],
    ['medium', 2, 7, 14],
    ['large', 2, 5, 10],
  ] as const)('fits %s labels on an A4 page', (size, columns, rows, perPage) => {
    const grid = computeToolingLabelGrid(size);
    expect([grid.columns, grid.rows, grid.perPage]).toEqual([columns, rows, perPage]);
    expect(grid.offsetX * 2 + grid.columns * grid.labelWidth).toBeCloseTo(210);
    expect(grid.offsetX).toBeGreaterThanOrEqual(5);
    expect(grid.offsetY).toBeGreaterThanOrEqual(5);
  });

  it('positions labels row by row and wraps to the next page', () => {
    const grid = computeToolingLabelGrid('large');
    expect(toolingLabelPosition(grid, 0)).toEqual({ page: 0, x: grid.offsetX, y: grid.offsetY });
    expect(toolingLabelPosition(grid, 1)).toEqual({ page: 0, x: grid.offsetX + 100, y: grid.offsetY });
    expect(toolingLabelPosition(grid, 2)).toEqual({ page: 0, x: grid.offsetX, y: grid.offsetY + 50 });
    expect(toolingLabelPosition(grid, 10)).toEqual({ page: 1, x: grid.offsetX, y: grid.offsetY });
  });

  it('builds label lines from the selected fields', () => {
    const tool = makeTool();
    expect(buildToolingLabelLines(tool, DEFAULT_TOOLING_LABEL_FIELDS, t)).toEqual([
      { text: 'TL-001', emphasis: 'primary', maxLines: 1 },
      { text: 'Weld jig A', emphasis: 'secondary', maxLines: 2 },
      { text: 'Jig', emphasis: 'secondary', maxLines: 1 },
    ]);
    expect(
      buildToolingLabelLines(
        makeTool({ management_code: null }),
        { name: true, managementCode: true, type: false, storageLocation: true },
        createT('ko'),
      ),
    ).toEqual([
      { text: 'Weld jig A', emphasis: 'primary', maxLines: 2 },
      { text: '위치: Rack 4', emphasis: 'secondary', maxLines: 1 },
    ]);
    expect(buildToolingLabelLines(tool, { name: false, managementCode: false, type: false, storageLocation: false }, t)).toEqual(
      [],
    );
  });
});

describe('PDF exports (embedded Unicode font)', () => {
  it('writes a real register PDF with Vietnamese and Korean text', async () => {
    mockFontFetch();
    await downloadToolingRegister(
      [makeTool({ name: 'Đồ gá hàn số 1' }), makeTool({ id: 'tool-2', name: '용접 지그', owner_name: '현대' })],
      'pdf',
      createT('ko'),
      'tooling-register',
      { locale: 'ko', organizationName: 'ZNT Việt Nam' },
    );
    const { filename, bytes } = await lastBlob();

    expect(filename).toMatch(/\.pdf$/);
    expect(new TextDecoder().decode(bytes.slice(0, 8))).toContain('%PDF');
    expect(bytes.byteLength).toBeGreaterThan(10_000);
  });

  it('paginates long registers', async () => {
    mockFontFetch();
    const tools = Array.from({ length: 120 }, (_, index) =>
      makeTool({ id: `tool-${index}`, management_code: `TL-${index}`, name: `Đồ gá kiểm tra ${index}` }),
    );
    await downloadToolingRegister(tools, 'pdf', createT('vi'), 'long-register', { locale: 'vi' });
    const { bytes } = await lastBlob();
    const pages = new TextDecoder('latin1').decode(bytes).match(/\/Type \/Page\b/g) ?? [];
    expect(pages.length).toBeGreaterThan(2);
  });

  it('writes customer-owned and history PDFs', async () => {
    mockFontFetch();
    await downloadCustomerOwnedReport(
      [makeTool({ ownership_type: 'customer', owner_name: 'Hyundai' })],
      'pdf',
      createT('vi'),
    );
    expect((await lastBlob()).filename).toMatch(/^tooling-customer-owned-.*\.pdf$/);

    await downloadToolingHistory(makeTool(), makeHistory(), 'pdf', t, { locale: 'en' });
    const { filename, bytes } = await lastBlob();
    expect(filename).toMatch(/^tooling-history-TL-001-.*\.pdf$/);
    expect(new TextDecoder().decode(bytes.slice(0, 8))).toContain('%PDF');
  });

  it('generates a QR label sheet and reports progress', async () => {
    mockFontFetch();
    const onProgress = vi.fn();
    const tools = Array.from({ length: 11 }, (_, index) =>
      makeTool({ id: `tool-${index}`, name: index % 2 ? 'Khuôn dập số 2 rất dài để kiểm tra ngắt dòng' : '금형 A' }),
    );

    const count = await downloadToolingQrLabels(tools, { size: 'large', fields: DEFAULT_TOOLING_LABEL_FIELDS, onProgress }, t);

    expect(count).toBe(11);
    expect(onProgress).toHaveBeenCalledTimes(11);
    expect(onProgress).toHaveBeenLastCalledWith(11, 11);
    const { filename, bytes } = await lastBlob();
    expect(filename).toMatch(/^tooling-qr-labels-.*\.pdf$/);
    expect(new TextDecoder().decode(bytes.slice(0, 8))).toContain('%PDF');
  });

  it('starts a new page after a full sheet of small labels', async () => {
    mockFontFetch();
    const tools = Array.from({ length: 40 }, (_, index) =>
      makeTool({ id: `tool-${index}`, management_code: `TL-${index}`, name: '용접 지그 / Đồ gá hàn', storage_location: 'Kệ A-01' }),
    );
    await downloadToolingQrLabels(
      tools,
      { size: 'small', fields: { name: true, managementCode: true, type: true, storageLocation: true } },
      createT('vi'),
    );
    const { bytes } = await lastBlob();
    const pages = new TextDecoder('latin1').decode(bytes).match(/\/Type \/Page\b/g) ?? [];
    expect(pages).toHaveLength(2);
  });

  it('raises ToolingPdfFontError when the font cannot be loaded', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'));
    await expect(downloadToolingRegister([makeTool()], 'pdf', t)).rejects.toBeInstanceOf(ToolingPdfFontError);
    expect(downloadBlob).not.toHaveBeenCalled();
  });
});
