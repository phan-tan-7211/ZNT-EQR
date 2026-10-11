/**
 * Tooling bulk import — pure parsing and validation (no React, no i18n runtime).
 *
 * Rows come from `XLSX.utils.sheet_to_json` (header row → object keys). Headers
 * are matched case-, diacritic- and punctuation-insensitively against the
 * canonical keys, the localized template labels (en / vi / ko) and a few common
 * aliases. Enum cells accept the enum key or any localized label, so a template
 * downloaded in one language imports cleanly in another.
 *
 * Payloads match `create_tooling` (tools), `product_parts` and
 * `production_operations` inserts; see
 * supabase/migrations/20261011090000_tooling_management.sql.
 */
import {
  TOOLING_OPERATION_TYPES,
  TOOLING_OWNERSHIP_TYPES,
  TOOLING_TYPES,
  TOOLING_USAGE_UNITS,
  type CreateToolingInput,
  type ProductPartInput,
  type ProductionOperationInput,
  type ToolingOperationType,
  type ToolingOwnershipType,
  type ToolingType,
  type ToolingUsageUnit,
} from '@/features/tooling/types';
import { toolingImportResources } from '@/i18n/toolingImportResources';
import { toolingResources } from '@/i18n/toolingResources';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export const TOOLING_IMPORT_KINDS = ['tools', 'products', 'operations'] as const;
export type ToolingImportKind = (typeof TOOLING_IMPORT_KINDS)[number];

/** One import runs row-by-row RPCs; keep a file to a size an admin can review. */
export const TOOLING_IMPORT_MAX_ROWS = 1000;

export type ToolingImportLanguage = keyof typeof toolingImportResources;
const LANGUAGES: readonly ToolingImportLanguage[] = ['en', 'vi', 'ko'];

export const TOOL_IMPORT_FIELDS = [
  'name',
  'tooling_type',
  'design_code',
  'manufacturer',
  'model',
  'serial_number',
  'team_name',
  'storage_location',
  'responsible_email',
  'ownership_type',
  'owner_name',
  'requires_machine',
  'usage_unit',
  'warning_limit',
  'life_limit',
  'maintenance_interval',
  'inspection_interval_days',
  'drawing_number',
  'drawing_revision',
  'revision_effective_date',
  'notes',
] as const;
export const PRODUCT_IMPORT_FIELDS = ['part_number', 'name', 'customer_name', 'revision', 'description', 'is_active'] as const;
export const OPERATION_IMPORT_FIELDS = ['code', 'name', 'operation_type', 'description', 'is_active'] as const;

export type ToolImportField = (typeof TOOL_IMPORT_FIELDS)[number];
export type ProductImportField = (typeof PRODUCT_IMPORT_FIELDS)[number];
export type OperationImportField = (typeof OPERATION_IMPORT_FIELDS)[number];

export interface ToolingImportFieldsByKind {
  tools: ToolImportField;
  products: ProductImportField;
  operations: OperationImportField;
}
export type ToolingImportField = ToolingImportFieldsByKind[ToolingImportKind];

export type ToolingImportErrorCode =
  | 'required'
  | 'invalidEnum'
  | 'invalidNumber'
  | 'notPositive'
  | 'notInteger'
  | 'invalidDate'
  | 'invalidBoolean'
  | 'warningExceedsLife'
  | 'duplicateInFile'
  | 'duplicateExisting'
  | 'teamNotFound'
  | 'teamAmbiguous'
  | 'memberNotFound'
  | 'designNotFound';

export interface ToolingImportRowError {
  /** Spreadsheet row number (header = row 1). */
  rowNumber: number;
  field: ToolingImportField;
  code: ToolingImportErrorCode;
  /** Offending cell text, for messages. */
  value?: string;
  /** `duplicateInFile`: first row that used the same identity. */
  duplicateOfRow?: number;
}

export interface ToolingImportPayloads {
  tools: CreateToolingInput;
  products: ProductPartInput;
  operations: ProductionOperationInput;
}

/** A validated row, discriminated by `kind` so callers pick the right create call. */
export type ParsedImportRow = {
  [K in ToolingImportKind]: { kind: K; rowNumber: number; label: string; payload: ToolingImportPayloads[K] };
}[ToolingImportKind];

/** Every non-blank data row in file order, for previews. */
export interface ToolingImportRowSummary {
  rowNumber: number;
  label: string;
  errors: ToolingImportRowError[];
}

export interface ToolingImportParseResult {
  kind: ToolingImportKind;
  valid: ParsedImportRow[];
  errors: ToolingImportRowError[];
  rows: ToolingImportRowSummary[];
  /** Canonical fields found in the header row. */
  recognizedColumns: ToolingImportField[];
  /** Required fields whose column is absent from the header row. */
  missingColumns: ToolingImportField[];
  /** Header cells that matched no column (ignored). */
  unknownHeaders: string[];
}

