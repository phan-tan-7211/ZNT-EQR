import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ExternalLink, FileClock, FilePlus2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import EquipmentImagesTab from '@/features/equipment/components/EquipmentImagesTab';
import type { ToolingTabProps } from '@/features/tooling/components/toolingTabProps';
import { useToolingDesigns } from '@/features/tooling/hooks/useTooling';
import {
  useReleaseToolingDrawingRevision,
  useToolingDrawingRevisions,
} from '@/features/tooling/hooks/useToolingRevisions';
import type { ToolingDrawingRevision, ToolingOverview } from '@/features/tooling/types';
import { toolingErrorMessage } from '@/features/tooling/utils/toolingErrors';
import { useFormatTimestamp } from '@/hooks/useFormatTimestamp';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const REVISION_STATUS_CLASS: Record<ToolingDrawingRevision['status'], string> = {
  released: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  superseded: 'border-muted-foreground/30 bg-muted text-muted-foreground',
};

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0 space-y-0.5', className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm font-medium">{children}</dd>
    </div>
  );
}

function FieldError({ show, message }: { show: boolean; message: string }) {
  if (!show) return null;
  return (
    <p className="text-sm text-destructive" role="alert">
      {message}
    </p>
  );
}

/** Today in the browser's calendar, as the YYYY-MM-DD value a date input expects. */
function todayIsoDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function isValidIsoDate(value: string): boolean {
  return ISO_DATE.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`));
}

/** Date-only values are anchored at noon UTC so time zones never shift the day. */
function dateOnly(value: string): string {
  return ISO_DATE.test(value) ? `${value}T12:00:00Z` : value;
}

function sameRevision(a: string | null | undefined, b: string | null | undefined): boolean {
  return (a ?? '').trim().toUpperCase() === (b ?? '').trim().toUpperCase();
}

function RevisionStatusBadge({ status }: { status: ToolingDrawingRevision['status'] }) {
  const { t } = useI18n();
  return (
    <Badge variant="outline" className={REVISION_STATUS_CLASS[status]} data-testid="tooling-revision-status">
      {t(`toolingInsights.revisions.status.${status}`)}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Release dialog (owner/admin)
// ---------------------------------------------------------------------------

function ReleaseRevisionDialog({
  tool,
  current,
  revisions,
  onOpenChange,
}: {
  tool: ToolingOverview;
  current: ToolingDrawingRevision | null;
  revisions: ToolingDrawingRevision[];
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const { formatDate } = useFormatTimestamp();
  const release = useReleaseToolingDrawingRevision(tool.id);
  const [revision, setRevision] = useState('');
  const [drawingNumber, setDrawingNumber] = useState(tool.drawing_number ?? '');
  const [effectiveDate, setEffectiveDate] = useState(todayIsoDate);
  const [changeDescription, setChangeDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [step, setStep] = useState<'form' | 'confirm'>('form');

  const trimmedRevision = revision.trim();
  const revisionMissing = trimmedRevision.length === 0;
  const revisionDuplicate = !revisionMissing && revisions.some((item) => sameRevision(item.revision, trimmedRevision));
  const descriptionMissing = changeDescription.trim().length === 0;
  const dateInvalid = effectiveDate !== '' && !isValidIsoDate(effectiveDate);
  const invalid = revisionMissing || revisionDuplicate || descriptionMissing || dateInvalid;

  const none = t('tooling.none');
  const previous = current?.revision ?? tool.drawing_revision?.trim() ?? '';
  const confirmMessage = current
    ? t('toolingInsights.revisions.dialog.confirmSupersede', { revision: trimmedRevision, current: current.revision })
    : previous
      ? t('toolingInsights.revisions.dialog.confirmReplaceLegacy', { revision: trimmedRevision, current: previous })
      : t('toolingInsights.revisions.dialog.confirmFirst', { revision: trimmedRevision });

  const handleContinue = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (invalid) return;
    setStep('confirm');
  };

  const handleRelease = () => {
    release.mutate(
      {
        revision: trimmedRevision,
        changeDescription: changeDescription.trim(),
        drawingNumber: drawingNumber.trim() || null,
        effectiveDate: effectiveDate || null,
      },
      {
        onSuccess: () => {
          toast.success(t('toolingInsights.revisions.dialog.success', { revision: trimmedRevision }));
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(toolingErrorMessage(error, t));
          setStep('form');
        },
      },
    );
  };

  return (
    <Dialog open onOpenChange={(open) => !release.isPending && onOpenChange(open)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {step === 'form' ? (
          <form onSubmit={handleContinue} className="space-y-4" noValidate>
            <DialogHeader>
              <DialogTitle>{t('toolingInsights.revisions.dialog.title')}</DialogTitle>
              <DialogDescription>{t('toolingInsights.revisions.dialog.description')}</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="tooling-revision-new">{t('toolingInsights.revisions.dialog.revision')}</Label>
                <Input
                  id="tooling-revision-new"
                  value={revision}
                  onChange={(event) => setRevision(event.target.value)}
                  placeholder={t('toolingInsights.revisions.dialog.revisionPlaceholder')}
                  maxLength={50}
                  autoComplete="off"
                  aria-invalid={submitted && (revisionMissing || revisionDuplicate)}
                />
                <FieldError show={submitted && revisionMissing} message={t('toolingInsights.revisions.dialog.revisionRequired')} />
                <FieldError show={submitted && revisionDuplicate} message={t('toolingInsights.revisions.dialog.revisionDuplicate')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tooling-revision-date">{t('toolingInsights.revisions.dialog.effectiveDate')}</Label>
                <Input
                  id="tooling-revision-date"
                  type="date"
                  value={effectiveDate}
                  onChange={(event) => setEffectiveDate(event.target.value)}
                  aria-invalid={submitted && dateInvalid}
                />
                <FieldError show={submitted && dateInvalid} message={t('toolingInsights.revisions.dialog.effectiveDateInvalid')} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tooling-revision-drawing">
                {t('toolingInsights.revisions.dialog.drawingNumber')}{' '}
                <span className="text-muted-foreground">({t('tooling.optional')})</span>
              </Label>
              <Input
                id="tooling-revision-drawing"
                value={drawingNumber}
                onChange={(event) => setDrawingNumber(event.target.value)}
                maxLength={100}
                autoComplete="off"
                aria-describedby="tooling-revision-drawing-help"
              />
              <p id="tooling-revision-drawing-help" className="text-xs text-muted-foreground">
                {t('toolingInsights.revisions.dialog.drawingNumberHelp')}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tooling-revision-description">{t('toolingInsights.revisions.dialog.changeDescription')}</Label>
              <Textarea
                id="tooling-revision-description"
                value={changeDescription}
                onChange={(event) => setChangeDescription(event.target.value)}
                placeholder={t('toolingInsights.revisions.dialog.changeDescriptionPlaceholder')}
                rows={3}
                maxLength={2000}
                aria-invalid={submitted && descriptionMissing}
              />
              <FieldError
                show={submitted && descriptionMissing}
                message={t('toolingInsights.revisions.dialog.changeDescriptionRequired')}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('tooling.cancel')}
              </Button>
              <Button type="submit">{t('toolingInsights.revisions.dialog.continue')}</Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t('toolingInsights.revisions.dialog.confirmTitle')}</DialogTitle>
              <DialogDescription>{t('toolingInsights.revisions.dialog.description')}</DialogDescription>
            </DialogHeader>
            <Alert className="border-amber-500/40 bg-amber-500/5" data-testid="tooling-revision-confirm">
              <AlertTriangle className="h-4 w-4 !text-amber-600 dark:!text-amber-400" aria-hidden="true" />
              <AlertDescription>{confirmMessage}</AlertDescription>
            </Alert>
            <dl className="grid grid-cols-1 gap-3 rounded-md border p-3 sm:grid-cols-2">
              <Field label={t('toolingInsights.revisions.columns.revision')}>{trimmedRevision}</Field>
              <Field label={t('toolingInsights.revisions.columns.drawingNumber')}>{drawingNumber.trim() || none}</Field>
              <Field label={t('toolingInsights.revisions.columns.effectiveDate')}>
                {effectiveDate ? formatDate(dateOnly(effectiveDate)) : none}
              </Field>
              <Field label={t('toolingInsights.revisions.columns.changeDescription')} className="sm:col-span-2">
                <span className="whitespace-pre-wrap font-normal">{changeDescription.trim()}</span>
              </Field>
            </dl>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setStep('form')} disabled={release.isPending}>
                {t('toolingInsights.revisions.dialog.back')}
              </Button>
              <Button type="button" onClick={handleRelease} disabled={release.isPending}>
                {release.isPending
                  ? t('toolingInsights.revisions.dialog.releasing')
                  : t('toolingInsights.revisions.dialog.confirm')}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Revision register card
// ---------------------------------------------------------------------------

function DrawingRevisionsCard({ tool, canManage }: { tool: ToolingOverview; canManage: boolean }) {
  const { t } = useI18n();
  const { formatDate, formatDateTime } = useFormatTimestamp();
  const { data: revisions = [], isLoading, error } = useToolingDrawingRevisions(tool.id);
  const [dialogOpen, setDialogOpen] = useState(false);
  const none = t('tooling.none');
  const retired = tool.usability_state === 'retired';
  const current = revisions.find((item) => item.status === 'released') ?? null;
  const outOfSync = current !== null && !sameRevision(tool.drawing_revision, current.revision);

  const effective = (value: string | null) => (value ? formatDate(dateOnly(value)) : none);
  const releasedLine = (item: ToolingDrawingRevision) =>
    t('toolingInsights.revisions.releasedLine', {
      name: item.released_by_name ?? none,
      time: formatDateTime(item.released_at),
    });

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 space-y-0 pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileClock className="h-4 w-4" aria-hidden="true" />
            {t('toolingInsights.revisions.title')}
          </CardTitle>
          <CardDescription>{t('toolingInsights.revisions.description')}</CardDescription>
        </div>
        {canManage && (
          <div className="flex flex-col gap-1 sm:items-end">
            <Button
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => setDialogOpen(true)}
              disabled={retired || isLoading}
              aria-describedby={retired ? 'tooling-revision-retired-hint' : undefined}
            >
              <FilePlus2 className="mr-2 h-4 w-4" aria-hidden="true" />
              {t('toolingInsights.revisions.release')}
            </Button>
            {retired && (
              <p id="tooling-revision-retired-hint" className="text-xs text-muted-foreground">
                {t('toolingInsights.revisions.retiredHint')}
              </p>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {canManage && (
          <Alert data-testid="tooling-revision-legacy-note">
            <Info className="h-4 w-4" aria-hidden="true" />
            <AlertDescription className="text-sm text-muted-foreground">
              {t('toolingInsights.revisions.legacyNote')}
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="space-y-2" aria-busy="true" aria-label={t('toolingInsights.revisions.loading')}>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertDescription>{t('toolingInsights.revisions.loadFailed')}</AlertDescription>
          </Alert>
        ) : (
          <>
            <section className="rounded-md border p-3" aria-labelledby="tooling-current-revision-title" data-testid="tooling-current-revision">
              <h3 id="tooling-current-revision-title" className="text-xs font-medium text-muted-foreground">
                {t('toolingInsights.revisions.currentTitle')}
              </h3>
              {current ? (
                <div className="mt-2 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-semibold">
                      {t('toolingInsights.revisions.revisionLabel', { revision: current.revision })}
                    </span>
                    <RevisionStatusBadge status={current.status} />
                  </div>
                  <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label={t('toolingInsights.revisions.columns.drawingNumber')}>{current.drawing_number ?? none}</Field>
                    <Field label={t('toolingInsights.revisions.columns.effectiveDate')}>{effective(current.effective_date)}</Field>
                    <Field label={t('toolingInsights.revisions.columns.releasedBy')}>{releasedLine(current)}</Field>
                    <Field label={t('toolingInsights.revisions.columns.changeDescription')} className="sm:col-span-2 lg:col-span-3">
                      <span className="whitespace-pre-wrap font-normal">{current.change_description}</span>
                    </Field>
                  </dl>
                </div>
              ) : (
                <div className="mt-1 space-y-1 text-sm">
                  <p className="text-muted-foreground">{t('toolingInsights.revisions.noneReleased')}</p>
                  {tool.drawing_revision && (
                    <p>{t('toolingInsights.revisions.legacyOnRecord', { revision: tool.drawing_revision })}</p>
                  )}
                </div>
              )}
            </section>

            {outOfSync && current && (
              <Alert className="border-amber-500/40 bg-amber-500/5" data-testid="tooling-revision-out-of-sync">
                <AlertTriangle className="h-4 w-4 !text-amber-600 dark:!text-amber-400" aria-hidden="true" />
                <AlertDescription>
                  {t('toolingInsights.revisions.outOfSync', {
                    tool: tool.drawing_revision ?? none,
                    released: current.revision,
                  })}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">{t('toolingInsights.revisions.historyTitle')}</h3>
              {revisions.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">{t('toolingInsights.revisions.empty')}</p>
              ) : (
                <>
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('toolingInsights.revisions.columns.revision')}</TableHead>
                          <TableHead>{t('toolingInsights.revisions.columns.status')}</TableHead>
                          <TableHead>{t('toolingInsights.revisions.columns.drawingNumber')}</TableHead>
                          <TableHead>{t('toolingInsights.revisions.columns.effectiveDate')}</TableHead>
                          <TableHead>{t('toolingInsights.revisions.columns.changeDescription')}</TableHead>
                          <TableHead>{t('toolingInsights.revisions.columns.releasedBy')}</TableHead>
                          <TableHead>{t('toolingInsights.revisions.columns.releasedAt')}</TableHead>
                          <TableHead>{t('toolingInsights.revisions.columns.supersededAt')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {revisions.map((item) => (
                          <TableRow key={item.id} data-testid="tooling-revision-row">
                            <TableCell className="whitespace-nowrap font-mono font-medium">{item.revision}</TableCell>
                            <TableCell>
                              <RevisionStatusBadge status={item.status} />
                            </TableCell>
                            <TableCell className="break-words">{item.drawing_number ?? none}</TableCell>
                            <TableCell className="whitespace-nowrap">{effective(item.effective_date)}</TableCell>
                            <TableCell className="max-w-[18rem] whitespace-pre-wrap break-words">{item.change_description}</TableCell>
                            <TableCell>{item.released_by_name ?? none}</TableCell>
                            <TableCell className="whitespace-nowrap">{formatDateTime(item.released_at)}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              {item.superseded_at ? formatDateTime(item.superseded_at) : none}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <ul className="space-y-3 md:hidden">
                    {revisions.map((item) => (
                      <li key={item.id} className="rounded-md border p-3 text-sm" data-testid="tooling-revision-card">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="break-words font-medium">
                              {t('toolingInsights.revisions.revisionLabel', { revision: item.revision })}
                            </p>
                            <p className="text-xs text-muted-foreground">{releasedLine(item)}</p>
                          </div>
                          <RevisionStatusBadge status={item.status} />
                        </div>
                        <p className="mt-2 whitespace-pre-wrap break-words">{item.change_description}</p>
                        <dl className="mt-2 grid grid-cols-2 gap-2">
                          <Field label={t('toolingInsights.revisions.columns.drawingNumber')}>{item.drawing_number ?? none}</Field>
                          <Field label={t('toolingInsights.revisions.columns.effectiveDate')}>{effective(item.effective_date)}</Field>
                          {item.superseded_at && (
                            <Field label={t('toolingInsights.revisions.columns.supersededAt')} className="col-span-2">
                              {formatDateTime(item.superseded_at)}
                            </Field>
                          )}
                        </dl>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </>
        )}
      </CardContent>
      {dialogOpen && canManage && (
        <ReleaseRevisionDialog tool={tool} current={current} revisions={revisions} onOpenChange={setDialogOpen} />
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Tab
// ---------------------------------------------------------------------------

export function ToolingDocumentsTab({ tool, canManage }: ToolingTabProps) {
  const { t } = useI18n();
  const none = t('tooling.none');
  const { data: designs = [], isLoading: designsLoading } = useToolingDesigns(
    tool.design_id ? tool.organization_id : undefined,
  );
  const design = tool.design_id ? designs.find((item) => item.id === tool.design_id) : undefined;
  const revisionMismatch =
    Boolean(design?.current_revision) && (tool.drawing_revision ?? '') !== (design?.current_revision ?? '');

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('toolingMaster.documents.drawingTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 sm:grid-cols-2">
              <Field label={t('toolingMaster.documents.drawingNumber')}>{tool.drawing_number ?? none}</Field>
              <Field label={t('toolingMaster.documents.drawingRevision')}>{tool.drawing_revision ?? none}</Field>
              <Field label={t('toolingMaster.documents.revisionEffectiveDate')}>
                {tool.revision_effective_date ?? none}
              </Field>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('toolingMaster.documents.designTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!tool.design_id ? (
              <p className="text-sm text-muted-foreground">{t('toolingMaster.documents.noDesign')}</p>
            ) : designsLoading ? (
              <p className="text-sm text-muted-foreground">{t('tooling.loading')}</p>
            ) : (
              <>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <Field label={t('toolingMaster.documents.designCode')}>
                    <span className="font-mono">{design?.design_code ?? tool.design_code ?? none}</span>
                  </Field>
                  <Field label={t('toolingMaster.documents.designName')}>{design?.name ?? tool.design_name ?? none}</Field>
                  <Field label={t('toolingMaster.documents.designRevision')}>{design?.current_revision ?? none}</Field>
                  <Field label={t('toolingMaster.documents.revisionEffectiveDate')}>
                    {design?.revision_effective_date ?? none}
                  </Field>
                </dl>
                {!design ? (
                  <p className="text-sm text-muted-foreground">{t('toolingMaster.documents.designNotFound')}</p>
                ) : revisionMismatch ? (
                  <Alert variant="destructive" data-testid="tooling-revision-mismatch">
                    <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                    <AlertDescription>
                      {t('toolingMaster.documents.revisionMismatch', {
                        tool: tool.drawing_revision ?? none,
                        design: design.current_revision ?? none,
                      })}
                    </AlertDescription>
                  </Alert>
                ) : design.current_revision ? (
                  <p className="flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    {t('toolingMaster.documents.revisionMatch')}
                  </p>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <DrawingRevisionsCard tool={tool} canManage={canManage} />

      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 pb-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">{t('toolingMaster.documents.attachmentsTitle')}</CardTitle>
            <CardDescription>
              {t('toolingMaster.documents.attachmentsDescription')} {t('toolingMaster.documents.moreDocuments')}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
            <Link to={`/dashboard/equipment/${tool.id}`}>
              <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
              {t('toolingMaster.documents.openEquipment')}
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <EquipmentImagesTab
            equipmentId={tool.id}
            organizationId={tool.organization_id}
            equipmentTeamId={tool.team_id ?? undefined}
            currentDisplayImage={tool.image_url ?? undefined}
            equipmentName={tool.name}
          />
        </CardContent>
      </Card>
    </div>
  );
}
