/**
 * UI primitives shared across the tooling feature: the inline field error, the
 * centered list message, the form dialog shell and the load-state view around
 * query-backed content. The operation tabs and the compatibility catalogs
 * configure them through their own presets (`ToolingOperationShared`,
 * `CompatibilityShared`); other tooling screens use them directly.
 */
import type { FormEvent, ReactNode } from 'react';
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
import { Skeleton } from '@/components/ui/skeleton';
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

/** Centered one-line message standing in for a list with nothing to show. */
export function ListMessage({ message }: { message: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{message}</p>;
}

// ---------------------------------------------------------------------------
// Form dialog
// ---------------------------------------------------------------------------

const FORM_DIALOG_CONTENT_CLASS = {
  md: 'max-h-[90vh] overflow-y-auto sm:max-w-md',
  lg: 'max-h-[90vh] overflow-y-auto sm:max-w-lg',
} as const;

export interface FormDialogShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  /** While true the submit button is disabled and reads "Saving...". */
  pending: boolean;
  submitLabel: string;
  submitVariant?: 'default' | 'destructive';
  width?: keyof typeof FORM_DIALOG_CONTENT_CLASS;
  /** `inside-form`: the title and description open the form; `above-form`: they sit before it. */
  headerPlacement: 'inside-form' | 'above-form';
  /** Also disable Cancel while `pending`. */
  lockCancelWhilePending: boolean;
  /** Turn off the browser's own constraint validation because the caller validates on submit. */
  noValidate: boolean;
  /** Validation message between the fields and the actions; nothing renders while it is empty. */
  error?: string | null;
  /** The form fields. */
  children: ReactNode;
}

/** Dialog holding one form: title and description, the fields, then Cancel and submit. */
export function FormDialogShell({
  open,
  onOpenChange,
  title,
  description,
  onSubmit,
  pending,
  submitLabel,
  submitVariant = 'default',
  width = 'lg',
  headerPlacement,
  lockCancelWhilePending,
  noValidate,
  error = null,
  children,
}: FormDialogShellProps) {
  const { t } = useI18n();
  const header = (
    <DialogHeader>
      <DialogTitle>{title}</DialogTitle>
      <DialogDescription>{description}</DialogDescription>
    </DialogHeader>
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={FORM_DIALOG_CONTENT_CLASS[width]}>
        {headerPlacement === 'above-form' && header}
        <form onSubmit={onSubmit} className="space-y-4" noValidate={noValidate}>
          {headerPlacement === 'inside-form' && header}
          {children}
          <FieldError show={Boolean(error)} message={error ?? ''} />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={lockCancelWhilePending && pending}
            >
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

// ---------------------------------------------------------------------------
// Load state
// ---------------------------------------------------------------------------

export interface LoadStateViewProps {
  loading: boolean;
  failed: boolean;
  /** Class name of each placeholder row shown while loading, top to bottom. */
  skeletons: readonly string[];
  /** Accessible name of the busy placeholder; it stays unnamed without one. */
  loadingLabel?: string;
  /** Text of the alert that replaces the content when loading failed. */
  failedMessage: string;
  /** Adds a button to the failure alert that loads the data again. */
  retry?: { label: string; onRetry: () => void };
  /** Loaded, but there is nothing at all: `emptyState` replaces the content. */
  empty?: boolean;
  emptyState?: ReactNode;
  /** Loaded, but a filter hid everything: `noMatchState` replaces the content. */
  noMatch?: boolean;
  noMatchState?: ReactNode;
  children: ReactNode;
}

/** Shows the first state that applies: loading, load failure, empty, no filter match, then the content. */
export function LoadStateView({
  loading,
  failed,
  skeletons,
  loadingLabel,
  failedMessage,
  retry,
  empty = false,
  emptyState,
  noMatch = false,
  noMatchState,
  children,
}: LoadStateViewProps) {
  if (loading) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label={loadingLabel}>
        {skeletons.map((className, index) => (
          <Skeleton key={index} className={className} />
        ))}
      </div>
    );
  }
  if (failed) {
    return (
      <Alert variant="destructive">
        <AlertDescription className={retry ? 'flex flex-wrap items-center justify-between gap-2' : undefined}>
          {retry ? (
            <>
              <span>{failedMessage}</span>
              <Button variant="outline" size="sm" onClick={retry.onRetry}>
                {retry.label}
              </Button>
            </>
          ) : (
            failedMessage
          )}
        </AlertDescription>
      </Alert>
    );
  }
  if (empty) return <>{emptyState}</>;
  if (noMatch) return <>{noMatchState}</>;
  return <>{children}</>;
}
