import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useOrganizationMembersQuery } from '@/features/organization/hooks/useOrganizationMembers';
import { useTeams } from '@/features/teams/hooks/useTeamManagement';
import { toolingKeys } from '@/features/tooling/hooks/toolingKeys';
import {
  useProductParts,
  useProductionOperations,
  useToolingDesigns,
  useToolingList,
} from '@/features/tooling/hooks/useTooling';
import { useToolingPermissions } from '@/features/tooling/hooks/useToolingPermissions';
import { createTooling, saveProductPart, saveProductionOperation } from '@/features/tooling/services/toolingService';
import { toolingErrorMessage } from '@/features/tooling/utils/toolingErrors';
import {
  TOOLING_IMPORT_KINDS,
  TOOLING_IMPORT_MAX_ROWS,
  buildTemplateRows,
  countImportDataRows,
  parseImportRows,
  type ParsedImportRow,
  type ToolingImportContext,
  type ToolingImportField,
  type ToolingImportKind,
  type ToolingImportParseResult,
  type ToolingImportRowError,
  type ToolingImportRowSummary,
} from '@/features/tooling/utils/toolingImportParser';
import { useI18n } from '@/i18n';
import { downloadBlob } from '@/utils/exportUtils';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const ACCEPT = `.xlsx,.csv,${XLSX_MIME},text/csv`;
const SUPPORTED_FILE = /\.(xlsx|csv)$/i;

type Step = 'select' | 'preview' | 'importing' | 'result';

interface ImportFailure {
  rowNumber: number;
  label: string;
  message: string;
}

interface ImportOutcome {
  created: number;
  failures: ImportFailure[];
  skipped: number;
}

// ---------------------------------------------------------------------------
// File helpers
// ---------------------------------------------------------------------------

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.readAsText(file);
  });
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) resolve(reader.result);
      else reject(new Error('read failed'));
    };
    reader.readAsArrayBuffer(file);
  });
}

/** First sheet as header-keyed rows. CSV is decoded as UTF-8 text so VI/KO survive. */
async function readSpreadsheetRows(file: File): Promise<Record<string, unknown>[]> {
  const XLSX = await import('xlsx');
  const workbook = /\.csv$/i.test(file.name)
    ? XLSX.read((await readFileAsText(file)).replace(/^\uFEFF/, ''), { type: 'string', raw: true })
    : XLSX.read(new Uint8Array(await readFileAsArrayBuffer(file)), { type: 'array' });
  const firstSheet = workbook.SheetNames[0];
  const sheet = firstSheet ? workbook.Sheets[firstSheet] : undefined;
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: true, blankrows: false });
}

function columnWidths(rows: string[][]): Array<{ wch: number }> {
  const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
  return Array.from({ length: columnCount }, (_, column) => ({
    wch: Math.min(60, Math.max(12, ...rows.map((row) => (row[column] ?? '').length + 2))),
  }));
}

async function importRow(organizationId: string, row: ParsedImportRow): Promise<void> {
  switch (row.kind) {
    case 'tools':
      await createTooling(organizationId, row.payload);
      return;
    case 'products':
      await saveProductPart(organizationId, row.payload);
      return;
    case 'operations':
      await saveProductionOperation(organizationId, row.payload);
      return;
  }
}

// ---------------------------------------------------------------------------
// Dialog
// ---------------------------------------------------------------------------

export interface ToolingImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  /** Entity kind preselected when the dialog opens (default `tools`). */
  defaultKind?: ToolingImportKind;
}

/**
 * Bulk import for tools, product parts and production operations (org
 * owner/admin). Choose kind → download template → upload .xlsx/.csv → review
 * per-row errors → import valid rows one by one → summary.
 */