export interface ToolingImportContext {
  /** Existing tools — a row duplicates one when name AND serial number match. */
  existingTools?: ReadonlyArray<{ name: string; serial_number: string | null }>;
  existingPartNumbers?: Iterable<string>;
  existingOperationCodes?: Iterable<string>;
  teams?: ReadonlyArray<{ id: string; name: string }>;
  /** Pass active members only; `id` is the user id stored as responsible_user_id. */
  members?: ReadonlyArray<{ id: string; email: string }>;
  designs?: ReadonlyArray<{ id: string; design_code: string; tooling_type?: ToolingType; is_active?: boolean }>;
}

export interface ToolingImportTemplateSheet {
  name: string;
  rows: string[][];
}

// ---------------------------------------------------------------------------
// Normalization helpers
// ---------------------------------------------------------------------------

/**
 * Lower-case, strip diacritics (incl. Vietnamese đ) and drop everything that is
 * not a letter or digit. Hangul is kept (NFD jamo are recomposed by NFC).
 */
export function normalizeImportToken(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

/** Case-insensitive, whitespace-collapsed key for user content (team names, tool names). */
function normalizeLookup(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizeCode(value: string): string {
  return value.trim().toUpperCase();
}

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

function isoFromParts(year: number, month: number, day: number): string | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (year < 1000 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

const DAY_MS = 86_400_000;
const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30);
const EXCEL_MAX_SERIAL = 2_958_465; // 9999-12-31

/** Excel 1900 date system serial → YYYY-MM-DD (time fraction ignored). */
export function excelSerialToIsoDate(serial: number): string | null {
  if (!Number.isFinite(serial)) return null;
  const whole = Math.floor(serial);
  // Serial 60 is Lotus' fictitious 1900-02-29; earlier serials are shifted by it.
  if (whole < 1 || whole > EXCEL_MAX_SERIAL || whole === 60) return null;
  const days = whole < 60 ? whole + 1 : whole;
  const date = new Date(EXCEL_EPOCH_UTC + days * DAY_MS);
  return isoFromParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

/** Plain-text view of a cell, trimmed. */
function cellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? ''
      : (isoFromParts(value.getFullYear(), value.getMonth() + 1, value.getDate()) ?? '');
  }
  return String(value).trim();
}

function isBlankCell(value: unknown): boolean {
  return cellText(value) === '';
}

/** True when every cell of a sheet row is empty (such rows are skipped). */
export function isBlankImportRow(row: Record<string, unknown>): boolean {
  return Object.values(row).every(isBlankCell);
}

/** Count of non-blank data rows, for the per-file row limit. */
export function countImportDataRows(rows: ReadonlyArray<Record<string, unknown>>): number {
  return rows.reduce((count, row) => (isBlankImportRow(row) ? count : count + 1), 0);
}

const THOUSANDS_PATTERN = /^[+-]?\d{1,3}(,\d{3})+(\.\d+)?$/;
const PLAIN_NUMBER_PATTERN = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;

function parseNumberCell(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const text = cellText(value).replace(/[\s\u00a0]/g, '');
  if (THOUSANDS_PATTERN.test(text)) return Number(text.replace(/,/g, ''));
  if (PLAIN_NUMBER_PATTERN.test(text)) return Number(text);
  return null;
}

const ISO_DATE_PATTERN = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s].*)?$/;
const SERIAL_PATTERN = /^\d+(\.\d+)?$/;

function parseDateCell(value: unknown): string | null {
  if (typeof value === 'number') return excelSerialToIsoDate(value);
  if (value instanceof Date) return cellText(value) || null;
  const text = cellText(value);
  const iso = ISO_DATE_PATTERN.exec(text);
  if (iso) return isoFromParts(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  if (SERIAL_PATTERN.test(text)) return excelSerialToIsoDate(Number(text));
  return null;
}

const TRUE_TOKENS = new Set(['yes', 'y', 'true', 't', '1', 'co', 'dung', '예', '네', '참', 'on']);
const FALSE_TOKENS = new Set(['no', 'n', 'false', 'f', '0', 'khong', 'sai', '아니요', '아니오', '거짓', 'off']);

function parseBooleanCell(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1 ? true : value === 0 ? false : null;
  const token = normalizeImportToken(cellText(value));
  if (TRUE_TOKENS.has(token)) return true;
  if (FALSE_TOKENS.has(token)) return false;
  return null;
}

/** Simple `{{token}}` interpolation for template copy (no i18n runtime here). */
function fill(template: string, params: Record<string, string>): string {
  return template.replace(/{{\s*([^}\s]+)\s*}}/g, (match, token: string) => params[token] ?? match);
}

