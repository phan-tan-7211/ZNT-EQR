import { describe, expect, it } from 'vitest';
import {
  TOOLING_IMPORT_KINDS,
  buildTemplateRows,
  countImportDataRows,
  excelSerialToIsoDate,
  importFieldsFor,
  normalizeImportToken,
  parseImportRows,
  resolveImportEnum,
  resolveImportHeader,
  type ParsedImportRow,
  type ToolingImportKind,
  type ToolingImportPayloads,
  type ToolingImportLanguage,
} from '@/features/tooling/utils/toolingImportParser';
import {
  TOOLING_OPERATION_TYPES,
  TOOLING_OWNERSHIP_TYPES,
  TOOLING_TYPES,
  TOOLING_USAGE_UNITS,
} from '@/features/tooling/types';
import { toolingImportResources } from '@/i18n/toolingImportResources';
import { toolingResources } from '@/i18n/toolingResources';

const LANGUAGES: ToolingImportLanguage[] = ['en', 'vi', 'ko'];

function payloadsOf<K extends ToolingImportKind>(kind: K, rows: ParsedImportRow[]): ToolingImportPayloads[K][] {
  return rows.filter((row) => row.kind === kind).map((row) => row.payload as ToolingImportPayloads[K]);
}

function toolPayload(row: Record<string, unknown>, context = {}) {
  const result = parseImportRows('tools', [row], context);
  return { result, payload: payloadsOf('tools', result.valid)[0] };
}

describe('normalizeImportToken', () => {
  it('ignores case, diacritics (incl. đ), spacing and punctuation but keeps Hangul', () => {
    expect(normalizeImportToken('  Tên Dụng Cụ * ')).toBe('tendungcu');
    expect(normalizeImportToken('Đơn vị sử dụng')).toBe('donvisudung');
    expect(normalizeImportToken('Serial_Number')).toBe('serialnumber');
    expect(normalizeImportToken('점검 주기(일)')).toBe('점검주기일');
  });
});

describe('header aliases', () => {
  it('accepts canonical keys, English labels, Vietnamese labels with or without diacritics and Korean labels', () => {
    expect(resolveImportHeader('tools', 'serial_number')).toBe('serial_number');
    expect(resolveImportHeader('tools', 'Serial number')).toBe('serial_number');
    expect(resolveImportHeader('tools', 'SỐ SÊ-RI')).toBe('serial_number');
    expect(resolveImportHeader('tools', 'so se ri')).toBe('serial_number');
    expect(resolveImportHeader('tools', '일련번호')).toBe('serial_number');
    expect(resolveImportHeader('tools', 'Tên dụng cụ *')).toBe('name');
    expect(resolveImportHeader('products', '품번')).toBe('part_number');
    expect(resolveImportHeader('products', 'Mã chi tiết')).toBe('part_number');
    expect(resolveImportHeader('operations', 'Loai cong doan')).toBe('operation_type');
    expect(resolveImportHeader('operations', '공정 유형')).toBe('operation_type');
    expect(resolveImportHeader('tools', 'Unrelated header')).toBeNull();
  });

  it.each(TOOLING_IMPORT_KINDS)('maps every localized %s template label back to its own column', (kind) => {
    for (const language of LANGUAGES) {
      const labels: Readonly<Record<string, string>> = toolingImportResources[language].toolingImport.columns[kind];
      for (const field of importFieldsFor(kind)) {
        expect({ language, field, resolved: resolveImportHeader(kind, labels[field]) }).toEqual({
          language,
          field,
          resolved: field,
        });
      }
    }
  });
});

