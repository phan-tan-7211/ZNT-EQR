/**
 * Building blocks shared by the tooling operation tabs (Issue / Return,
 * Usage & Tool Life, PM / Repair / Inspection): the form dialog shell, field
 * validation message, mandatory reason field and the load-state wrappers
 * around their record lists.
 */
import { useState, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useSetToolingUsability } from '@/features/tooling/hooks/useTooling';
import type { ToolingOutOfServiceState } from '@/features/tooling/types';
import { toolingErrorMessage } from '@/features/tooling/utils/toolingErrors';
import { useI18n } from '@/i18n';

/** Inline validation message; renders nothing until `show` is true. */
export function FieldError({ show, message }: { show: boolean; message: string }) {
  if (!show) return null;
  return (
    <p className="text-sm text-destructive" role="alert">
      {message}
    </p>
  );
}

const DIALOG_CONTENT_CLASS = {
  md: 'max-h-[90vh] overflow-y-auto sm:max-w-md',
  lg: 'max-h-[90vh] overflow-y-auto sm:max-w-lg',
} as const;

/** Dialog shell of every operation form: header, the fields, then Cancel and submit. */
export function OperationFormDialog({
  open,
  onOpenChange,
  title,
  description,
  onSubmit,
  pending,
  submitLabel,
  submitVariant = 'default',
  width = 'lg',
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onSubmit: (event: FormEvent) => void;
  pending: boolean;
  submitLabel: string;
  submitVariant?: 'default' | 'destructive';
  width?: keyof typeof DIALOG_CONTENT_CLASS;
  children: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DIALOG_CONTENT_CLASS[width]}>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {children}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              {t('tooling.cancel')}
            </Button>
            <Button type="submit" variant={submitVariant} disabled={pending}>
              {pending ? t('tooling.saving') : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
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

/** Skeleton rows while a query loads, an alert when it failed, otherwise the content. */
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
  if (loading) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label={t('toolingOps.common.loading')}>
        <Skeleton className={skeletonClassName} />
        <Skeleton className={skeletonClassName} />
      </div>
    );
  }
  if (failed) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{t('toolingOps.common.loadFailed')}</AlertDescription>
      </Alert>
    );
  }
  return <>{children}</>;
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
      {empty ? <p className="py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p> : children}
    </LoadStateBoundary>
  );
}
