import { useState, type ReactNode } from 'react';
import { CheckCircle2, Pencil, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useOrganizationMembersQuery } from '@/features/organization/hooks/useOrganizationMembers';
import { ToolingUsabilityBadge } from '@/features/tooling/components/ToolingStatusBadges';
import { ToolingFormDialog } from '@/features/tooling/components/master/ToolingFormDialog';
import type { ToolingTabProps } from '@/features/tooling/components/toolingTabProps';
import { useApproveTooling } from '@/features/tooling/hooks/useTooling';
import type { ToolingOverview } from '@/features/tooling/types';
import { toolingErrorMessage } from '@/features/tooling/utils/toolingErrors';
import {
  formatToolingNumber,
  toolingIssueBlockers,
  toolingLifePercent,
  toolingLifeTone,
  toolingRemainingLife,
  type ToolingLifeTone,
} from '@/features/tooling/utils/toolingLife';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

const LIFE_BAR_CLASS: Record<ToolingLifeTone, string> = {
  ok: 'bg-emerald-500',
  warning: 'bg-amber-500',
  limit: 'bg-destructive',
  none: 'bg-muted-foreground/40',
};

/** Compact cumulative / limit read-out with a progress bar (list + overview). */
export function ToolingLifeBar({
  tool,
  className,
}: {
  tool: Pick<ToolingOverview, 'cumulative_usage' | 'life_limit' | 'warning_limit' | 'usage_unit'>;
  className?: string;
}) {
  const { t } = useI18n();
  const percent = toolingLifePercent(tool);
  const tone = toolingLifeTone(tool);
  const unit = t(`tooling.units.${tool.usage_unit}`);
  const used = formatToolingNumber(tool.cumulative_usage);
  return (
    <div className={cn('min-w-0 space-y-1', className)} data-testid="tooling-life-bar">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 text-xs">
        <span className="font-tabular">
          {tool.life_limit != null
            ? t('toolingMaster.life.usageOfLimit', { used, limit: formatToolingNumber(tool.life_limit), unit })
            : t('toolingMaster.life.usageOnly', { used, unit })}
        </span>
        <span className="text-muted-foreground">
          {percent != null ? t('toolingMaster.life.percentUsed', { percent }) : t('toolingMaster.life.noLimit')}
        </span>
      </div>
      {percent != null && (
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.min(100, percent)}
          aria-label={t('toolingMaster.life.barLabel', { percent })}
        >
          <div className={cn('h-full rounded-full', LIFE_BAR_CLASS[tone])} style={{ width: `${Math.min(100, percent)}%` }} />
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm font-medium">{children}</dd>
    </div>
  );
}

function formatTimestamp(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function ToolingOverviewTab({ tool, canManage }: ToolingTabProps) {
  const { t } = useI18n();
  const [editOpen, setEditOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [approveNote, setApproveNote] = useState('');
  const approveMutation = useApproveTooling(tool.id);
  const { data: members = [] } = useOrganizationMembersQuery(tool.organization_id);

  const none = t('tooling.none');
  const unit = t(`tooling.units.${tool.usage_unit}`);
  const withUnit = (value: number | null) =>
    value == null ? t('toolingMaster.overview.notSet') : `${formatToolingNumber(value)} ${unit}`;
  const blockers = toolingIssueBlockers(tool);
  const remaining = toolingRemainingLife(tool);
  const approverName = tool.approved_by ? members.find((m) => m.userId === tool.approved_by)?.name : undefined;
  const canApprove = canManage && tool.approval_status !== 'approved' && tool.usability_state !== 'retired';

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync(approveNote.trim() || null);
      toast.success(t('toolingMaster.overview.approved'));
      setApproveOpen(false);
      setApproveNote('');
    } catch (error) {
      toast.error(toolingErrorMessage(error, t));
    }
  };

  return (
    <div className="space-y-4">
      {(canManage || canApprove) && (
        <div className="flex flex-wrap justify-end gap-2">
          {canManage && (
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
              {t('toolingMaster.overview.edit')}
            </Button>
          )}
          {canApprove && (
            <Button size="sm" onClick={() => setApproveOpen(true)}>
              <ShieldCheck className="mr-2 h-4 w-4" aria-hidden="true" />
              {t('toolingMaster.overview.approve')}
            </Button>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('toolingMaster.overview.identityTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 sm:grid-cols-2">
              <Field label={t('toolingMaster.overview.managementCode')}>
                <span className="font-mono">{tool.management_code ?? none}</span>
              </Field>
              <Field label={t('toolingMaster.overview.type')}>{t(`tooling.types.${tool.tooling_type}`)}</Field>
              <Field label={t('toolingMaster.overview.design')}>
                {tool.design_code ? `${tool.design_code}${tool.design_name ? ` · ${tool.design_name}` : ''}` : none}
              </Field>
              <Field label={t('toolingMaster.overview.manufacturer')}>{tool.manufacturer || none}</Field>
              <Field label={t('toolingMaster.overview.model')}>{tool.model || none}</Field>
              <Field label={t('toolingMaster.overview.serial')}>{tool.serial_number || none}</Field>
              <Field label={t('toolingMaster.overview.ownership')}>{t(`tooling.ownership.${tool.ownership_type}`)}</Field>
              <Field label={t('toolingMaster.overview.owner')}>{tool.owner_name || none}</Field>
              <Field label={t('toolingMaster.overview.responsible')}>{tool.responsible_name || none}</Field>
              <Field label={t('toolingMaster.overview.requiresMachine')}>
                {tool.requires_machine ? t('tooling.yes') : t('toolingMaster.overview.manualTool')}
              </Field>
            </dl>
            {tool.notes && (
              <div className="mt-4 space-y-0.5">
                <p className="text-xs text-muted-foreground">{t('toolingMaster.overview.notes')}</p>
                <p className="whitespace-pre-wrap break-words text-sm">{tool.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('toolingMaster.overview.statusTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid gap-3 sm:grid-cols-2">
              <Field label={t('toolingMaster.overview.usability')}>
                <ToolingUsabilityBadge state={tool.usability_state} />
              </Field>
              <Field label={t('toolingMaster.overview.condition')}>{t(`tooling.conditions.${tool.condition}`)}</Field>
              <Field label={t('toolingMaster.overview.approval')}>
                <span className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={tool.approval_status === 'approved' ? 'secondary' : 'outline'}>
                    {t(`tooling.approval.${tool.approval_status}`)}
                  </Badge>
                  {tool.approval_status === 'approved' && (
                    <span className="text-xs font-normal text-muted-foreground">
                      {[
                        approverName ? t('toolingMaster.overview.approvedBy', { name: approverName }) : null,
                        tool.approved_at
                          ? t('toolingMaster.overview.approvedAt', { date: formatTimestamp(tool.approved_at) ?? '' })
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    </span>
                  )}
                </span>
              </Field>
              <Field label={t('toolingMaster.overview.storageLocation')}>{tool.storage_location || none}</Field>
              <Field label={t('toolingMaster.overview.issuedTo')}>
                {tool.is_issued ? (tool.issued_to_name ?? none) : t('toolingMaster.overview.notIssued')}
              </Field>
              <Field label={t('toolingMaster.overview.issuedSince')}>
                {tool.is_issued ? (formatTimestamp(tool.issued_at) ?? none) : none}
              </Field>
            </dl>
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">{t('toolingMaster.overview.blockersTitle')}</p>
              {blockers.length === 0 ? (
                <p className="flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  {t('toolingMaster.overview.noBlockers')}
                </p>
              ) : (
                <ul className="list-disc space-y-0.5 pl-5 text-sm" data-testid="tooling-issue-blockers">
                  {blockers.map((blocker) => (
                    <li key={blocker}>{t(`tooling.blockers.${blocker}`)}</li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('toolingMaster.overview.lifeTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ToolingLifeBar tool={tool} className="max-w-xl" />
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label={t('toolingMaster.overview.cumulative')}>{withUnit(tool.cumulative_usage)}</Field>
              <Field label={t('toolingMaster.overview.lifeLimit')}>{withUnit(tool.life_limit)}</Field>
              <Field label={t('toolingMaster.overview.remaining')}>
                <span className={cn(remaining != null && remaining <= 0 && 'text-destructive')}>{withUnit(remaining)}</span>
              </Field>
              <Field label={t('toolingMaster.overview.warningLimit')}>{withUnit(tool.warning_limit)}</Field>
              <Field label={t('toolingMaster.overview.maintenanceInterval')}>{withUnit(tool.maintenance_interval)}</Field>
              <Field label={t('toolingMaster.overview.usageSinceMaintenance')}>{withUnit(tool.usage_since_maintenance)}</Field>
              <Field label={t('toolingMaster.overview.maintenanceStatus')}>
                {tool.maintenance_interval == null ? (
                  t('toolingMaster.overview.notSet')
                ) : tool.maintenance_due ? (
                  <span className="text-orange-700 dark:text-orange-300">{t('toolingMaster.overview.maintenanceDue')}</span>
                ) : (
                  t('toolingMaster.overview.maintenanceNotDue')
                )}
              </Field>
              <Field label={t('toolingMaster.overview.lastInspection')}>
                {formatTimestamp(tool.last_inspection_at) ?? none}
              </Field>
              <Field label={t('toolingMaster.overview.nextInspection')}>
                {tool.next_inspection_due ? (
                  <span className={cn(tool.inspection_overdue && 'text-destructive')}>
                    {tool.next_inspection_due}
                    {tool.inspection_overdue ? ` · ${t('toolingMaster.overview.overdue')}` : ''}
                  </span>
                ) : (
                  t('toolingMaster.overview.notSet')
                )}
              </Field>
            </dl>
          </CardContent>
        </Card>
      </div>

      {canManage && <ToolingFormDialog open={editOpen} onOpenChange={setEditOpen} organizationId={tool.organization_id} tool={tool} />}

      <AlertDialog
        open={approveOpen}
        onOpenChange={(open) => {
          if (!approveMutation.isPending) setApproveOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('toolingMaster.overview.approveTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('toolingMaster.overview.approveDescription', { name: tool.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="tooling-approve-note">
              {t('toolingMaster.overview.approveNote')}{' '}
              <span className="text-muted-foreground">({t('tooling.optional')})</span>
            </Label>
            <Textarea
              id="tooling-approve-note"
              value={approveNote}
              onChange={(event) => setApproveNote(event.target.value)}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={approveMutation.isPending}>{t('tooling.cancel')}</AlertDialogCancel>
            <Button onClick={handleApprove} disabled={approveMutation.isPending}>
              {approveMutation.isPending ? t('toolingMaster.overview.approving') : t('tooling.confirm')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