describe('enum values', () => {
  const cases = [
    ['toolingType', TOOLING_TYPES, (language: ToolingImportLanguage) => toolingResources[language].tooling.types],
    ['ownership', TOOLING_OWNERSHIP_TYPES, (language: ToolingImportLanguage) => toolingResources[language].tooling.ownership],
    ['usageUnit', TOOLING_USAGE_UNITS, (language: ToolingImportLanguage) => toolingResources[language].tooling.unitLabels],
    [
      'operationType',
      TOOLING_OPERATION_TYPES,
      (language: ToolingImportLanguage) => toolingResources[language].tooling.operationTypes,
    ],
  ] as const;

  it.each(cases)('resolves every %s key and localized label to its own key', (name, values, labels) => {
    for (const value of values) {
      expect(resolveImportEnum(name, value)).toBe(value);
      for (const language of LANGUAGES) {
        const table: Readonly<Record<string, string>> = labels(language);
        expect({ language, value, resolved: resolveImportEnum(name, table[value]) }).toEqual({
          language,
          value,
          resolved: value,
        });
      }
    }
  });

  it('accepts label fragments, unit synonyms and key spelling variants', () => {
    expect(resolveImportEnum('toolingType', 'đồ gá')).toBe('fixture');
    expect(resolveImportEnum('toolingType', 'Checking fixture')).toBe('checking_fixture');
    expect(resolveImportEnum('toolingType', '검사구')).toBe('checking_fixture');
    expect(resolveImportEnum('usageUnit', 'shot')).toBe('shots');
    expect(resolveImportEnum('usageUnit', 'lần ép')).toBe('shots');
    expect(resolveImportEnum('usageUnit', '개')).toBe('pieces');
    expect(resolveImportEnum('operationType', 'Hàn')).toBe('welding');
    expect(resolveImportEnum('operationType', 'teleport')).toBeNull();
  });

  it('maps localized enum cells into the payload and reports unknown values', () => {
    const { payload } = toolPayload({
      'Tên dụng cụ': 'Khuôn A',
      'Loại dụng cụ': 'Khuôn',
      'Sở hữu': 'Khách hàng',
      'Đơn vị sử dụng': 'Lần ép (shot)',
    });
    expect(payload).toMatchObject({ tooling_type: 'mold', ownership_type: 'customer', usage_unit: 'shots' });

    const { result } = toolPayload({ name: 'Jig', tooling_type: 'spaceship' });
    expect(result.valid).toHaveLength(0);
    expect(result.errors).toEqual([{ rowNumber: 2, field: 'tooling_type', code: 'invalidEnum', value: 'spaceship' }]);
  });
});

