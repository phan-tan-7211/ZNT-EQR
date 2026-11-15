/**
 * Building blocks shared by the tooling operation tabs (Issue / Return,
 * Usage & Tool Life, PM / Repair / Inspection): their presets of the tooling
 * form dialog and load-state view, the mandatory reason field and the
 * out-of-service dialog.
 */
import { useState, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  FieldError,
  FormDialogShell,
  ListMessage,
  LoadStateView,
  type FormDialogShellProps,
} from '@/features/tooling/components/toolingShared';
import { useSetToolingUsability } from '@/features/tooling/hooks/useTooling';
import type { ToolingOutOfServiceState } from '@/features/tooling/types';
import { toolingErrorMessage } from '@/features/tooling/utils/toolingErrors';
import { useI18n } from '@/i18n';

/**
 * Dialog shell of every operation form: the header opens the form, Cancel is
 * locked while saving and the form validates itself on submit.
 */
export function OperationFormDialog(
  props: Omit<FormDialogShellProps, 'headerPlacement' | 'lockCancelWhilePending' | 'noValidate' | 'error'>,
) {
  return <FormDialogShell {...props} headerPlacement="inside-form" lockCancelWhilePending noValidate />;
}

/** Mandatory free-text reason with its "required" message. */
export function RequiredReasonField({
  id,
  value,
  onChange,
  showError,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  showError: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{t('tooling.reason')}</Label>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        maxLength={1000}
        aria-invalid={showError}
      />
      <FieldError show={showError} message={t('tooling.reasonRequired')} />
    </div>
  );
}

/**
 * Takes a tool out of service (quarantine, repair, block, retire...) once the
 * user has written the reason. `children` render above the reason field.
 */
export function UsabilityReasonDialog({
  toolingId,
  state,
  open,
  onOpenChange,
  title,
  description,
  reasonFieldId,
  successMessage,
  submitLabel,
  submitVariant,
  children,
}: {
  toolingId: string;
  state: ToolingOutOfServiceState;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  reasonFieldId: string;
  successMessage: string;
  submitLabel: string;
  submitVariant?: 'default' | 'destructive';
  children?: ReactNode;
}) {
  const { t } = useI18n();
  const setUsability = useSetToolingUsability(toolingId);
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const reasonMissing = reason.trim().length === 0;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (reasonMissing) return;
    setUsability.mutate(
      { state, reason: reason.trim() },
      {
        onSuccess: () => {
          toast.success(successMessage);
          onOpenChange(false);
        },
        onError: (error) => toast.error(toolingErrorMessage(error, t)),
      },
    );
  };

  return (
    <OperationFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      onSubmit={handleSubmit}
      pending={setUsability.isPending}
      submitLabel={submitLabel}
      submitVariant={submitVariant}
      width="md"
    >
      {children}
      <RequiredReasonField id={reasonFieldId} value={reason} onChange={setReason} showError={submitted && reasonMissing} />
    </OperationFormDialog>
  );
}

/** Two skeleton rows while a query loads, an alert when it failed, otherwise the content. */
export function LoadStateBoundary({
  loading,
  failed,
  skeletonClassName = 'h-10 w-full',
  children,
}: {
  loading: boolean;
  failed: boolean;
  skeletonClassName?: string;
  children: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <LoadStateView
      loading={loading}
      failed={failed}
      skeletons={[skeletonClassName, skeletonClassName]}
      loadingLabel={t('toolingOps.common.loading')}
      failedMessage={t('toolingOps.common.loadFailed')}
    >
      {children}
    </LoadStateView>
  );
}

/** `LoadStateBoundary` for a history list: a one-line message stands in for an empty list. */
export function RecordListBoundary({
  loading,
  failed,
  empty,
  emptyMessage,
  children,
}: {
  loading: boolean;
  failed: boolean;
  empty: boolean;
  emptyMessage: string;
  children: ReactNode;
}) {
  return (
    <LoadStateBoundary loading={loading} failed={failed}>
      {empty ? <ListMessage message={emptyMessage} /> : children}
    </LoadStateBoundary>
  );
}
