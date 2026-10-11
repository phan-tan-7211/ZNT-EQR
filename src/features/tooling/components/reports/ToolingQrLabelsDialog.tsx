import { useMemo, useState } from 'react';
import { Loader2, QrCode, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  computeToolingLabelGrid,
  DEFAULT_TOOLING_LABEL_FIELDS,
  downloadToolingQrLabels,
  TOOLING_LABEL_FIELD_KEYS,
  TOOLING_LABEL_SIZE_KEYS,
  TOOLING_LABEL_SIZES,
  ToolingPdfFontError,
  type ToolingLabelFields,
  type ToolingLabelSize,
} from '@/features/tooling/services/toolingExportService';
import type { ToolingOverview } from '@/features/tooling/types';
import { useI18n } from '@/i18n';
import { logger } from '@/utils/logger';

export interface ToolingQrLabelsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Candidate tools (e.g. the currently filtered list); all are pre-selected on open. */
  tools: ToolingOverview[];
}

function isLabelSize(value: string): value is ToolingLabelSize {
  return (TOOLING_LABEL_SIZE_KEYS as readonly string[]).includes(value);
}

const allIds = (tools: ToolingOverview[]) => new Set(tools.map((tool) => tool.id));

/** Pick tools, a label size and the printed fields, then download an A4 sheet of QR labels. */
export function ToolingQrLabelsDialog({ open, onOpenChange, tools }: ToolingQrLabelsDialogProps) {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(() => allIds(tools));
  const [size, setSize] = useState<ToolingLabelSize>('medium');
  const [fields, setFields] = useState<ToolingLabelFields>(DEFAULT_TOOLING_LABEL_FIELDS);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [wasOpen, setWasOpen] = useState(open);
  const generating = progress !== null;

  // Reset the selection and search each time the dialog opens.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setSelected(allIds(tools));
      setSearch('');
    }
  }

  const query = search.trim().toLowerCase();
  const visibleTools = useMemo(() => {
    if (!query) return tools;
    return tools.filter((tool) =>
      [tool.name, tool.management_code, tool.storage_location, t(`tooling.types.${tool.tooling_type}`)].some((value) =>
        value?.toLowerCase().includes(query),
      ),
    );
  }, [tools, query, t]);
  const selectedTools = useMemo(() => tools.filter((tool) => selected.has(tool.id)), [tools, selected]);
  const allVisibleSelected = visibleTools.length > 0 && visibleTools.every((tool) => selected.has(tool.id));
  const noneVisibleSelected = visibleTools.every((tool) => !selected.has(tool.id));

  const setToolSelected = (toolId: string, checked: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(toolId);
      else next.delete(toolId);
      return next;
    });
  };

  const setVisibleSelected = (checked: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      for (const tool of visibleTools) {
        if (checked) next.add(tool.id);
        else next.delete(tool.id);
      }
      return next;
    });
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && generating) return;
    onOpenChange(next);
  };

  const handleDownload = async () => {
    if (selectedTools.length === 0 || generating) return;
    setProgress({ done: 0, total: selectedTools.length });
    try {
      const count = await downloadToolingQrLabels(
        selectedTools,
        { size, fields, onProgress: (done, total) => setProgress({ done, total }) },
        t,
      );
      toast.success(t('toolingReports.labels.success', { count }));
      onOpenChange(false);
    } catch (error) {
      logger.error('Tooling QR label generation failed', error);
      toast.error(
        error instanceof ToolingPdfFontError ? t('toolingReports.errors.fontLoad') : t('toolingReports.errors.labelsFailed'),
      );
    } finally {
      setProgress(null);
    }
  };

  const percent = progress ? Math.round((progress.done / Math.max(progress.total, 1)) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="lg" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" aria-hidden="true" />
            {t('toolingReports.labels.title')}
          </DialogTitle>
          <DialogDescription>{t('toolingReports.labels.description')}</DialogDescription>
        </DialogHeader>

        <fieldset className="min-w-0 space-y-2" disabled={generating}>
          <legend className="text-sm font-medium">{t('toolingReports.labels.toolsLegend')}</legend>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('toolingReports.labels.searchPlaceholder')}
              aria-label={t('toolingReports.labels.searchAria')}
              className="pl-8"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {t('toolingReports.labels.selectedCount', { selected: selectedTools.length, total: tools.length })}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setVisibleSelected(true)}
                disabled={allVisibleSelected || visibleTools.length === 0}
              >
                {t('toolingReports.labels.selectAll')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setVisibleSelected(false)}
                disabled={noneVisibleSelected}
              >
                {t('toolingReports.labels.selectNone')}
              </Button>
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto rounded-md border" data-testid="tooling-label-tool-list">
            {tools.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">{t('toolingReports.labels.noTools')}</p>
            ) : visibleTools.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">{t('toolingReports.labels.noMatches')}</p>
            ) : (
              <ul className="divide-y">
                {visibleTools.map((tool) => {
                  const inputId = `tooling-label-tool-${tool.id}`;
                  const meta = [tool.management_code, t(`tooling.types.${tool.tooling_type}`), tool.storage_location]
                    .filter((value): value is string => Boolean(value))
                    .join(' · ');
                  return (
                    <li key={tool.id} className="flex items-start gap-3 px-3 py-2">
                      <Checkbox
                        id={inputId}
                        className="mt-0.5"
                        checked={selected.has(tool.id)}
                        onCheckedChange={(checked) => setToolSelected(tool.id, checked === true)}
                      />
                      <Label htmlFor={inputId} className="flex min-w-0 flex-1 cursor-pointer flex-col gap-1 font-normal">
                        <span className="break-words font-medium">{tool.name}</span>
                        {meta && <span className="break-words text-xs text-muted-foreground">{meta}</span>}
                      </Label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </fieldset>

        <div className="space-y-2">
          <p id="tooling-label-size-heading" className="text-sm font-medium">
            {t('toolingReports.labels.sizeLegend')}
          </p>
          <RadioGroup
            value={size}
            onValueChange={(value) => {
              if (isLabelSize(value)) setSize(value);
            }}
            aria-labelledby="tooling-label-size-heading"
            className="grid gap-2 sm:grid-cols-3"
            disabled={generating}
          >
            {TOOLING_LABEL_SIZE_KEYS.map((key) => {
              const dimensions = TOOLING_LABEL_SIZES[key];
              const itemId = `tooling-label-size-${key}`;
              return (
                <Label
                  key={key}
                  htmlFor={itemId}
                  className="flex cursor-pointer items-start gap-2 rounded-md border p-3 font-normal has-[[data-state=checked]]:border-primary"
                >
                  <RadioGroupItem id={itemId} value={key} className="mt-0.5" />
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="font-medium">{t(`toolingReports.labels.sizes.${key}`)}</span>
                    <span className="text-xs text-muted-foreground">
                      {t('toolingReports.labels.sizeDimensions', {
                        width: dimensions.width,
                        height: dimensions.height,
                      })}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t('toolingReports.labels.perPage', { count: computeToolingLabelGrid(key).perPage })}
                    </span>
                  </span>
                </Label>
              );
            })}
          </RadioGroup>
        </div>

        <fieldset className="min-w-0 space-y-2" disabled={generating}>
          <legend className="text-sm font-medium">{t('toolingReports.labels.fieldsLegend')}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {TOOLING_LABEL_FIELD_KEYS.map((key) => {
              const fieldId = `tooling-label-field-${key}`;
              return (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox
                    id={fieldId}
                    checked={fields[key]}
                    onCheckedChange={(checked) => setFields((current) => ({ ...current, [key]: checked === true }))}
                  />
                  <Label htmlFor={fieldId} className="cursor-pointer font-normal">
                    {t(`toolingReports.labels.fields.${key}`)}
                  </Label>
                </div>
              );
            })}
          </div>
        </fieldset>

        {progress && (
          <div className="space-y-1" role="status" aria-live="polite">
            <Progress value={percent} className="h-2" aria-label={t('toolingReports.labels.generating')} />
            <p className="text-xs text-muted-foreground">
              {t('toolingReports.labels.progress', { done: progress.done, total: progress.total })}
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={generating}>
            {t('toolingReports.labels.cancel')}
          </Button>
          <Button
            type="button"
            onClick={() => void handleDownload()}
            disabled={selectedTools.length === 0 || generating}
            aria-busy={generating}
          >
            {generating && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {generating ? t('toolingReports.labels.generating') : t('toolingReports.labels.download')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
