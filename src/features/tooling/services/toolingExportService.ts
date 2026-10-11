/**
 * Tooling reports & exports: tooling register, customer-owned tooling report,
 * per-tool history and printable QR label sheets (CSV / Excel / PDF).
 *
 * Row builders are pure (no DOM, no network) so they are unit-testable. The
 * download helpers lazy-load xlsx / jspdf / qrcode on demand. PDFs embed the
 * shared Noto Sans KR subset (Latin + Vietnamese + Hangul, see
 * operator-check-ins/assets/FONT-SOURCE.md) because jsPDF's built-in fonts
 * cannot render Vietnamese diacritics or Korean.
 */

import Papa from 'papaparse';
import type { jsPDF } from 'jspdf';
import fontUrl from '@/features/operator-check-ins/assets/ZNTEQR-Report-KR-VI.ttf?url';
import {
  TOOLING_USABILITY_STATES,
  type ToolingAssignment,
  type ToolingEvent,
  type ToolingOverview,
  type ToolingUsageLog,
  type ToolingVerification,
} from '@/features/tooling/types';
import { toolingLifePercent, toolingRemainingLife } from '@/features/tooling/utils/toolingLife';
import { formatForExport } from '@/utils/dateFormatter';
import { downloadBlob, filenameWithDate, sanitizeSpreadsheetCell } from '@/utils/exportUtils';
import { equipmentQRPath, generateQRDataUrl, qrFullUrl } from '@/utils/qr';

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export const TOOLING_EXPORT_FORMATS = ['csv', 'xlsx', 'pdf'] as const;
export type ToolingExportFormat = (typeof TOOLING_EXPORT_FORMATS)[number];

/** Same shape as `useI18n().t`. */
export type ToolingTranslate = (key: string, params?: Record<string, string | number>) => string;

/** Strings stay text, numbers stay numeric in Excel, null renders empty. */
export type ToolingExportCell = string | number | null;

export interface ToolingExportTable {
  header: string[];
  rows: ToolingExportCell[][];
}

export interface ToolingExportOptions {
  /** BCP 47 locale (e.g. the UI language) for sorting and PDF number formatting. */
  locale?: string;
  /** Formats ISO timestamps for history rows / PDF meta. Defaults to ISO-8601 UTC. */
  formatDateTime?: (value: string) => string;
  /** Shown in PDF headers when provided. */
  organizationName?: string | null;
}

export const TOOLING_CSV_BOM = '\uFEFF';
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function emptyToNull(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function formatTimestamp(value: string | null | undefined, options: ToolingExportOptions): string | null {
  if (!value) return null;
  return (options.formatDateTime ?? formatForExport)(value);
}

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------

const REGISTER_COLUMNS = [
  'managementCode',
  'name',
  'type',
  'ownership',
  'owner',
  'storageLocation',
  'holder',
  'usability',
  'approval',
  'condition',
  'unit',
  'cumulativeUsage',
  'warningLimit',
  'lifeLimit',
  'remainingLife',
  'percentUsed',
  'nextInspectionDue',
  'drawingNumber',
  'revision',
] as const;

function holderName(tool: ToolingOverview): string | null {
  return tool.is_issued ? emptyToNull(tool.issued_to_name) : null;
}

/** Full tooling register, one row per tool, in the order given (the caller's filtered list). */
export function buildToolingRegisterRows(tools: ToolingOverview[], t: ToolingTranslate): ToolingExportTable {
  return {
    header: REGISTER_COLUMNS.map((column) => t(`toolingReports.columns.${column}`)),
    rows: tools.map((tool) => [
      emptyToNull(tool.management_code),
      tool.name,
      t(`tooling.types.${tool.tooling_type}`),
      t(`tooling.ownership.${tool.ownership_type}`),
      emptyToNull(tool.owner_name),
      emptyToNull(tool.storage_location),
      holderName(tool),
      t(`tooling.usability.${tool.usability_state}`),
      t(`tooling.approval.${tool.approval_status}`),
      t(`tooling.conditions.${tool.condition}`),
      t(`tooling.unitLabels.${tool.usage_unit}`),
      toNumber(tool.cumulative_usage),
      toNumber(tool.warning_limit),
      toNumber(tool.life_limit),
      toolingRemainingLife(tool),
      toolingLifePercent(tool),
      emptyToNull(tool.next_inspection_due),
      emptyToNull(tool.drawing_number),
      emptyToNull(tool.drawing_revision),
    ]),
  };
}

// ---------------------------------------------------------------------------
// Customer-owned report
// ---------------------------------------------------------------------------

const CUSTOMER_OWNED_COLUMNS = [
  'customer',
  'managementCode',
  'name',
  'type',
  'condition',
  'usability',
  'storageLocation',
  'holder',
  'unit',
  'cumulativeUsage',
  'lifeLimit',
  'remainingLife',
  'percentUsed',
  'nextInspectionDue',
] as const;

export interface ToolingCustomerOwnedGroup {
  owner: string;
  rows: ToolingExportCell[][];
}

export interface ToolingCustomerOwnedReport extends ToolingExportTable {
  /** Rows grouped by customer (same order as `rows`); each group row omits the customer column. */
  groups: ToolingCustomerOwnedGroup[];
}

/**
 * Customer-owned tools only, sorted by customer (unnamed customers last),
 * then management code and name. The first column is the customer.
 */
export function buildCustomerOwnedRows(
  tools: ToolingOverview[],
  t: ToolingTranslate,
  locale?: string,
): ToolingCustomerOwnedReport {
  const collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true });
  const unknownOwner = t('toolingReports.values.unknownOwner');

  const entries = tools
    .filter((tool) => tool.ownership_type === 'customer')
    .map((tool) => ({ tool, owner: emptyToNull(tool.owner_name) }))
    .sort((a, b) => {
      if (a.owner === null || b.owner === null) {
        if (a.owner !== b.owner) return a.owner === null ? 1 : -1;
      } else {
        const byOwner = collator.compare(a.owner, b.owner);
        if (byOwner !== 0) return byOwner;
      }
      return (
        collator.compare(a.tool.management_code ?? '', b.tool.management_code ?? '') ||
        collator.compare(a.tool.name, b.tool.name)
      );
    });

  const rows: ToolingExportCell[][] = [];
  const groups: ToolingCustomerOwnedGroup[] = [];
  let currentKey: string | null | undefined;

  for (const { tool, owner } of entries) {
    const details: ToolingExportCell[] = [
      emptyToNull(tool.management_code),
      tool.name,
      t(`tooling.types.${tool.tooling_type}`),
      t(`tooling.conditions.${tool.condition}`),
      t(`tooling.usability.${tool.usability_state}`),
      emptyToNull(tool.storage_location),
      holderName(tool),
      t(`tooling.unitLabels.${tool.usage_unit}`),
      toNumber(tool.cumulative_usage),
      toNumber(tool.life_limit),
      toolingRemainingLife(tool),
      toolingLifePercent(tool),
      emptyToNull(tool.next_inspection_due),
    ];
    const ownerLabel = owner ?? unknownOwner;
    rows.push([ownerLabel, ...details]);

    const sameGroup =
      currentKey !== undefined &&
      (owner === null || currentKey === null ? owner === currentKey : collator.compare(owner, currentKey) === 0);
    if (!sameGroup) {
      groups.push({ owner: ownerLabel, rows: [] });
      currentKey = owner;
    }
    groups[groups.length - 1].rows.push(details);
  }

  return {
    header: CUSTOMER_OWNED_COLUMNS.map((column) => t(`toolingReports.columns.${column}`)),
    rows,
    groups,
  };
}