export function ToolingImportDialog({
  open,
  onOpenChange,
  organizationId,
  defaultKind = 'tools',
}: ToolingImportDialogProps) {
  const [busy, setBusy] = useState(false);
  const blockWhileBusy = (event: Event) => {
    if (busy) event.preventDefault();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent
        size="xl"
        className="max-h-[90vh] overflow-y-auto"
        data-testid="tooling-import-dialog"
        onEscapeKeyDown={blockWhileBusy}
        onInteractOutside={blockWhileBusy}
      >
        {open && (
          <ToolingImportFlow
            organizationId={organizationId}
            defaultKind={defaultKind}
            onBusyChange={setBusy}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface ToolingImportFlowProps {
  organizationId: string;
  defaultKind: ToolingImportKind;
  onBusyChange: (busy: boolean) => void;
  onClose: () => void;
}

function ToolingImportFlow({ organizationId, defaultKind, onBusyChange, onClose }: ToolingImportFlowProps) {
  const { t, language } = useI18n();
  const { canManage } = useToolingPermissions();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const [kind, setKind] = useState<ToolingImportKind>(defaultKind);
  const [step, setStep] = useState<Step>('select');
  const [fileName, setFileName] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [templateBusy, setTemplateBusy] = useState(false);
  const [parsed, setParsed] = useState<ToolingImportParseResult | null>(null);
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null);

  // Never leave the parent dialog locked if this flow unmounts mid-import.
  useEffect(() => () => onBusyChange(false), [onBusyChange]);

  // Reference data for validation — only the queries the selected kind needs.
  const needsTools = canManage && kind === 'tools';
  const toolsQuery = useToolingList(needsTools ? organizationId : undefined);
  const designsQuery = useToolingDesigns(needsTools ? organizationId : undefined);
  const membersQuery = useOrganizationMembersQuery(needsTools ? organizationId : '');
  const teamsQuery = useTeams(organizationId, { enabled: needsTools });
  const partsQuery = useProductParts(canManage && kind === 'products' ? organizationId : undefined);
  const operationsQuery = useProductionOperations(canManage && kind === 'operations' ? organizationId : undefined);

  const referenceStates: Array<{ isLoading: boolean; isError: boolean }> =
    kind === 'tools'
      ? [toolsQuery, designsQuery, membersQuery, teamsQuery]
      : kind === 'products'
        ? [partsQuery]
        : [operationsQuery];
  const referenceLoading = referenceStates.some((state) => state.isLoading);
  const referenceError = referenceStates.some((state) => state.isError);

  const context = useMemo<ToolingImportContext>(
    () => ({
      existingTools: toolsQuery.data ?? [],
      existingPartNumbers: (partsQuery.data ?? []).map((part) => part.part_number),
      existingOperationCodes: (operationsQuery.data ?? []).map((operation) => operation.code),
      teams: (teamsQuery.data ?? []).map((team) => ({ id: team.id, name: team.name })),
      members: (membersQuery.data ?? [])
        .filter((member) => member.status === 'active')
        .map((member) => ({ id: member.userId, email: member.email })),
      designs: designsQuery.data ?? [],
    }),
    [toolsQuery.data, partsQuery.data, operationsQuery.data, teamsQuery.data, membersQuery.data, designsQuery.data],
  );

  const fieldLabel = (resultKind: ToolingImportKind, field: ToolingImportField) =>
    t(`toolingImport.columns.${resultKind}.${field}`);

  const errorMessage = (resultKind: ToolingImportKind, error: ToolingImportRowError) =>
    t(`toolingImport.validation.${error.code}`, {
      field: fieldLabel(resultKind, error.field),
      value: error.value ?? '',
      row: error.duplicateOfRow ?? '',
    });

  const resetToSelect = () => {
    setStep('select');
    setParsed(null);
    setOutcome(null);
    setFileName('');
    setFileError(null);
    setOnlyErrors(false);
  };

  const handleDownloadTemplate = async () => {
    setTemplateBusy(true);
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.utils.book_new();
      for (const sheet of buildTemplateRows(kind, language)) {
        const worksheet = XLSX.utils.aoa_to_sheet(sheet.rows);
        worksheet['!cols'] = columnWidths(sheet.rows);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
      }
      const buffer: ArrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      downloadBlob(new Blob([buffer], { type: XLSX_MIME }), `tooling-${kind}-import-template.xlsx`);
    } catch {
      toast.error(t('toolingImport.templateFailed'));
    } finally {
      setTemplateBusy(false);
    }
  };

  const handleFile = async (file: File) => {
    setFileError(null);
    if (!SUPPORTED_FILE.test(file.name)) {
      setFileError(t('toolingImport.fileErrors.unsupported'));
      return;
    }
    setReading(true);
    try {
      const rows = await readSpreadsheetRows(file);
      const dataRows = countImportDataRows(rows);
      if (dataRows === 0) {
        setFileError(t('toolingImport.fileErrors.empty'));
        return;
      }
      if (dataRows > TOOLING_IMPORT_MAX_ROWS) {
        setFileError(t('toolingImport.fileErrors.tooManyRows', { count: dataRows, max: TOOLING_IMPORT_MAX_ROWS }));
        return;
      }
      const result = parseImportRows(kind, rows, context);
      if (result.recognizedColumns.length === 0) {
        setFileError(t('toolingImport.fileErrors.noKnownColumns'));
        return;
      }
      setParsed(result);
      setFileName(file.name);
      setOnlyErrors(false);
      setStep('preview');
    } catch {
      setFileError(t('toolingImport.fileErrors.unreadable'));
    } finally {
      setReading(false);
    }
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Allow re-selecting the same file after fixing it.
    event.target.value = '';
    if (file) void handleFile(file);
  };

  const uploadDisabled = !canManage || reading || referenceLoading || referenceError;

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file && !uploadDisabled) void handleFile(file);
  };

  const runImport = async () => {
    if (!parsed || parsed.valid.length === 0 || !canManage) return;
    const rows = parsed.valid;
    onBusyChange(true);
    setStep('importing');
    setProgress({ done: 0, total: rows.length });
    let created = 0;
    const failures: ImportFailure[] = [];
    for (const [index, row] of rows.entries()) {
      try {
        await importRow(organizationId, row);
        created += 1;
      } catch (error) {
        failures.push({ rowNumber: row.rowNumber, label: row.label, message: toolingErrorMessage(error, t) });
      }
      setProgress({ done: index + 1, total: rows.length });
    }
    // Refetch in the background so the summary shows immediately.
    void queryClient.invalidateQueries({ queryKey: toolingKeys.all });
    // New tools are TL equipment rows and also appear in the equipment list.
    if (parsed.kind === 'tools' && created > 0) void queryClient.invalidateQueries({ queryKey: ['equipment'] });
    setOutcome({ created, failures, skipped: parsed.rows.length - parsed.valid.length });
    setStep('result');
    onBusyChange(false);
  };

  const header = (
    <DialogHeader>
      <DialogTitle>{t('toolingImport.title')}</DialogTitle>
      <DialogDescription>{t('toolingImport.description')}</DialogDescription>
    </DialogHeader>
  );

  if (!canManage) {
    return (
      <>
        {header}
        <Alert variant="destructive">
          <AlertDescription>{t('toolingImport.noPermission')}</AlertDescription>
        </Alert>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('toolingImport.result.close')}
          </Button>
        </DialogFooter>
      </>
    );
  }

  if (step === 'select') {
    return (
      <>
        {header}
        <div className="space-y-5">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t('toolingImport.kindLegend')}</legend>
            <RadioGroup
              value={kind}
              onValueChange={(value) => {
                const next = TOOLING_IMPORT_KINDS.find((candidate) => candidate === value);
                if (next) {
                  setKind(next);
                  setFileError(null);
                }
              }}
              className="grid gap-2 sm:grid-cols-3"
              disabled={reading}
            >
              {TOOLING_IMPORT_KINDS.map((option) => (
                <Label
                  key={option}
                  htmlFor={`tooling-import-kind-${option}`}
                  className="flex cursor-pointer items-start gap-3 rounded-md border p-3 font-normal has-data-[state=checked]:border-primary"
                >
                  <RadioGroupItem value={option} id={`tooling-import-kind-${option}`} className="mt-0.5" />
                  <span className="min-w-0 space-y-1">
                    <span className="block font-medium">{t(`toolingImport.kinds.${option}`)}</span>
                    <span className="block text-xs text-muted-foreground">
                      {t(`toolingImport.kindDescriptions.${option}`)}
                    </span>
                  </span>
                </Label>
              ))}
            </RadioGroup>
          </fieldset>

          <section className="space-y-2 rounded-md border p-3 sm:p-4" aria-labelledby="tooling-import-template-title">
            <h3 id="tooling-import-template-title" className="text-sm font-semibold">
              {t('toolingImport.templateTitle')}
            </h3>
            <p className="text-sm text-muted-foreground">{t('toolingImport.templateHint')}</p>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => void handleDownloadTemplate()}
              disabled={templateBusy}
            >
              {templateBusy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              {t('toolingImport.downloadTemplate')}
            </Button>
          </section>

          <section className="space-y-2" aria-labelledby="tooling-import-upload-title">
            <h3 id="tooling-import-upload-title" className="text-sm font-semibold">
              {t('toolingImport.uploadTitle')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('toolingImport.uploadHint', { max: TOOLING_IMPORT_MAX_ROWS })}
            </p>
            <div
              className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed p-4 text-center sm:p-6"
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
              data-testid="tooling-import-dropzone"
            >
              <FileSpreadsheet className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
              <Button
                type="button"
                className="w-full sm:w-auto"
                onClick={() => inputRef.current?.click()}
                disabled={uploadDisabled}
              >
                {reading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
                )}
                {reading ? t('toolingImport.reading') : t('toolingImport.chooseFile')}
              </Button>
              <p className="text-xs text-muted-foreground">{t('toolingImport.dropHint')}</p>
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                className="sr-only"
                tabIndex={-1}
                aria-label={t('toolingImport.uploadAria')}
                onChange={handleInputChange}
                disabled={uploadDisabled}
              />
            </div>
            {referenceLoading && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                {t('toolingImport.loadingReference')}
              </p>
            )}
            {referenceError && (
              <Alert variant="destructive">
                <AlertDescription>{t('toolingImport.referenceFailed')}</AlertDescription>
              </Alert>
            )}
            {fileError && (
              <Alert variant="destructive" data-testid="tooling-import-file-error">
                <XCircle className="h-4 w-4" aria-hidden="true" />
                <AlertDescription>{fileError}</AlertDescription>
              </Alert>
            )}
          </section>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('toolingImport.result.close')}
          </Button>
        </DialogFooter>
      </>
    );
  }

  if (step === 'result' && outcome) {
    return (
      <>
        {header}
        <ImportResult outcome={outcome} t={t} />
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={resetToSelect}>
            {t('toolingImport.result.importAnother')}
          </Button>
          <Button onClick={onClose}>{t('toolingImport.result.close')}</Button>
        </DialogFooter>
      </>
    );
  }

  if (!parsed) return header;

  if (step === 'importing') {
    const percent = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
    return (
      <>
        {header}
        <div className="space-y-3" data-testid="tooling-import-progress">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {t('toolingImport.progress.title')}
          </p>
          <Progress
            value={percent}
            aria-label={t('toolingImport.progress.label')}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
          />
          <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
            {t('toolingImport.progress.status', { done: progress.done, total: progress.total })}
          </p>
          <p className="text-xs text-muted-foreground">{t('toolingImport.progress.keepOpen')}</p>
        </div>
      </>
    );
  }

  const invalidCount = parsed.rows.length - parsed.valid.length;
  const visibleRows = onlyErrors ? parsed.rows.filter((row) => row.errors.length > 0) : parsed.rows;

  return (
    <>
      {header}
      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">{t('toolingImport.preview.title')}</h3>
          <p className="break-all text-sm text-muted-foreground">
            {t('toolingImport.preview.fileName', { name: fileName })}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <StatTile label={t('toolingImport.preview.total')} value={parsed.rows.length} />
          <StatTile label={t('toolingImport.preview.ready')} value={parsed.valid.length} tone="success" />
          <StatTile label={t('toolingImport.preview.withErrors')} value={invalidCount} tone="error" />
        </div>

        {parsed.missingColumns.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>
              {t('toolingImport.preview.missingColumns', {
                columns: parsed.missingColumns.map((field) => fieldLabel(parsed.kind, field)).join(', '),
              })}
            </AlertDescription>
          </Alert>
        )}
        {parsed.unknownHeaders.length > 0 && (
          <p className="break-words text-xs text-muted-foreground">
            {t('toolingImport.preview.ignoredColumns', { columns: parsed.unknownHeaders.join(', ') })}
          </p>
        )}
        {invalidCount > 0 && <p className="text-sm text-muted-foreground">{t('toolingImport.preview.errorsNote')}</p>}

        {invalidCount > 0 && (
          <div className="flex items-center gap-2">
            <Switch id="tooling-import-only-errors" checked={onlyErrors} onCheckedChange={setOnlyErrors} />
            <Label htmlFor="tooling-import-only-errors" className="font-normal">
              {t('toolingImport.preview.onlyErrors')}
            </Label>
          </div>
        )}

        <div
          role="region"
          aria-label={t('toolingImport.preview.regionLabel')}
          className="max-h-[45vh] overflow-y-auto rounded-md border"
        >
          {visibleRows.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">{t('toolingImport.preview.noRows')}</p>
          ) : (
            <>
              <div className="hidden md:block" data-testid="tooling-import-preview-table">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">{t('toolingImport.preview.row')}</TableHead>
                      <TableHead>{t('toolingImport.preview.record')}</TableHead>
                      <TableHead className="w-28">{t('toolingImport.preview.status')}</TableHead>
                      <TableHead>{t('toolingImport.preview.issues')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleRows.map((row) => (
                      <TableRow key={row.rowNumber}>
                        <TableCell className="font-mono text-xs">{row.rowNumber}</TableCell>
                        <TableCell className="max-w-[16rem] break-words font-medium">
                          {row.label || t('toolingImport.preview.unnamed')}
                        </TableCell>
                        <TableCell>
                          <RowStatusBadge row={row} t={t} />
                        </TableCell>
                        <TableCell>
                          <RowIssues row={row} kind={parsed.kind} errorMessage={errorMessage} t={t} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <ul className="divide-y md:hidden" data-testid="tooling-import-preview-cards">
                {visibleRows.map((row) => (
                  <li key={row.rowNumber} className="space-y-1.5 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">
                          {t('toolingImport.preview.rowNumber', { row: row.rowNumber })}
                        </p>
                        <p className="break-words text-sm font-medium">
                          {row.label || t('toolingImport.preview.unnamed')}
                        </p>
                      </div>
                      <RowStatusBadge row={row} t={t} />
                    </div>
                    {row.errors.length > 0 && (
                      <RowIssues row={row} kind={parsed.kind} errorMessage={errorMessage} t={t} />
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="outline" onClick={resetToSelect}>
          {t('toolingImport.preview.back')}
        </Button>
        <Button onClick={() => void runImport()} disabled={parsed.valid.length === 0}>
          <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
          {t('toolingImport.preview.import', { count: parsed.valid.length })}
        </Button>
      </DialogFooter>
    </>
  );
}

// ---------------------------------------------------------------------------
// Presentational pieces
// ---------------------------------------------------------------------------

type Translate = (key: string, params?: Record<string, string | number>) => string;

function StatTile({ label, value, tone }: { label: string; value: number; tone?: 'success' | 'error' }) {
  const toneClass =
    tone === 'success'
      ? 'text-emerald-700 dark:text-emerald-300'
      : tone === 'error' && value > 0
        ? 'text-destructive'
        : 'text-foreground';
  return (
    <div className="min-w-0 rounded-md border p-2 sm:p-3">
      <p className="text-[11px] leading-tight text-muted-foreground sm:text-xs">{label}</p>
      <p className={`text-lg font-semibold sm:text-2xl ${toneClass}`}>{value.toLocaleString()}</p>
    </div>
  );
}

function RowStatusBadge({ row, t }: { row: ToolingImportRowSummary; t: Translate }) {
  return row.errors.length === 0 ? (
    <Badge
      variant="outline"
      className="shrink-0 border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    >
      {t('toolingImport.preview.statusReady')}
    </Badge>
  ) : (
    <Badge variant="destructive" className="shrink-0">
      {t('toolingImport.preview.statusError')}
    </Badge>
  );
}

function RowIssues({
  row,
  kind,
  errorMessage,
  t,
}: {
  row: ToolingImportRowSummary;
  kind: ToolingImportKind;
  errorMessage: (kind: ToolingImportKind, error: ToolingImportRowError) => string;
  t: Translate;
}) {
  if (row.errors.length === 0) {
    return <span className="text-xs text-muted-foreground">{t('toolingImport.preview.noIssues')}</span>;
  }
  return (
    <ul className="space-y-0.5 text-xs text-destructive">
      {row.errors.map((error, index) => (
        <li key={`${error.field}-${error.code}-${index}`} className="break-words">
          {errorMessage(kind, error)}
        </li>
      ))}
    </ul>
  );
}

function ImportResult({ outcome, t }: { outcome: ImportOutcome; t: Translate }) {
  const allCreated = outcome.failures.length === 0 && outcome.skipped === 0;
  return (
    <div className="space-y-4" data-testid="tooling-import-result">
      <p className="flex items-center gap-2 text-sm font-semibold" role="status">
        {outcome.failures.length === 0 ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" />
        )}
        {allCreated ? t('toolingImport.result.allCreated', { count: outcome.created }) : t('toolingImport.result.title')}
      </p>
      <div className="grid grid-cols-3 gap-2">
        <StatTile label={t('toolingImport.result.created')} value={outcome.created} tone="success" />
        <StatTile label={t('toolingImport.result.failed')} value={outcome.failures.length} tone="error" />
        <StatTile label={t('toolingImport.result.skipped')} value={outcome.skipped} />
      </div>
      {outcome.failures.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">{t('toolingImport.result.failedTitle')}</h3>
          <ul
            className="max-h-[40vh] divide-y overflow-y-auto rounded-md border"
            aria-label={t('toolingImport.result.failedTitle')}
            data-testid="tooling-import-failures"
          >
            {outcome.failures.map((failure) => (
              <li key={failure.rowNumber} className="space-y-0.5 p-3 text-sm">
                <p className="break-words font-medium">
                  {t('toolingImport.preview.rowNumber', { row: failure.rowNumber })}
                  {failure.label ? ` · ${failure.label}` : ''}
                </p>
                <p className="break-words text-destructive">{failure.message}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