function compact<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

// ---------------------------------------------------------------------------
// Enums (key or localized label)
// ---------------------------------------------------------------------------

type EnumName = 'toolingType' | 'ownership' | 'usageUnit' | 'operationType';
type LabelTable = Readonly<Record<string, string>>;

interface EnumDefinition {
  values: readonly string[];
  /** Primary display label per language (template guide). */
  labels: (language: ToolingImportLanguage) => LabelTable;
  /** Additional localized label tables that are also accepted. */
  extraLabels?: (language: ToolingImportLanguage) => LabelTable;
  /** Language-agnostic synonyms (singular units, spelling variants). */
  synonyms?: Readonly<Record<string, readonly string[]>>;
}

const ENUMS: Record<EnumName, EnumDefinition> = {
  toolingType: {
    values: TOOLING_TYPES,
    labels: (language) => toolingResources[language].tooling.types,
    synonyms: { mold: ['mould'], checking_fixture: ['checking jig', 'gauge'] },
  },
  ownership: {
    values: TOOLING_OWNERSHIP_TYPES,
    labels: (language) => toolingResources[language].tooling.ownership,
  },
  usageUnit: {
    values: TOOLING_USAGE_UNITS,
    labels: (language) => toolingResources[language].tooling.unitLabels,
    extraLabels: (language) => toolingResources[language].tooling.units,
    synonyms: { cycles: ['cycle'], shots: ['shot'], strokes: ['stroke'], pieces: ['piece', 'pcs', 'pc'] },
  },
  operationType: {
    values: TOOLING_OPERATION_TYPES,
    labels: (language) => toolingResources[language].tooling.operationTypes,
  },
};

/** "Fixture (đồ gá)" → ["Fixture (đồ gá)", "Fixture", "đồ gá"]. */
function labelVariants(label: string): string[] {
  const variants = [label];
  const match = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(label);
  if (match) variants.push(match[1], match[2]);
  return variants;
}

const enumAliasCache = new Map<EnumName, Map<string, string>>();

function enumAliasMap(name: EnumName): Map<string, string> {
  const cached = enumAliasCache.get(name);
  if (cached) return cached;
  const definition = ENUMS[name];
  const map = new Map<string, string>();
  const add = (alias: string, value: string) => {
    const token = normalizeImportToken(alias);
    if (token && !map.has(token)) map.set(token, value);
  };
  for (const value of definition.values) add(value, value);
  for (const language of LANGUAGES) {
    const tables = [definition.labels(language), definition.extraLabels?.(language)];
    for (const table of tables) {
      if (!table) continue;
      for (const value of definition.values) {
        const label = table[value];
        if (label) labelVariants(label).forEach((variant) => add(variant, value));
      }
    }
  }
  for (const [value, synonyms] of Object.entries(definition.synonyms ?? {})) {
    synonyms.forEach((synonym) => add(synonym, value));
  }
  enumAliasCache.set(name, map);
  return map;
}

/** Resolve an enum key or localized label to the enum key (null when unknown). */
export function resolveImportEnum(name: EnumName, value: string): string | null {
  return enumAliasMap(name).get(normalizeImportToken(value)) ?? null;
}