// ---------------------------------------------------------------------------
// Per-tool history
// ---------------------------------------------------------------------------

export const TOOLING_HISTORY_SECTION_KEYS = ['assignments', 'usage', 'verifications', 'events'] as const;
export type ToolingHistorySectionKey = (typeof TOOLING_HISTORY_SECTION_KEYS)[number];

export interface ToolingHistoryData {
  assignments: ToolingAssignment[];
  usage: ToolingUsageLog[];
  verifications: ToolingVerification[];
  events: ToolingEvent[];
}

export interface ToolingHistorySection extends ToolingExportTable {
  key: ToolingHistorySectionKey;
  title: string;
}

const USABILITY_VALUES = new Set<string>(TOOLING_USABILITY_STATES);
const APPROVAL_VALUES = new Set(['pending', 'approved', 'rejected']);
const USABILITY_EVENTS = new Set<ToolingEvent['event_type']>(['usability_changed', 'returned_to_service']);

function refLabel(code: string | null | undefined, name: string | null | undefined): string | null {
  const parts = [emptyToNull(code), emptyToNull(name)].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(' — ') : null;
}

function yesNo(value: boolean, t: ToolingTranslate): string {
  return t(value ? 'tooling.yes' : 'tooling.no');
}

/** Translate enum values for usability / approval events; keep other values raw. */
function eventValue(event: ToolingEvent, value: string | null, t: ToolingTranslate): string | null {
  if (value === null || value === '') return null;
  if (USABILITY_EVENTS.has(event.event_type) && USABILITY_VALUES.has(value)) return t(`tooling.usability.${value}`);
  if (event.event_type === 'approved' && APPROVAL_VALUES.has(value)) return t(`tooling.approval.${value}`);
  return value;
}

function historyHeader(columns: readonly string[], t: ToolingTranslate): string[] {
  return columns.map((column) => t(`toolingReports.historyColumns.${column}`));
}

function assignmentsSection(rows: ToolingAssignment[], t: ToolingTranslate, options: ToolingExportOptions) {
  const columns = [
    'issuedAt', 'status', 'issuedTo', 'issuedBy', 'machine', 'productPart', 'operation', 'issueLocation',
    'conditionAtIssue', 'notes', 'returnedAt', 'returnedBy', 'returnLocation', 'conditionAtReturn',
    'usageAtReturn', 'returnNotes',
  ] as const;
  return {
    header: historyHeader(columns, t),
    rows: rows.map((row): ToolingExportCell[] => [
      formatTimestamp(row.issued_at, options),
      t(row.status === 'active' ? 'toolingReports.values.assignmentActive' : 'toolingReports.values.assignmentReturned'),
      emptyToNull(row.issued_to_name),
      emptyToNull(row.issued_by_name),
      refLabel(row.machine?.management_code, row.machine?.name),
      refLabel(row.product_part?.part_number, row.product_part?.name),
      refLabel(row.operation?.code, row.operation?.name),
      emptyToNull(row.issue_location),
      t(`tooling.conditions.${row.condition_at_issue}`),
      emptyToNull(row.notes),
      formatTimestamp(row.returned_at, options),
      emptyToNull(row.returned_by_name),
      emptyToNull(row.return_location),
      row.condition_at_return ? t(`tooling.conditions.${row.condition_at_return}`) : null,
      toNumber(row.usage_at_return),
      emptyToNull(row.return_notes),
    ]),
  };
}

