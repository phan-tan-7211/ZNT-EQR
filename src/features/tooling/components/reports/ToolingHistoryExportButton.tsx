import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Download, FileSpreadsheet, FileText, FileType, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toolingKeys } from '@/features/tooling/hooks/toolingKeys';
import {
  downloadToolingHistory,
  ToolingPdfFontError,
  type ToolingExportFormat,
  type ToolingHistoryData,
} from '@/features/tooling/services/toolingExportService';
import {
  listToolingAssignments,
  listToolingEvents,
  listToolingUsageLogs,
  listToolingVerifications,
} from '@/features/tooling/services/toolingService';
import type { ToolingOverview } from '@/features/tooling/types';
import { useFormatTimestamp } from '@/hooks/useFormatTimestamp';
import { useI18n } from '@/i18n';
import { logger } from '@/utils/logger';

/** Reuse cached tab data when it is fresh enough; otherwise refetch before exporting. */
const HISTORY_STALE_TIME_MS = 30_000;

const FORMAT_ITEMS: ReadonlyArray<{ format: ToolingExportFormat; labelKey: string; Icon: typeof FileText }> = [
  { format: 'csv', labelKey: 'toolingReports.export.csv', Icon: FileText },
  { format: 'xlsx', labelKey: 'toolingReports.export.excel', Icon: FileSpreadsheet },
  { format: 'pdf', labelKey: 'toolingReports.export.pdf', Icon: FileType },
];

export interface ToolingHistoryExportButtonProps {
  tool: ToolingOverview;
}

class HistoryLoadError extends Error {}

/** Dropdown that exports one tool's issue/return, usage, inspection and event history. */
export function ToolingHistoryExportButton({ tool }: ToolingHistoryExportButtonProps) {
  const { t, language } = useI18n();
  const { formatDateTime } = useFormatTimestamp();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const loadHistory = async (): Promise<ToolingHistoryData> => {
    try {
      const [assignments, usage, verifications, events] = await Promise.all([
        queryClient.fetchQuery({
          queryKey: toolingKeys.assignments(tool.id),
          queryFn: () => listToolingAssignments(tool.id),
          staleTime: HISTORY_STALE_TIME_MS,
        }),
        queryClient.fetchQuery({
          queryKey: toolingKeys.usage(tool.id),
          queryFn: () => listToolingUsageLogs(tool.id),
          staleTime: HISTORY_STALE_TIME_MS,
        }),
        queryClient.fetchQuery({
          queryKey: toolingKeys.verifications(tool.id),
          queryFn: () => listToolingVerifications(tool.id),
          staleTime: HISTORY_STALE_TIME_MS,
        }),
        queryClient.fetchQuery({
          queryKey: toolingKeys.events(tool.id),
          queryFn: () => listToolingEvents(tool.id),
          staleTime: HISTORY_STALE_TIME_MS,
        }),
      ]);
      return { assignments, usage, verifications, events };
    } catch (error) {
      logger.error('Tooling history load for export failed', error);
      throw new HistoryLoadError();
    }
  };

  const runExport = async (format: ToolingExportFormat) => {
    if (busy) return;
    setBusy(true);
    try {
      const data = await loadHistory();
      await downloadToolingHistory(tool, data, format, t, { locale: language, formatDateTime });
      toast.success(t('toolingReports.history.success'));
    } catch (error) {
      if (!(error instanceof HistoryLoadError)) logger.error('Tooling history export failed', error);
      toast.error(
        error instanceof HistoryLoadError
          ? t('toolingReports.errors.historyLoad')
          : error instanceof ToolingPdfFontError
            ? t('toolingReports.errors.fontLoad')
            : t('toolingReports.errors.exportFailed'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          aria-label={t('toolingReports.history.buttonAria', { name: tool.name })}
          aria-busy={busy}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Download className="h-4 w-4" aria-hidden="true" />
          )}
          <span>{busy ? t('toolingReports.history.preparing') : t('toolingReports.history.button')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 max-w-[calc(100vw-2rem)]">
        {FORMAT_ITEMS.map(({ format, labelKey, Icon }) => (
          <DropdownMenuItem
            key={format}
            disabled={busy}
            onSelect={() => void runExport(format)}
            className="cursor-pointer gap-2"
          >
            <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <span>{t(labelKey)}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