function enumDisplayLabel(name: EnumName, value: string, language: ToolingImportLanguage): string {
  return ENUMS[name].labels(language)[value] ?? value;
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

type ColumnType =
  | 'text'
  | 'code'
  | 'enum'
  | 'number'
  | 'integer'
  | 'date'
  | 'boolean'
  | 'team'
  | 'member'
  | 'design';

type FormatKey = keyof (typeof toolingImportResources)['en']['toolingImport']['formats'];

interface ImportColumn<F extends string> {
  key: F;
  type: ColumnType;
  required?: boolean;
  enumName?: EnumName;
  /** Applied when the cell is empty; shown in the guide sheet. */
  defaultValue?: string | boolean;
  /** Overrides the guide-sheet format derived from `type`. */
  format?: FormatKey;
  /** Extra accepted headers (any language). Localized labels are always accepted. */
  aliases?: readonly string[];
  example: (language: ToolingImportLanguage) => string;
}

const copyFor = (language: ToolingImportLanguage) => toolingImportResources[language].toolingImport;
const literal = (value: string) => () => value;
const yesExample = (language: ToolingImportLanguage) => copyFor(language).template.yes;

const TOOL_COLUMNS: ReadonlyArray<ImportColumn<ToolImportField>> = [
  {
    key: 'name',
    type: 'text',
    required: true,
    format: 'toolIdentity',
    aliases: ['tool', 'tool name', 'tên', '이름', '공구명'],
    example: (language) => copyFor(language).examples.toolName,
  },
  {
    key: 'tooling_type',
    type: 'enum',
    enumName: 'toolingType',
    defaultValue: 'jig',
    aliases: ['type', 'tool type', 'loại', '유형'],
    example: (language) => enumDisplayLabel('toolingType', 'jig', language),
  },
  { key: 'design_code', type: 'design', aliases: ['design', 'thiết kế', '설계'], example: literal('WJ-STD') },
  { key: 'manufacturer', type: 'text', aliases: ['maker'], example: literal('ACME Tooling') },
  { key: 'model', type: 'text', example: literal('WJ-200') },
  { key: 'serial_number', type: 'text', aliases: ['serial', 'serial no', 'sn', 's/n'], example: literal('SN-0001') },
  { key: 'team_name', type: 'team', aliases: ['team'], example: (language) => copyFor(language).examples.teamName },
  {
    key: 'storage_location',
    type: 'text',
    aliases: ['location', 'vị trí', '위치'],
    example: (language) => copyFor(language).examples.storageLocation,
  },
  {
    key: 'responsible_email',
    type: 'member',
    aliases: ['responsible', 'responsible email', 'email'],
    example: literal('operator@example.com'),
  },
  {
    key: 'ownership_type',
    type: 'enum',
    enumName: 'ownership',
    defaultValue: 'company',
    aliases: ['ownership'],
    example: (language) => enumDisplayLabel('ownership', 'company', language),
  },
  { key: 'owner_name', type: 'text', aliases: ['owner'], example: (language) => copyFor(language).examples.ownerName },
  {
    key: 'requires_machine',
    type: 'boolean',
    defaultValue: true,
    aliases: ['requires machine', 'machine required'],
    example: yesExample,
  },
  {
    key: 'usage_unit',
    type: 'enum',
    enumName: 'usageUnit',
    defaultValue: 'cycles',
    aliases: ['unit', 'đơn vị', '단위'],
    example: (language) => enumDisplayLabel('usageUnit', 'cycles', language),
  },
  { key: 'warning_limit', type: 'number', format: 'warningLimit', example: literal('80000') },
  { key: 'life_limit', type: 'number', example: literal('100000') },
  { key: 'maintenance_interval', type: 'number', example: literal('10000') },
  { key: 'inspection_interval_days', type: 'integer', example: literal('90') },
  { key: 'drawing_number', type: 'text', aliases: ['drawing'], example: literal('DWG-1001') },
  { key: 'drawing_revision', type: 'text', aliases: ['revision', 'rev'], example: literal('B') },
  { key: 'revision_effective_date', type: 'date', example: literal('2026-01-15') },
  {
    key: 'notes',
    type: 'text',
    aliases: ['note', 'remarks', 'comment'],
    example: (language) => copyFor(language).examples.notes,
  },
];

const PRODUCT_COLUMNS: ReadonlyArray<ImportColumn<ProductImportField>> = [
  {
    key: 'part_number',
    type: 'code',
    required: true,
    aliases: ['part', 'part no', 'pn', 'mã', 'mã sản phẩm'],
    example: literal('12345-AB'),
  },
  {
    key: 'name',
    type: 'text',
    required: true,
    aliases: ['name', 'product name', 'tên', 'tên sản phẩm', '이름'],
    example: (language) => copyFor(language).examples.partName,
  },
  {
    key: 'customer_name',
    type: 'text',
    aliases: ['customer'],
    example: (language) => copyFor(language).examples.customerName,
  },
  { key: 'revision', type: 'text', aliases: ['rev'], example: literal('C') },
  {
    key: 'description',
    type: 'text',
    aliases: ['desc'],
    example: (language) => copyFor(language).examples.partDescription,
  },
  { key: 'is_active', type: 'boolean', defaultValue: true, aliases: ['active'], example: yesExample },
];

const OPERATION_COLUMNS: ReadonlyArray<ImportColumn<OperationImportField>> = [
  { key: 'code', type: 'code', required: true, aliases: ['code', 'mã', '코드'], example: literal('OP-10') },
  {
    key: 'name',
    type: 'text',
    required: true,
    aliases: ['name', 'tên', '이름'],
    example: (language) => copyFor(language).examples.operationName,
  },
  {
    key: 'operation_type',
    type: 'enum',
    enumName: 'operationType',
    required: true,
    aliases: ['type', 'loại', '유형'],
    example: (language) => enumDisplayLabel('operationType', 'welding', language),
  },
  {
    key: 'description',
    type: 'text',
    aliases: ['desc'],
    example: (language) => copyFor(language).examples.operationDescription,
  },
  { key: 'is_active', type: 'boolean', defaultValue: true, aliases: ['active'], example: yesExample },
];

type ColumnsByKind = { [K in ToolingImportKind]: ReadonlyArray<ImportColumn<ToolingImportFieldsByKind[K]>> };
const COLUMNS: ColumnsByKind = { tools: TOOL_COLUMNS, products: PRODUCT_COLUMNS, operations: OPERATION_COLUMNS };

type ColumnLabels = { [K in ToolingImportKind]: Readonly<Record<ToolingImportFieldsByKind[K], string>> };
/** Typed view of the localized header labels (fails to compile if a label is missing). */
const COLUMN_LABELS: Record<ToolingImportLanguage, ColumnLabels> = {
  en: toolingImportResources.en.toolingImport.columns,
  vi: toolingImportResources.vi.toolingImport.columns,
  ko: toolingImportResources.ko.toolingImport.columns,
};

function columnsFor(kind: ToolingImportKind): ReadonlyArray<ImportColumn<ToolingImportField>> {
  return COLUMNS[kind];
}

function columnLabel(kind: ToolingImportKind, field: ToolingImportField, language: ToolingImportLanguage): string {
  const labels: Readonly<Record<string, string>> = COLUMN_LABELS[language][kind];
  return labels[field] ?? field;
}

/** Ordered canonical fields for a kind. */
export function importFieldsFor(kind: ToolingImportKind): ToolingImportField[] {
  return columnsFor(kind).map((column) => column.key);
}

export function requiredImportFields(kind: ToolingImportKind): ToolingImportField[] {
  return columnsFor(kind)
    .filter((column) => column.required)
    .map((column) => column.key);
}

const headerAliasCache = new Map<ToolingImportKind, Map<string, ToolingImportField>>();

function headerAliasMap(kind: ToolingImportKind): Map<string, ToolingImportField> {
  const cached = headerAliasCache.get(kind);
  if (cached) return cached;
  const map = new Map<string, ToolingImportField>();
  const add = (alias: string, field: ToolingImportField) => {
    const token = normalizeImportToken(alias);
    if (token && !map.has(token)) map.set(token, field);
  };
  const columns = columnsFor(kind);
  // Canonical keys and template labels win over loose aliases.
  for (const column of columns) add(column.key, column.key);
  for (const language of LANGUAGES) {
    for (const column of columns) add(columnLabel(kind, column.key, language), column.key);
  }
  for (const column of columns) column.aliases?.forEach((alias) => add(alias, column.key));
  headerAliasCache.set(kind, map);
  return map;
}

/** Map a header cell to its canonical field (null when unknown). */
export function resolveImportHeader(kind: ToolingImportKind, header: string): ToolingImportField | null {
  return headerAliasMap(kind).get(normalizeImportToken(header)) ?? null;
}

// ---------------------------------------------------------------------------
// Row reader: typed, validated cell access that records errors
// ---------------------------------------------------------------------------

class RowReader {
  readonly errors: ToolingImportRowError[] = [];

  constructor(
    readonly rowNumber: number,
    private readonly values: ReadonlyMap<ToolingImportField, unknown>,
  ) {}

  error(field: ToolingImportField, code: ToolingImportErrorCode, extra: Partial<ToolingImportRowError> = {}): void {
    this.errors.push({ rowNumber: this.rowNumber, field, code, ...extra });
  }

  hasError(field: ToolingImportField): boolean {
    return this.errors.some((error) => error.field === field);
  }

  raw(field: ToolingImportField): string {
    return cellText(this.values.get(field));
  }

  text(field: ToolingImportField, required = false): string | undefined {
    const value = this.raw(field);
    if (value) return value;
    if (required) this.error(field, 'required');
    return undefined;
  }

  enumValue<T extends string>(field: ToolingImportField, name: EnumName, required = false): T | undefined {
    const value = this.text(field, required);
    if (value === undefined) return undefined;
    const resolved = resolveImportEnum(name, value);
    if (resolved === null) {
      this.error(field, 'invalidEnum', { value });
      return undefined;
    }
    return resolved as T;
  }

  number(field: ToolingImportField, integer = false): number | undefined {
    const raw = this.values.get(field);
    const value = this.text(field);
    if (value === undefined) return undefined;
    const parsed = parseNumberCell(raw);
    if (parsed === null) {
      this.error(field, 'invalidNumber', { value });
      return undefined;
    }
    if (integer && !Number.isInteger(parsed)) {
      this.error(field, 'notInteger', { value });
      return undefined;
    }
    if (parsed <= 0) {
      this.error(field, 'notPositive', { value });
      return undefined;
    }
    return parsed;
  }

  date(field: ToolingImportField): string | undefined {
    const raw = this.values.get(field);
    const value = this.text(field);
    if (value === undefined) return undefined;
    const parsed = parseDateCell(raw);
    if (parsed === null) {
      this.error(field, 'invalidDate', { value });
      return undefined;
    }
    return parsed;
  }

  boolean(field: ToolingImportField): boolean | undefined {
    const raw = this.values.get(field);
    const value = this.text(field);
    if (value === undefined) return undefined;
    const parsed = parseBooleanCell(raw);
    if (parsed === null) {
      this.error(field, 'invalidBoolean', { value });
      return undefined;
    }
    return parsed;
  }
}

// ---------------------------------------------------------------------------
// Per-kind parsing
// ---------------------------------------------------------------------------

interface IdentityTracker {
  /** First row number per identity key seen in this file. */
  seen: Map<string, number>;
  existing: Set<string>;
}

/**
 * Flag a repeat of an identity seen earlier in the file (`duplicateInFile`) or
 * one that already exists in the organization (`duplicateExisting`).
 */
function checkIdentity(
  reader: RowReader,
  tracker: IdentityTracker,
  key: string,
  field: ToolingImportField,
  display: string,
): void {
  const firstRow = tracker.seen.get(key);
  if (firstRow !== undefined) {
    reader.error(field, 'duplicateInFile', { value: display, duplicateOfRow: firstRow });
    return;
  }
  tracker.seen.set(key, reader.rowNumber);
  if (tracker.existing.has(key)) reader.error(field, 'duplicateExisting', { value: display });
}

function toolIdentityKey(name: string, serial: string | undefined | null): string {
  return `${normalizeLookup(name)}\u0000${normalizeLookup(serial ?? '')}`;
}

function toolDisplay(name: string, serial: string | undefined): string {
  return serial ? `${name} (${serial})` : name;
}

function codeDisplay(code: string, name: string): string {
  return [code, name].filter(Boolean).join(' — ');
}

interface Lookups {
  teams: Map<string, string[]>;
  members: Map<string, string>;
  designs: Map<string, { id: string; tooling_type?: ToolingType; is_active?: boolean }>;
}

function buildLookups(context: ToolingImportContext): Lookups {
  const teams = new Map<string, string[]>();
  for (const team of context.teams ?? []) {
    const key = normalizeLookup(team.name);
    teams.set(key, [...(teams.get(key) ?? []), team.id]);
  }
  const members = new Map<string, string>();
  for (const member of context.members ?? []) {
    const key = member.email.trim().toLowerCase();
    if (key && !members.has(key)) members.set(key, member.id);
  }
  const designs = new Map<string, { id: string; tooling_type?: ToolingType; is_active?: boolean }>();
  for (const design of context.designs ?? []) designs.set(normalizeCode(design.design_code), design);
  return { teams, members, designs };
}

function parseToolRow(
  reader: RowReader,
  tracker: IdentityTracker,
  lookups: Lookups,
): ToolingImportPayloads['tools'] | null {
  const name = reader.text('name', true);
  const toolingType = reader.enumValue<ToolingType>('tooling_type', 'toolingType');
  const ownershipType = reader.enumValue<ToolingOwnershipType>('ownership_type', 'ownership');
  const usageUnit = reader.enumValue<ToolingUsageUnit>('usage_unit', 'usageUnit');
  const requiresMachine = reader.boolean('requires_machine');
  const warningLimit = reader.number('warning_limit');
  const lifeLimit = reader.number('life_limit');
  const maintenanceInterval = reader.number('maintenance_interval');
  const inspectionIntervalDays = reader.number('inspection_interval_days', true);
  const revisionEffectiveDate = reader.date('revision_effective_date');
  const serialNumber = reader.text('serial_number');

  if (warningLimit !== undefined && lifeLimit !== undefined && warningLimit > lifeLimit) {
    reader.error('warning_limit', 'warningExceedsLife', { value: String(warningLimit) });
  }

  let teamId: string | undefined;
  const teamName = reader.text('team_name');
  if (teamName) {
    const matches = lookups.teams.get(normalizeLookup(teamName)) ?? [];
    if (matches.length === 0) reader.error('team_name', 'teamNotFound', { value: teamName });
    else if (matches.length > 1) reader.error('team_name', 'teamAmbiguous', { value: teamName });
    else teamId = matches[0];
  }

  let responsibleUserId: string | undefined;
  const responsibleEmail = reader.text('responsible_email');
  if (responsibleEmail) {
    responsibleUserId = lookups.members.get(responsibleEmail.toLowerCase());
    if (!responsibleUserId) reader.error('responsible_email', 'memberNotFound', { value: responsibleEmail });
  }

  let design: { id: string; tooling_type?: ToolingType } | undefined;
  const designCode = reader.text('design_code');
  if (designCode) {
    const match = lookups.designs.get(normalizeCode(designCode));
    if (!match || match.is_active === false) reader.error('design_code', 'designNotFound', { value: designCode });
    else design = match;
  }

  if (name) checkIdentity(reader, tracker, toolIdentityKey(name, serialNumber), 'name', toolDisplay(name, serialNumber));

  if (reader.errors.length > 0 || !name) return null;
  return compact<CreateToolingInput>({
    name,
    manufacturer: reader.text('manufacturer'),
    model: reader.text('model'),
    serial_number: serialNumber,
    team_id: teamId,
    tooling_type: toolingType ?? design?.tooling_type ?? 'jig',
    design_id: design?.id,
    ownership_type: ownershipType ?? 'company',
    owner_name: reader.text('owner_name'),
    storage_location: reader.text('storage_location'),
    responsible_user_id: responsibleUserId,
    requires_machine: requiresMachine ?? true,
    drawing_number: reader.text('drawing_number'),
    drawing_revision: reader.text('drawing_revision'),
    revision_effective_date: revisionEffectiveDate,
    usage_unit: usageUnit ?? 'cycles',
    warning_limit: warningLimit,
    life_limit: lifeLimit,
    maintenance_interval: maintenanceInterval,
    inspection_interval_days: inspectionIntervalDays,
    notes: reader.text('notes'),
  });
}

function parseProductRow(reader: RowReader, tracker: IdentityTracker): ToolingImportPayloads['products'] | null {
  const rawNumber = reader.text('part_number', true);
  const partNumber = rawNumber ? normalizeCode(rawNumber) : undefined;
  const name = reader.text('name', true);
  const isActive = reader.boolean('is_active');
  if (partNumber) checkIdentity(reader, tracker, partNumber, 'part_number', partNumber);
  if (reader.errors.length > 0 || !partNumber || !name) return null;
  return compact<ProductPartInput>({
    part_number: partNumber,
    name,
    customer_name: reader.text('customer_name'),
    revision: reader.text('revision'),
    description: reader.text('description'),
    is_active: isActive,
  });
}

function parseOperationRow(reader: RowReader, tracker: IdentityTracker): ToolingImportPayloads['operations'] | null {
  const rawCode = reader.text('code', true);
  const code = rawCode ? normalizeCode(rawCode) : undefined;
  const name = reader.text('name', true);
  const operationType = reader.enumValue<ToolingOperationType>('operation_type', 'operationType', true);
  const isActive = reader.boolean('is_active');
  if (code) checkIdentity(reader, tracker, code, 'code', code);
  if (reader.errors.length > 0 || !code || !name || !operationType) return null;
  return compact<ProductionOperationInput>({
    code,
    name,
    operation_type: operationType,
    description: reader.text('description'),
    is_active: isActive,
  });
}

function rowLabel(kind: ToolingImportKind, reader: RowReader): string {
  switch (kind) {
    case 'tools':
      return toolDisplay(reader.raw('name'), reader.raw('serial_number') || undefined);
    case 'products':
      return codeDisplay(normalizeCode(reader.raw('part_number')), reader.raw('name'));
    case 'operations':
      return codeDisplay(normalizeCode(reader.raw('code')), reader.raw('name'));
  }
}

function existingIdentities(kind: ToolingImportKind, context: ToolingImportContext): Set<string> {
  switch (kind) {
    case 'tools':
      return new Set((context.existingTools ?? []).map((tool) => toolIdentityKey(tool.name, tool.serial_number)));
    case 'products':
      return new Set([...(context.existingPartNumbers ?? [])].map(normalizeCode));
    case 'operations':
      return new Set([...(context.existingOperationCodes ?? [])].map(normalizeCode));
  }
}

/** SheetJS marks each object row with a non-enumerable 0-based `__rowNum__`. */
function sheetRowNumber(row: Record<string, unknown>, index: number): number {
  const rowNum = row['__rowNum__'];
  return typeof rowNum === 'number' && Number.isInteger(rowNum) ? rowNum + 1 : index + 2;
}

/** SheetJS names blank header cells `__EMPTY`, `__EMPTY_1`, … */
const EMPTY_HEADER_PATTERN = /^__EMPTY(_\d+)?$/;

/**
 * Validate sheet rows for one entity kind. Blank rows are skipped; row numbers
 * are spreadsheet rows (header = 1). Only rows without errors are in `valid`.
 */
export function parseImportRows(
  kind: ToolingImportKind,
  rows: ReadonlyArray<Record<string, unknown>>,
  context: ToolingImportContext = {},
): ToolingImportParseResult {
  const headerMap = headerAliasMap(kind);
  const headerFields = new Map<string, ToolingImportField | null>();
  for (const row of rows) {
    for (const header of Object.keys(row)) {
      if (!headerFields.has(header)) headerFields.set(header, headerMap.get(normalizeImportToken(header)) ?? null);
    }
  }
  const recognized = new Set([...headerFields.values()].filter((field): field is ToolingImportField => field !== null));
  const unknownHeaders = [...headerFields.entries()]
    .filter(([header, field]) => field === null && !EMPTY_HEADER_PATTERN.test(header) && header.trim() !== '')
    .map(([header]) => header);

  const lookups = buildLookups(context);
  const tracker: IdentityTracker = { seen: new Map(), existing: existingIdentities(kind, context) };
  const valid: ParsedImportRow[] = [];
  const errors: ToolingImportRowError[] = [];
  const summaries: ToolingImportRowSummary[] = [];

  rows.forEach((row, index) => {
    if (isBlankImportRow(row)) return;
    const values = new Map<ToolingImportField, unknown>();
    for (const [header, value] of Object.entries(row)) {
      const field = headerFields.get(header);
      if (!field) continue;
      if (!values.has(field) || isBlankCell(values.get(field))) values.set(field, value);
    }
    const reader = new RowReader(sheetRowNumber(row, index), values);
    const label = rowLabel(kind, reader);

    switch (kind) {
      case 'tools': {
        const payload = parseToolRow(reader, tracker, lookups);
        if (payload) valid.push({ kind, rowNumber: reader.rowNumber, label, payload });
        break;
      }
      case 'products': {
        const payload = parseProductRow(reader, tracker);
        if (payload) valid.push({ kind, rowNumber: reader.rowNumber, label, payload });
        break;
      }
      case 'operations': {
        const payload = parseOperationRow(reader, tracker);
        if (payload) valid.push({ kind, rowNumber: reader.rowNumber, label, payload });
        break;
      }
    }
    errors.push(...reader.errors);
    summaries.push({ rowNumber: reader.rowNumber, label, errors: reader.errors });
  });

  const fieldOrder = importFieldsFor(kind);
  return {
    kind,
    valid,
    errors,
    rows: summaries,
    recognizedColumns: fieldOrder.filter((field) => recognized.has(field)),
    missingColumns: requiredImportFields(kind).filter((field) => !recognized.has(field)),
    unknownHeaders,
  };
}

// ---------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------

function columnFormat(column: ImportColumn<string>, language: ToolingImportLanguage): string {
  const copy = copyFor(language);
  const formats = copy.formats;
  let format: string;
  if (column.format) {
    format = formats[column.format];
  } else if (column.type === 'enum' && column.enumName) {
    const enumName = column.enumName;
    const values = ENUMS[enumName].values.map((value) => enumDisplayLabel(enumName, value, language)).join(', ');
    format = fill(formats.oneOf, { values });
  } else {
    const byType: Record<ColumnType, FormatKey> = {
      text: 'text',
      code: 'uniqueCode',
      enum: 'text',
      number: 'number',
      integer: 'integer',
      date: 'date',
      boolean: 'boolean',
      team: 'team',
      member: 'member',
      design: 'design',
    };
    format = formats[byType[column.type]];
  }
  if (column.defaultValue !== undefined) {
    const display =
      typeof column.defaultValue === 'boolean'
        ? column.defaultValue
          ? copy.template.yes
          : copy.template.no
        : column.enumName
          ? enumDisplayLabel(column.enumName, column.defaultValue, language)
          : column.defaultValue;
    format = `${format}. ${fill(formats.defaultValue, { value: display })}`;
  }
  return format;
}

/** Localized header as written in the template (required columns end with " *"). */
export function templateHeader(
  kind: ToolingImportKind,
  field: ToolingImportField,
  language: ToolingImportLanguage,
): string {
  const column = columnsFor(kind).find((entry) => entry.key === field);
  const label = columnLabel(kind, field, language);
  return column?.required ? `${label} *` : label;
}

/**
 * Template workbook content: a header-only data sheet (read on import) and a
 * guide sheet listing each column's requirement, format and an example.
 */
export function buildTemplateRows(
  kind: ToolingImportKind,
  language: ToolingImportLanguage,
): ToolingImportTemplateSheet[] {
  const copy = copyFor(language);
  const columns = columnsFor(kind);
  const headers = columns.map((column) => templateHeader(kind, column.key, language));
  const guide: string[][] = [
    [copy.template.column, copy.template.required, copy.template.format, copy.template.example],
    ...columns.map((column, index) => [
      headers[index],
      column.required ? copy.template.yes : copy.template.no,
      columnFormat(column, language),
      column.example(language),
    ]),
  ];
  return [
    { name: copy.template.dataSheet, rows: [headers] },
    { name: copy.template.guideSheet, rows: guide },
  ];
}