function usageSection(rows: ToolingUsageLog[], t: ToolingTranslate, options: ToolingExportOptions) {
  const columns = [
    'recordedAt', 'entryType', 'quantity', 'unit', 'productionQuantity', 'cumulativeAfter', 'reason', 'recordedBy',
  ] as const;
  return {
    header: historyHeader(columns, t),
    rows: rows.map((row): ToolingExportCell[] => [
      formatTimestamp(row.recorded_at, options),
      t(row.entry_type === 'correction' ? 'toolingReports.values.entryCorrection' : 'toolingReports.values.entryUsage'),
      toNumber(row.quantity),
      t(`tooling.unitLabels.${row.usage_unit}`),
      toNumber(row.production_quantity),
      toNumber(row.cumulative_after),
      emptyToNull(row.reason),
      emptyToNull(row.recorded_by_name),
    ]),
  };
}

function verificationsSection(rows: ToolingVerification[], t: ToolingTranslate, options: ToolingExportOptions) {
  const columns = [
    'inspectedAt', 'verificationType', 'result', 'findings', 'maintenanceCompleted', 'returnedToService',
    'usabilityBefore', 'usabilityAfter', 'cumulativeAt', 'nextDue', 'inspectedBy', 'approvedBy', 'approvedAt',
  ] as const;
  return {
    header: historyHeader(columns, t),
    rows: rows.map((row): ToolingExportCell[] => [
      formatTimestamp(row.inspected_at, options),
      t(`tooling.verificationTypes.${row.verification_type}`),
      t(`tooling.verificationResults.${row.result}`),
      emptyToNull(row.findings),
      yesNo(row.maintenance_completed, t),
      yesNo(row.returned_to_service, t),
      t(`tooling.usability.${row.usability_before}`),
      t(`tooling.usability.${row.usability_after}`),
      toNumber(row.cumulative_usage_at),
      emptyToNull(row.next_due),
      emptyToNull(row.inspected_by_name),
      emptyToNull(row.approved_by_name),
      formatTimestamp(row.approved_at, options),
    ]),
  };
}

function eventsSection(rows: ToolingEvent[], t: ToolingTranslate, options: ToolingExportOptions) {
  const columns = ['date', 'event', 'from', 'to', 'reason', 'actor'] as const;
  return {
    header: historyHeader(columns, t),
    rows: rows.map((row): ToolingExportCell[] => [
      formatTimestamp(row.created_at, options),
      t(`tooling.events.${row.event_type}`),
      eventValue(row, row.from_value, t),
      eventValue(row, row.to_value, t),
      emptyToNull(row.reason),
      emptyToNull(row.actor_name) ?? t('toolingReports.values.system'),
    ]),
  };
}

/** Four history sections (issue/return, usage, inspections, events), always in that order. */
export function buildToolingHistorySections(
  data: ToolingHistoryData,
  t: ToolingTranslate,
  options: ToolingExportOptions = {},
): ToolingHistorySection[] {
  const tables: Record<ToolingHistorySectionKey, ToolingExportTable> = {
    assignments: assignmentsSection(data.assignments, t, options),
    usage: usageSection(data.usage, t, options),
    verifications: verificationsSection(data.verifications, t, options),
    events: eventsSection(data.events, t, options),
  };
  return TOOLING_HISTORY_SECTION_KEYS.map((key) => ({
    key,
    title: t(`toolingReports.sections.${key}`),
    ...tables[key],
  }));
}

// ---------------------------------------------------------------------------
// CSV / sheet serialization (pure)
// ---------------------------------------------------------------------------

function spreadsheetCell(cell: ToolingExportCell): string | number {
  if (cell === null) return '';
  if (typeof cell === 'number') return cell;
  return sanitizeSpreadsheetCell(cell);
}

function unparseCsv(data: ToolingExportCell[][]): string {
  return TOOLING_CSV_BOM + Papa.unparse(data.map((row) => row.map(spreadsheetCell)), { newline: '\r\n' });
}

/** CSV with a UTF-8 BOM (so Excel opens vi / ko text correctly) and formula-injection guards. */
export function toolingTableToCsv(table: ToolingExportTable): string {
  return unparseCsv([table.header, ...table.rows]);
}

/**
 * History sections combined into one CSV: each section repeats its own header
 * row, every row starts with a "Section" column, blank line between sections.
 */