describe('tools rows', () => {
  it('applies defaults and omits empty optional fields', () => {
    const { payload } = toolPayload({ name: '  Weld jig  ', serial_number: '' });
    expect(payload).toEqual({
      name: 'Weld jig',
      tooling_type: 'jig',
      ownership_type: 'company',
      requires_machine: true,
      usage_unit: 'cycles',
    });
  });

  it('builds the full create_tooling payload', () => {
    const { payload } = toolPayload(
      {
        name: 'Weld jig',
        tooling_type: 'fixture',
        design_code: 'wj-std',
        manufacturer: 'ACME',
        model: 'WJ-200',
        serial_number: 12345,
        team_name: 'welding LINE 1',
        storage_location: 'Rack A-01',
        responsible_email: 'Op@Example.com',
        ownership_type: 'supplier',
        owner_name: 'Supplier Co',
        requires_machine: 'no',
        usage_unit: 'strokes',
        warning_limit: '80,000',
        life_limit: 100000,
        maintenance_interval: '10000',
        inspection_interval_days: '90',
        drawing_number: 'DWG-1',
        drawing_revision: 'B',
        revision_effective_date: 46037,
        notes: 'Imported',
      },
      {
        teams: [{ id: 'team-1', name: 'Welding line 1' }],
        members: [{ id: 'user-1', email: 'op@example.com' }],
        designs: [{ id: 'design-1', design_code: 'WJ-STD', tooling_type: 'jig', is_active: true }],
      },
    );
    expect(payload).toEqual({
      name: 'Weld jig',
      manufacturer: 'ACME',
      model: 'WJ-200',
      serial_number: '12345',
      team_id: 'team-1',
      tooling_type: 'fixture',
      design_id: 'design-1',
      ownership_type: 'supplier',
      owner_name: 'Supplier Co',
      storage_location: 'Rack A-01',
      responsible_user_id: 'user-1',
      requires_machine: false,
      drawing_number: 'DWG-1',
      drawing_revision: 'B',
      revision_effective_date: '2026-01-15',
      usage_unit: 'strokes',
      warning_limit: 80000,
      life_limit: 100000,
      maintenance_interval: 10000,
      inspection_interval_days: 90,
      notes: 'Imported',
    });
  });

  it('requires a tool name', () => {
    const result = parseImportRows('tools', [{ name: '', model: 'X' }]);
    expect(result.valid).toHaveLength(0);
    expect(result.errors).toEqual([{ rowNumber: 2, field: 'name', code: 'required' }]);
  });

  it('validates positive numbers, whole inspection days and warning ≤ life', () => {
    const result = parseImportRows('tools', [
      { name: 'A', warning_limit: 'abc', life_limit: '0', inspection_interval_days: '1.5' },
      { name: 'B', maintenance_interval: '-5', inspection_interval_days: 0 },
      { name: 'C', warning_limit: '1200', life_limit: '1000' },
      { name: 'D', warning_limit: '1000', life_limit: '1000' },
    ]);
    expect(result.errors).toEqual([
      { rowNumber: 2, field: 'warning_limit', code: 'invalidNumber', value: 'abc' },
      { rowNumber: 2, field: 'life_limit', code: 'notPositive', value: '0' },
      { rowNumber: 2, field: 'inspection_interval_days', code: 'notInteger', value: '1.5' },
      { rowNumber: 3, field: 'maintenance_interval', code: 'notPositive', value: '-5' },
      { rowNumber: 3, field: 'inspection_interval_days', code: 'notPositive', value: '0' },
      { rowNumber: 4, field: 'warning_limit', code: 'warningExceedsLife', value: '1200' },
    ]);
    expect(result.valid.map((row) => row.label)).toEqual(['D']);
  });

  it('parses ISO dates and Excel serials and rejects impossible or ambiguous dates', () => {
    const dates = ['2026-01-15', '2026/1/5', '2026.03.07', 45000, '45000', '2026-02-30', '15/01/2026'];
    const result = parseImportRows(
      'tools',
      dates.map((value, index) => ({ name: `Tool ${index}`, revision_effective_date: value })),
    );
    expect(payloadsOf('tools', result.valid).map((payload) => payload.revision_effective_date)).toEqual([
      '2026-01-15',
      '2026-01-05',
      '2026-03-07',
      '2023-03-15',
      '2023-03-15',
    ]);
    expect(result.errors).toEqual([
      { rowNumber: 7, field: 'revision_effective_date', code: 'invalidDate', value: '2026-02-30' },
      { rowNumber: 8, field: 'revision_effective_date', code: 'invalidDate', value: '15/01/2026' },
    ]);
  });

  it('accepts yes/no in English, Vietnamese and Korean, numeric and native booleans', () => {
    const values = ['yes', 'No', 'TRUE', 'false', '1', '0', 'Có', 'không', '예', '아니요', true, 0];
    const result = parseImportRows(
      'tools',
      values.map((value, index) => ({ name: `Tool ${index}`, requires_machine: value })),
    );
    expect(payloadsOf('tools', result.valid).map((payload) => payload.requires_machine)).toEqual([
      true,
      false,
      true,
      false,
      true,
      false,
      true,
      false,
      true,
      false,
      true,
      false,
    ]);

    const invalid = parseImportRows('tools', [{ name: 'X', requires_machine: 'maybe' }]);
    expect(invalid.errors).toEqual([{ rowNumber: 2, field: 'requires_machine', code: 'invalidBoolean', value: 'maybe' }]);
  });

  it('resolves team, responsible member and design, reporting misses and ambiguity', () => {
    const context = {
      teams: [
        { id: 'team-1', name: 'Press' },
        { id: 'team-2', name: 'Paint' },
        { id: 'team-3', name: 'paint ' },
      ],
      members: [{ id: 'user-1', email: 'lead@example.com' }],
      designs: [
        { id: 'design-1', design_code: 'MOLD-01', tooling_type: 'mold' as const, is_active: true },
        { id: 'design-2', design_code: 'OLD-01', tooling_type: 'die' as const, is_active: false },
      ],
    };
    const result = parseImportRows(
      'tools',
      [
        { name: 'A', team_name: 'press', responsible_email: 'LEAD@example.com', design_code: 'mold-01' },
        { name: 'B', team_name: 'Weld' },
        { name: 'C', team_name: 'Paint' },
        { name: 'D', responsible_email: 'ghost@example.com' },
        { name: 'E', design_code: 'OLD-01' },
        { name: 'F', design_code: 'NOPE' },
      ],
      context,
    );
    expect(payloadsOf('tools', result.valid)).toEqual([
      expect.objectContaining({
        name: 'A',
        team_id: 'team-1',
        responsible_user_id: 'user-1',
        design_id: 'design-1',
        // Blank tooling type inherits the design's type.
        tooling_type: 'mold',
      }),
    ]);
    expect(result.errors).toEqual([
      { rowNumber: 3, field: 'team_name', code: 'teamNotFound', value: 'Weld' },
      { rowNumber: 4, field: 'team_name', code: 'teamAmbiguous', value: 'Paint' },
      { rowNumber: 5, field: 'responsible_email', code: 'memberNotFound', value: 'ghost@example.com' },
      { rowNumber: 6, field: 'design_code', code: 'designNotFound', value: 'OLD-01' },
      { rowNumber: 7, field: 'design_code', code: 'designNotFound', value: 'NOPE' },
    ]);
  });

  it('flags duplicate name + serial inside the file and against existing tools', () => {
    const result = parseImportRows(
      'tools',
      [
        { name: 'Weld jig', serial_number: 'S1' },
        { name: 'weld  JIG', serial_number: 's1' },
        { name: 'Weld jig', serial_number: 'S2' },
        { name: 'Press die', serial_number: '' },
      ],
      { existingTools: [{ name: 'Press Die', serial_number: null }] },
    );
    expect(result.valid.map((row) => row.rowNumber)).toEqual([2, 4]);
    expect(result.errors).toEqual([
      { rowNumber: 3, field: 'name', code: 'duplicateInFile', value: 'weld  JIG (s1)', duplicateOfRow: 2 },
      { rowNumber: 5, field: 'name', code: 'duplicateExisting', value: 'Press die' },
    ]);
  });
});

