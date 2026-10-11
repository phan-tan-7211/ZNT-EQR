import { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, FileText, FileType, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  downloadCustomerOwnedReport,
  downloadToolingRegister,
  ToolingPdfFontError,
  type ToolingExportFormat,
} from '@/features/tooling/services/toolingExportService';
import type { ToolingOverview } from '@/features/tooling/types';
import { useFormatTimestamp } from '@/hooks/useFormatTimestamp';
import { useI18n } from '@/i18n';
import { logger } from '@/utils/logger';

type ReportKind = 'register' | 'customerOwned';

const FORMAT_ITEMS: ReadonlyArray<{ format: ToolingExportFormat; labelKey: string; Icon: typeof FileText }> = [
  { format: 'csv', labelKey: 'toolingReports.export.csv', Icon: FileText },
  { format: 'xlsx', labelKey: 'toolingReports.export.excel', Icon: FileSpreadsheet },
  { format: 'pdf', labelKey: 'toolingReports.export.pdf', Icon: FileType },
];

export interface ToolingExportMenuProps {
  /** Tools to export — pass the currently filtered list. */
  tools: ToolingOverview[];
  /** Printed in PDF headers when provided. */
  organizationName?: string | null;
}

/** "Export" dropdown: tooling register and customer-owned report as CSV / Excel / PDF. */
export function ToolingExportMenu({ tools, organizationName }: ToolingExportMenuProps) {
  const { t, language } = useI18n();
  const { formatDateTime } = useFormatTimestamp();
  const [busy, setBusy] = useState(false);
  const customerOwnedCount = useMemo(
    () => tools.filter((tool) => tool.ownership_type === 'customer').length,
    [tools],
  );

  const runExport = async (kind: ReportKind, format: ToolingExportFormat) => {
    if (busy) return;
    setBusy(true);
    try {
      const options = { locale: language, organizationName, formatDateTime };
      if (kind === 'register') {
        await downloadToolingRegister(tools, format, t, 'tooling-register', options);
      } else {
        await downloadCustomerOwnedReport(tools, format, t, 'tooling-customer-owned', options);
      }
      toast.success(t('toolingReports.export.success'));
    } catch (error) {
      logger.error('Tooling export failed', error);
      toast.error(
        error instanceof ToolingPdfFontError ? t('toolingReports.errors.fontLoad') : t('toolingReports.errors.exportFailed'),
      );
    } finally {
      setBusy(false);
    }
  };

  const renderFormatItems = (kind: ReportKind, disabled: boolean) =>
    FORMAT_ITEMS.map(({ format, labelKey, Icon }) => (
      <DropdownMenuItem
        key={`${kind}-${format}`}
        disabled={disabled || busy}
        onSelect={() => void runExport(kind, format)}
        className="cursor-pointer gap-2"
      >
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <span>{t(labelKey)}</span>
      </DropdownMenuItem>
    ));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={tools.length === 0 || busy}
          aria-label={t('toolingReports.export.buttonAria')}
          aria-busy={busy}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Download className="h-4 w-4" aria-hidden="true" />
          )}
          <span>{busy ? t('toolingReports.export.exporting') : t('toolingReports.export.button')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 max-w-[calc(100vw-2rem)]">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span>{t('toolingReports.export.register')}</span>
          <span className="text-xs font-normal text-muted-foreground">
            {t('toolingReports.export.toolCount', { count: tools.length })}
          </span>
        </DropdownMenuLabel>
        {renderFormatItems('register', tools.length === 0)}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span>{t('toolingReports.export.customerOwned')}</span>
          <span className="text-xs font-normal text-muted-foreground">
            {customerOwnedCount === 0
              ? t('toolingReports.export.customerOwnedEmpty')
              : t('toolingReports.export.toolCount', { count: customerOwnedCount })}
          </span>
        </DropdownMenuLabel>
        {renderFormatItems('customerOwned', customerOwnedCount === 0)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