export function toolingHistoryToCsv(sections: ToolingHistorySection[], t: ToolingTranslate): string {
  const sectionLabel = t('toolingReports.sections.section');
  const data: ToolingExportCell[][] = [];
  sections.forEach((section, index) => {
    if (index > 0) data.push([]);
    data.push([sectionLabel, ...section.header]);
    for (const row of section.rows) data.push([section.title, ...row]);
  });
  return unparseCsv(data);
}

/** Excel sheet names: max 31 chars, none of \ / ? * [ ] :, unique within the workbook. */
export function toolingSheetName(title: string, used: Set<string>): string {
  const base = title.replace(/[\\/?*[\]:]/g, '-').trim().slice(0, 31) || 'Sheet';
  let name = base;
  let suffix = 2;
  while (used.has(name.toLowerCase())) {
    const tail = ` (${suffix})`;
    name = `${base.slice(0, 31 - tail.length)}${tail}`;
    suffix += 1;
  }
  used.add(name.toLowerCase());
  return name;
}

function sheetColumnWidths(data: ToolingExportCell[][]): Array<{ wch: number }> {
  const columnCount = Math.max(0, ...data.map((row) => row.length));
  return Array.from({ length: columnCount }, (_, column) => {
    const longest = Math.max(0, ...data.map((row) => String(row[column] ?? '').length));
    return { wch: Math.min(50, Math.max(8, longest + 2)) };
  });
}

/** Strip characters browsers / file systems reject; keeps Unicode letters (vi / ko). */
export function toolingFilenamePart(value: string | null | undefined, fallback = 'tool'): string {
  const cleaned = (value ?? '')
    .replace(/[\\/:*?"<>|#%&{}$!'`@+=,;\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  return cleaned || fallback;
}

// ---------------------------------------------------------------------------
// Download plumbing
// ---------------------------------------------------------------------------

function downloadCsvText(csv: string, filenameStem: string): void {
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), filenameWithDate(filenameStem, 'csv'));
}

async function downloadWorkbook(
  sheets: Array<{ name: string; data: ToolingExportCell[][] }>,
  filenameStem: string,
): Promise<void> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();
  const used = new Set<string>();
  for (const sheet of sheets) {
    const worksheet = XLSX.utils.aoa_to_sheet(
      sheet.data.map((row) => row.map((cell) => (cell === null ? null : spreadsheetCell(cell)))),
    );
    worksheet['!cols'] = sheetColumnWidths(sheet.data);
    XLSX.utils.book_append_sheet(workbook, worksheet, toolingSheetName(sheet.name, used));
  }
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  downloadBlob(new Blob([buffer], { type: XLSX_MIME }), filenameWithDate(filenameStem, 'xlsx'));
}

// ---------------------------------------------------------------------------
// PDF plumbing (A4, embedded Unicode font)
// ---------------------------------------------------------------------------

const PDF_FONT_FILE = 'ZNTEQR-Report-KR-VI.ttf';
const PDF_FONT_FAMILY = 'ZNTEQRReport';

/** Thrown when the embedded PDF font cannot be fetched (e.g. offline). */
export class ToolingPdfFontError extends Error {
  constructor() {
    super('TOOLING_PDF_FONT_LOAD_FAILED');
    this.name = 'ToolingPdfFontError';
  }
}

async function loadPdfFontBase64(): Promise<string> {
  try {
    const response = await fetch(fontUrl);
    if (!response.ok) throw new ToolingPdfFontError();
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 8192) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
    }
    return btoa(binary);
  } catch {
    throw new ToolingPdfFontError();
  }
}

async function createA4Pdf(orientation: 'portrait' | 'landscape', unit: 'pt' | 'mm'): Promise<jsPDF> {
  const [{ jsPDF: JsPdf }, fontBase64] = await Promise.all([import('jspdf'), loadPdfFontBase64()]);
  const doc = new JsPdf({ orientation, unit, format: 'a4', compress: true });
  doc.addFileToVFS(PDF_FONT_FILE, fontBase64);
  doc.addFont(PDF_FONT_FILE, PDF_FONT_FAMILY, 'normal');
  doc.setFont(PDF_FONT_FAMILY, 'normal');
  return doc;
}

const PDF_MARGIN = 32;
const PDF_CELL_PADDING = 3;
const PDF_MAX_CELL_LINES = 10;

interface PdfCursor {
  doc: jsPDF;
  y: number;
  pageWidth: number;
  pageHeight: number;
}

function createCursor(doc: jsPDF): PdfCursor {
  return {
    doc,
    y: PDF_MARGIN,
    pageWidth: doc.internal.pageSize.getWidth(),
    pageHeight: doc.internal.pageSize.getHeight(),
  };
}

/** Keep the bottom margin clear for the page footer. */
function pageBottom(cursor: PdfCursor): number {
  return cursor.pageHeight - PDF_MARGIN - 8;
}

function ensureSpace(cursor: PdfCursor, height: number): boolean {
  if (cursor.y + height <= pageBottom(cursor)) return false;
  cursor.doc.addPage();
  cursor.y = PDF_MARGIN;
  return true;
}