describe('product part rows', () => {
  it('normalizes part numbers and flags duplicates in the file and against existing parts', () => {
    const result = parseImportRows(
      'products',
      [
        { 'Part number': ' p-100 ', 'Part name': 'Bracket', Customer: 'ACME', Active: 'no' },
        { 'Part number': 'P-100', 'Part name': 'Bracket copy' },
        { 'Part number': 'p-200', 'Part name': 'Existing' },
        { 'Part number': '', 'Part name': '', Revision: 'C' },
        { 'Part number': 'P-300' },
      ],
      { existingPartNumbers: ['P-200'] },
    );
    expect(payloadsOf('products', result.valid)).toEqual([
      { part_number: 'P-100', name: 'Bracket', customer_name: 'ACME', is_active: false },
    ]);
    expect(result.errors).toEqual([
      { rowNumber: 3, field: 'part_number', code: 'duplicateInFile', value: 'P-100', duplicateOfRow: 2 },
      { rowNumber: 4, field: 'part_number', code: 'duplicateExisting', value: 'P-200' },
      { rowNumber: 5, field: 'part_number', code: 'required' },
      { rowNumber: 5, field: 'name', code: 'required' },
      { rowNumber: 6, field: 'name', code: 'required' },
    ]);
    expect(result.rows.map((row) => row.label)).toEqual([
      'P-100 — Bracket',
      'P-100 — Bracket copy',
      'P-200 — Existing',
      '',
      'P-300',
    ]);
  });
});

describe('production operation rows', () => {
  it('requires code, name and operation type and flags existing codes', () => {
    const result = parseImportRows(
      'operations',
      [
        { 'Mã công đoạn': 'op-10', 'Tên công đoạn': 'Hàn điểm', 'Loại công đoạn': 'Hàn' },
        { '공정 코드': 'OP-20', 공정명: '프레스', '공정 유형': '' },
        { code: 'op-30', name: 'Paint', operation_type: 'painting' },
      ],
      { existingOperationCodes: ['OP-30'] },
    );
    expect(payloadsOf('operations', result.valid)).toEqual([
      { code: 'OP-10', name: 'Hàn điểm', operation_type: 'welding' },
    ]);
    expect(result.errors).toEqual([
      { rowNumber: 3, field: 'operation_type', code: 'required' },
      { rowNumber: 4, field: 'code', code: 'duplicateExisting', value: 'OP-30' },
    ]);
  });
});

describe('file-level analysis', () => {
  it('skips blank rows, uses SheetJS row numbers and reports unknown and missing columns', () => {
    const first = { 'Part name': 'Bracket', Colour: 'red', __EMPTY: '' };
    const blank = { 'Part name': '', Colour: '  ', __EMPTY: '' };
    const second = { 'Part name': 'Cover', Colour: '', __EMPTY: '' };
    Object.defineProperty(first, '__rowNum__', { value: 4, enumerable: false });
    Object.defineProperty(second, '__rowNum__', { value: 9, enumerable: false });

    const rows = [first, blank, second];
    expect(countImportDataRows(rows)).toBe(2);

    const result = parseImportRows('products', rows);
    expect(result.rows.map((row) => row.rowNumber)).toEqual([5, 10]);
    expect(result.recognizedColumns).toEqual(['name']);
    expect(result.missingColumns).toEqual(['part_number']);
    expect(result.unknownHeaders).toEqual(['Colour']);
    expect(result.valid).toHaveLength(0);
  });
});