function writeText(cursor: PdfCursor, text: string, size: number, gapAfter = 2): void {
  const { doc } = cursor;
  doc.setFontSize(size);
  const lineHeight = size * 1.25;
  const lines = doc.splitTextToSize(text, cursor.pageWidth - PDF_MARGIN * 2) as string[];
  for (const line of lines) {
    ensureSpace(cursor, lineHeight);
    doc.text(line, PDF_MARGIN, cursor.y + size);
    cursor.y += lineHeight;
  }
  cursor.y += gapAfter;
}

function fitTextLines(doc: jsPDF, text: string, width: number, maxLines: number): string[] {
  if (!text) return [''];
  const wrapped = doc.splitTextToSize(text, width) as string[];
  if (wrapped.length <= maxLines) return wrapped;
  const kept = wrapped.slice(0, maxLines);
  let last = Array.from(kept[maxLines - 1]);
  while (last.length > 0 && doc.getTextWidth(`${last.join('')}…`) > width) last = last.slice(0, -1);
  kept[maxLines - 1] = `${last.join('').trimEnd()}…`;
  return kept;
}

function pdfCellText(cell: ToolingExportCell, numberFormat: Intl.NumberFormat): string {
  if (cell === null) return '';
  return typeof cell === 'number' ? numberFormat.format(cell) : cell;
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const PDF_MIN_TABLE_FONT_SIZE = 5;

interface PdfColumnLayout {
  widths: number[];
  fontSize: number;
}

/**
 * Measured column widths: every column gets at least its longest word (header
 * or content) so words do not break mid-word, then the remaining width goes to
 * columns whose content would otherwise wrap. When even the minimums do not
 * fit, the font shrinks (down to 5 pt) before columns are squeezed.
 */
function pdfColumnLayout(
  doc: jsPDF,
  header: string[],
  rows: string[][],
  available: number,
  preferredFontSize: number,
): PdfColumnLayout {
  const padding = PDF_CELL_PADDING * 2;
  const sample = rows.slice(0, 300);
  /** Measured at the font size currently set on `doc`. */
  const longestWord = (text: string) => Math.max(0, ...text.split(/\s+/).map((word) => doc.getTextWidth(word)));
  let fontSize = preferredFontSize;
  let minimums: number[] = [];

  for (;;) {
    doc.setFontSize(fontSize);
    minimums = header.map((label, column) => {
      const word = Math.max(longestWord(label), ...sample.map((row) => longestWord(row[column] ?? '')));
      // Small tolerance: splitTextToSize measures slightly wider than getTextWidth.
      return Math.min(word * 1.03 + 1, available * 0.25) + padding;
    });
    if (sum(minimums) <= available || fontSize <= PDF_MIN_TABLE_FONT_SIZE) break;
    fontSize = Math.max(PDF_MIN_TABLE_FONT_SIZE, fontSize - 0.5);
  }

  const minimumTotal = sum(minimums);
  if (minimumTotal >= available) {
    return { fontSize, widths: minimums.map((width) => (width / minimumTotal) * available) };
  }
  const desired = header.map((_, column) => {
    const content = Math.max(0, ...sample.map((row) => doc.getTextWidth(row[column] ?? '')));
    return Math.max(minimums[column], Math.min(content, available * 0.35) + padding);
  });
  const desiredTotal = sum(desired);
  if (desiredTotal <= available) {
    return { fontSize, widths: desired.map((width) => (width / desiredTotal) * available) };
  }
  const flex = desired.map((width, column) => width - minimums[column]);
  const flexTotal = sum(flex);
  const remaining = available - minimumTotal;
  return { fontSize, widths: minimums.map((width, column) => width + (flex[column] / flexTotal) * remaining) };
}

function drawTableRow(
  cursor: PdfCursor,
  cells: string[],
  widths: number[],
  fontSize: number,
  numericColumns: boolean[],
  isHeader: boolean,
): void {
  const { doc } = cursor;
  doc.setFontSize(fontSize);
  const lineHeight = fontSize * 1.2;
  const wrapped = cells.map((cell, column) =>
    fitTextLines(doc, cell, widths[column] - PDF_CELL_PADDING * 2, isHeader ? 3 : PDF_MAX_CELL_LINES),
  );
  const rowHeight = Math.max(...wrapped.map((lines) => lines.length)) * lineHeight + PDF_CELL_PADDING * 2;

  let x = PDF_MARGIN;
  wrapped.forEach((lines, column) => {
    const width = widths[column];
    if (isHeader) {
      doc.setFillColor(236, 239, 243);
      doc.rect(x, cursor.y, width, rowHeight, 'FD');
    } else {
      doc.rect(x, cursor.y, width, rowHeight, 'S');
    }
    const alignRight = !isHeader && numericColumns[column];
    lines.forEach((line, index) => {
      const baseline = cursor.y + PDF_CELL_PADDING + fontSize + index * lineHeight - (lineHeight - fontSize) / 2;
      if (alignRight) {
        doc.text(line, x + width - PDF_CELL_PADDING, baseline, { align: 'right' });
      } else {
        doc.text(line, x + PDF_CELL_PADDING, baseline);
      }
    });
    x += width;
  });
  cursor.y += rowHeight;
}

function estimateRowHeight(cursor: PdfCursor, cells: string[], widths: number[], fontSize: number, maxLines: number): number {
  cursor.doc.setFontSize(fontSize);
  const lines = Math.max(
    ...cells.map((cell, column) => fitTextLines(cursor.doc, cell, widths[column] - PDF_CELL_PADDING * 2, maxLines).length),
  );
  return lines * fontSize * 1.2 + PDF_CELL_PADDING * 2;
}

function drawTable(cursor: PdfCursor, table: ToolingExportTable, preferredFontSize: number, locale?: string): void {
  const { doc } = cursor;
  const numberFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const rows = table.rows.map((row) => row.map((cell) => pdfCellText(cell, numberFormat)));
  const numericColumns = table.header.map((_, column) =>
    table.rows.some((row) => typeof row[column] === 'number') &&
    table.rows.every((row) => row[column] === null || typeof row[column] === 'number'),
  );
  const { widths, fontSize } = pdfColumnLayout(
    doc,
    table.header,
    rows,
    cursor.pageWidth - PDF_MARGIN * 2,
    preferredFontSize,
  );

  doc.setDrawColor(200, 204, 210);
  doc.setLineWidth(0.4);
  doc.setTextColor(17, 24, 39);

  const headerHeight = estimateRowHeight(cursor, table.header, widths, fontSize, 3);
  ensureSpace(cursor, headerHeight * 2);
  drawTableRow(cursor, table.header, widths, fontSize, numericColumns, true);

  for (const row of rows) {
    const rowHeight = estimateRowHeight(cursor, row, widths, fontSize, PDF_MAX_CELL_LINES);
    if (ensureSpace(cursor, rowHeight)) {
      drawTableRow(cursor, table.header, widths, fontSize, numericColumns, true);
    }
    drawTableRow(cursor, row, widths, fontSize, numericColumns, false);
  }
  cursor.y += 10;
}

function writePdfHeader(
  cursor: PdfCursor,
  title: string,
  extraLines: string[],
  t: ToolingTranslate,
  options: ToolingExportOptions,
): void {
  writeText(cursor, title, 16, 4);
  const organizationName = emptyToNull(options.organizationName);
  if (organizationName) writeText(cursor, t('toolingReports.pdf.organization', { name: organizationName }), 9, 0);
  for (const line of extraLines) writeText(cursor, line, 9, 0);
  const generatedAt = formatTimestamp(new Date().toISOString(), options) ?? '';
  writeText(cursor, t('toolingReports.pdf.generatedAt', { date: generatedAt }), 9, 10);
}

function addPageNumbers(doc: jsPDF, t: ToolingTranslate): void {
  const total = doc.getNumberOfPages();
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page);
    doc.text(t('toolingReports.pdf.page', { page, total }), width - PDF_MARGIN, height - PDF_MARGIN / 2, {
      align: 'right',
    });
  }
}

function savePdf(doc: jsPDF, t: ToolingTranslate, filenameStem: string): void {
  addPageNumbers(doc, t);
  downloadBlob(doc.output('blob'), filenameWithDate(filenameStem, 'pdf'));
}

// ---------------------------------------------------------------------------
// Public download helpers
// ---------------------------------------------------------------------------

/** Download the tooling register for the given (already filtered) tools. */
export async function downloadToolingRegister(
  tools: ToolingOverview[],
  format: ToolingExportFormat,
  t: ToolingTranslate,
  filenameStem = 'tooling-register',
  options: ToolingExportOptions = {},
): Promise<void> {
  const table = buildToolingRegisterRows(tools, t);
  if (format === 'csv') {
    downloadCsvText(toolingTableToCsv(table), filenameStem);
    return;
  }
  if (format === 'xlsx') {
    await downloadWorkbook([{ name: t('toolingReports.export.register'), data: [table.header, ...table.rows] }], filenameStem);
    return;
  }
  const doc = await createA4Pdf('landscape', 'pt');
  const cursor = createCursor(doc);
  writePdfHeader(cursor, t('toolingReports.pdf.registerTitle'), [t('toolingReports.pdf.toolCount', { count: tools.length })], t, options);
  drawTable(cursor, table, 6.5, options.locale);
  savePdf(doc, t, filenameStem);
}

/** Download the customer-owned tooling report (customer-owned tools only, grouped by customer). */
export async function downloadCustomerOwnedReport(
  tools: ToolingOverview[],
  format: ToolingExportFormat,
  t: ToolingTranslate,
  filenameStem = 'tooling-customer-owned',
  options: ToolingExportOptions = {},
): Promise<void> {
  const report = buildCustomerOwnedRows(tools, t, options.locale);
  if (format === 'csv') {
    downloadCsvText(toolingTableToCsv(report), filenameStem);
    return;
  }
  if (format === 'xlsx') {
    await downloadWorkbook(
      [{ name: t('toolingReports.export.customerOwned'), data: [report.header, ...report.rows] }],
      filenameStem,
    );
    return;
  }
  const doc = await createA4Pdf('landscape', 'pt');
  const cursor = createCursor(doc);
  writePdfHeader(
    cursor,
    t('toolingReports.pdf.customerOwnedTitle'),
    [t('toolingReports.pdf.toolCount', { count: report.rows.length })],
    t,
    options,
  );
  if (report.groups.length === 0) {
    writeText(cursor, t('toolingReports.pdf.noRecords'), 10);
  }
  const groupHeader = report.header.slice(1);
  for (const group of report.groups) {
    ensureSpace(cursor, 60);
    writeText(cursor, t('toolingReports.pdf.ownerGroup', { owner: group.owner, count: group.rows.length }), 11, 4);
    drawTable(cursor, { header: groupHeader, rows: group.rows }, 7.5, options.locale);
  }
  savePdf(doc, t, filenameStem);
}