describe('excelSerialToIsoDate', () => {
  it('handles the 1900 leap-year bug and out-of-range serials', () => {
    expect(excelSerialToIsoDate(1)).toBe('1900-01-01');
    expect(excelSerialToIsoDate(59)).toBe('1900-02-28');
    expect(excelSerialToIsoDate(60)).toBeNull();
    expect(excelSerialToIsoDate(61)).toBe('1900-03-01');
    expect(excelSerialToIsoDate(45000.75)).toBe('2023-03-15');
    expect(excelSerialToIsoDate(0)).toBeNull();
    expect(excelSerialToIsoDate(3_000_000)).toBeNull();
  });
});

describe('buildTemplateRows', () => {
  it.each(LANGUAGES)('builds a %s data sheet whose headers import cleanly, plus a guide sheet', (language) => {
    for (const kind of TOOLING_IMPORT_KINDS) {
      const [data, guide] = buildTemplateRows(kind, language);
      const headers = data.rows[0];
      expect(data.rows).toHaveLength(1);
      expect(headers).toHaveLength(importFieldsFor(kind).length);
      expect(headers.map((header) => resolveImportHeader(kind, header))).toEqual(importFieldsFor(kind));
      // Guide: header row + one row per column; the example values form a valid row.
      expect(guide.rows).toHaveLength(headers.length + 1);
      const exampleRow = Object.fromEntries(guide.rows.slice(1).map((row) => [row[0], row[3]]));
      const context = {
        teams: [{ id: 'team-1', name: toolingImportResources[language].toolingImport.examples.teamName }],
        members: [{ id: 'user-1', email: 'operator@example.com' }],
        designs: [{ id: 'design-1', design_code: 'WJ-STD', tooling_type: 'jig' as const, is_active: true }],
      };
      const result = parseImportRows(kind, [exampleRow], context);
      expect({ kind, errors: result.errors }).toEqual({ kind, errors: [] });
      expect(result.valid).toHaveLength(1);
    }
  });

  it('marks required columns and lists localized enum values with defaults', () => {
    const [data, guide] = buildTemplateRows('operations', 'ko');
    expect(data.name).toBe('데이터');
    expect(guide.name).toBe('안내');
    expect(data.rows[0]).toEqual(['공정 코드 *', '공정명 *', '공정 유형 *', '설명', '사용 여부']);
    const typeRow = guide.rows.find((row) => row[0] === '공정 유형 *');
    expect(typeRow?.[1]).toBe('예');
    expect(typeRow?.[2]).toContain('용접, 프레스, 조립');

    const [, toolGuide] = buildTemplateRows('tools', 'en');
    const unitRow = toolGuide.rows.find((row) => row[0] === 'Usage unit');
    expect(unitRow?.[2]).toBe('One of: Cycles, Shots, Strokes, Pieces. Default when empty: Cycles');
  });
});

describe('toolingImportResources parity', () => {
  function flatten(tree: unknown, prefix = ''): Map<string, string> {
    const out = new Map<string, string>();
    if (!tree || typeof tree !== 'object') return out;
    for (const [key, value] of Object.entries(tree)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'string') out.set(path, value);
      else for (const [nested, nestedValue] of flatten(value, path)) out.set(nested, nestedValue);
    }
    return out;
  }
  const tokens = (value: string) => [...value.matchAll(/{{\s*([^}\s]+)\s*}}/g)].map((match) => match[1]).sort();
  const english = flatten(toolingImportResources.en);

  it.each(['vi', 'ko'] as const)('%s has the English keys and {{token}} placeholders', (language) => {
    const localized = flatten(toolingImportResources[language]);
    expect([...localized.keys()].sort()).toEqual([...english.keys()].sort());
    const mismatched = [...english].filter(
      ([key, value]) => tokens(value).join(',') !== tokens(localized.get(key) ?? '').join(','),
    );
    expect(mismatched).toEqual([]);
    expect([...localized.values()].filter((value) => value.trim() === '')).toEqual([]);
  });
});