/** Download one tool's history: Excel = 4 sheets, CSV = combined with a section column, PDF = table per section. */
export async function downloadToolingHistory(
  tool: ToolingOverview,
  data: ToolingHistoryData,
  format: ToolingExportFormat,
  t: ToolingTranslate,
  options: ToolingExportOptions = {},
): Promise<void> {
  const sections = buildToolingHistorySections(data, t, options);
  const filenameStem = `tooling-history-${toolingFilenamePart(tool.management_code || tool.name)}`;

  if (format === 'csv') {
    downloadCsvText(toolingHistoryToCsv(sections, t), filenameStem);
    return;
  }
  if (format === 'xlsx') {
    await downloadWorkbook(
      sections.map((section) => ({ name: section.title, data: [section.header, ...section.rows] })),
      filenameStem,
    );
    return;
  }

  const numberFormat = new Intl.NumberFormat(options.locale, { maximumFractionDigits: 2 });
  const lifeLimit = toNumber(tool.life_limit);
  const doc = await createA4Pdf('landscape', 'pt');
  const cursor = createCursor(doc);
  writePdfHeader(
    cursor,
    t('toolingReports.pdf.historyTitle', { name: tool.name }),
    [
      t('toolingReports.pdf.toolIdentity', {
        code: emptyToNull(tool.management_code) ?? t('tooling.none'),
        type: t(`tooling.types.${tool.tooling_type}`),
        ownership: t(`tooling.ownership.${tool.ownership_type}`),
      }),
      t('toolingReports.pdf.toolUsage', {
        usage: numberFormat.format(toNumber(tool.cumulative_usage) ?? 0),
        unit: t(`tooling.units.${tool.usage_unit}`),
        limit: lifeLimit === null ? t('tooling.none') : numberFormat.format(lifeLimit),
      }),
    ],
    t,
    options,
  );
  for (const section of sections) {
    ensureSpace(cursor, 60);
    writeText(cursor, section.title, 12, 4);
    if (section.rows.length === 0) {
      writeText(cursor, t('toolingReports.pdf.noRecords'), 9, 10);
    } else {
      drawTable(cursor, section, 7, options.locale);
    }
  }
  savePdf(doc, t, filenameStem);
}

// ---------------------------------------------------------------------------
// QR labels (A4 sheet of cut-out labels)
// ---------------------------------------------------------------------------

export const TOOLING_LABEL_SIZES = {
  small: { width: 50, height: 30 },
  medium: { width: 70, height: 40 },
  large: { width: 100, height: 50 },
} as const;
export type ToolingLabelSize = keyof typeof TOOLING_LABEL_SIZES;
export const TOOLING_LABEL_SIZE_KEYS = ['small', 'medium', 'large'] as const satisfies readonly ToolingLabelSize[];

export interface ToolingLabelFields {
  name: boolean;
  managementCode: boolean;
  type: boolean;
  storageLocation: boolean;
}
export const TOOLING_LABEL_FIELD_KEYS = ['name', 'managementCode', 'type', 'storageLocation'] as const satisfies readonly (keyof ToolingLabelFields)[];
export const DEFAULT_TOOLING_LABEL_FIELDS: ToolingLabelFields = {
  name: true,
  managementCode: true,
  type: true,
  storageLocation: false,
};

const A4_MM = { width: 210, height: 297 } as const;
const LABEL_PAGE_MARGIN_MM = 5;
const PT_TO_MM = 0.3528;

const LABEL_TYPOGRAPHY: Record<ToolingLabelSize, { padding: number; primary: number; secondary: number }> = {
  small: { padding: 1.5, primary: 8, secondary: 6 },
  medium: { padding: 2, primary: 10, secondary: 7.5 },
  large: { padding: 2.5, primary: 13, secondary: 9.5 },
};

export interface ToolingLabelGrid {
  columns: number;
  rows: number;
  perPage: number;
  labelWidth: number;
  labelHeight: number;
  /** Left / top offset (mm) that centers the grid on the page. */
  offsetX: number;
  offsetY: number;
}

/** Labels are butted edge to edge (dashed cut guides) inside a 5 mm page margin. */
export function computeToolingLabelGrid(size: ToolingLabelSize): ToolingLabelGrid {
  const { width, height } = TOOLING_LABEL_SIZES[size];
  const columns = Math.max(1, Math.floor((A4_MM.width - LABEL_PAGE_MARGIN_MM * 2) / width));
  const rows = Math.max(1, Math.floor((A4_MM.height - LABEL_PAGE_MARGIN_MM * 2) / height));
  return {
    columns,
    rows,
    perPage: columns * rows,
    labelWidth: width,
    labelHeight: height,
    offsetX: (A4_MM.width - columns * width) / 2,
    offsetY: (A4_MM.height - rows * height) / 2,
  };
}

/** Page (0-based) and top-left corner (mm) of the label at `index`. */
export function toolingLabelPosition(grid: ToolingLabelGrid, index: number): { page: number; x: number; y: number } {
  const page = Math.floor(index / grid.perPage);
  const slot = index % grid.perPage;
  return {
    page,
    x: grid.offsetX + (slot % grid.columns) * grid.labelWidth,
    y: grid.offsetY + Math.floor(slot / grid.columns) * grid.labelHeight,
  };
}

export interface ToolingLabelLine {
  text: string;
  emphasis: 'primary' | 'secondary';
  maxLines: number;
}

/** Text lines printed next to the QR code; the first line is emphasized. */
export function buildToolingLabelLines(
  tool: ToolingOverview,
  fields: ToolingLabelFields,
  t: ToolingTranslate,
): ToolingLabelLine[] {
  const lines: ToolingLabelLine[] = [];
  const code = emptyToNull(tool.management_code);
  const name = emptyToNull(tool.name);
  const location = emptyToNull(tool.storage_location);
  if (fields.managementCode && code) lines.push({ text: code, emphasis: 'primary', maxLines: 1 });
  if (fields.name && name) lines.push({ text: name, emphasis: lines.length === 0 ? 'primary' : 'secondary', maxLines: 2 });
  if (fields.type) lines.push({ text: t(`tooling.types.${tool.tooling_type}`), emphasis: 'secondary', maxLines: 1 });
  if (fields.storageLocation && location) {
    lines.push({ text: t('toolingReports.labels.locationValue', { value: location }), emphasis: 'secondary', maxLines: 1 });
  }
  return lines;
}

/** Absolute URL encoded in a tool's QR (the tool is its equipment record). */
export function toolingLabelQrUrl(tool: Pick<ToolingOverview, 'id' | 'organization_id'>): string {
  return qrFullUrl(equipmentQRPath(tool.id, tool.organization_id));
}

function drawLabel(
  doc: jsPDF,
  position: { x: number; y: number },
  grid: ToolingLabelGrid,
  size: ToolingLabelSize,
  qrDataUrl: string,
  lines: ToolingLabelLine[],
): void {
  const { padding, primary, secondary } = LABEL_TYPOGRAPHY[size];
  const { labelWidth: width, labelHeight: height } = grid;
  const { x, y } = position;

  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.1);
  doc.setLineDashPattern([1, 1], 0);
  doc.rect(x, y, width, height, 'S');
  doc.setLineDashPattern([], 0);

  const qrSize = height - padding * 2;
  const qrX = lines.length === 0 ? x + (width - qrSize) / 2 : x + padding;
  doc.addImage(qrDataUrl, 'PNG', qrX, y + padding, qrSize, qrSize, undefined, 'FAST');
  if (lines.length === 0) return;

  const textX = x + padding * 2 + qrSize;
  const textWidth = width - qrSize - padding * 3;
  const available = height - padding * 2;

  const blocks: Array<{ lines: string[]; size: number; lineHeight: number }> = [];
  let used = 0;
  for (const line of lines) {
    const fontSize = line.emphasis === 'primary' ? primary : secondary;
    const lineHeight = fontSize * PT_TO_MM * 1.2;
    doc.setFontSize(fontSize);
    const fitted = fitTextLines(doc, line.text, textWidth, line.maxLines);
    const room = Math.floor((available - used) / lineHeight);
    if (room <= 0) break;
    const kept = fitted.slice(0, room);
    blocks.push({ lines: kept, size: fontSize, lineHeight });
    used += kept.length * lineHeight;
  }

  doc.setTextColor(0, 0, 0);
  let cursorY = y + padding + (available - used) / 2;
  for (const block of blocks) {
    doc.setFontSize(block.size);
    for (const text of block.lines) {
      doc.text(text, textX, cursorY + block.size * PT_TO_MM);
      cursorY += block.lineHeight;
    }
  }
}

export interface ToolingQrLabelOptions {
  size: ToolingLabelSize;
  fields: ToolingLabelFields;
  /** Called after each label is drawn. */
  onProgress?: (done: number, total: number) => void;
}

/** Build and download an A4 PDF of QR labels. Resolves with the number of labels. */
export async function downloadToolingQrLabels(
  tools: ToolingOverview[],
  options: ToolingQrLabelOptions,
  t: ToolingTranslate,
): Promise<number> {
  const grid = computeToolingLabelGrid(options.size);
  const doc = await createA4Pdf('portrait', 'mm');
  const total = tools.length;

  for (let index = 0; index < total; index += 1) {
    const tool = tools[index];
    const position = toolingLabelPosition(grid, index);
    if (position.page > 0 && index % grid.perPage === 0) doc.addPage();
    const qrDataUrl = await generateQRDataUrl(toolingLabelQrUrl(tool));
    drawLabel(doc, position, grid, options.size, qrDataUrl, buildToolingLabelLines(tool, options.fields, t));
    options.onProgress?.(index + 1, total);
    // Yield to the browser so the progress indicator can repaint on large batches.
    if ((index + 1) % 8 === 0) await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }

  downloadBlob(doc.output('blob'), filenameWithDate('tooling-qr-labels', 'pdf'));
  return total;
}
