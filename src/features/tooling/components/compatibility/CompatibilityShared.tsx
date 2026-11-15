/**
 * Building blocks shared by the compatibility master-data catalogs
 * (product parts, production operations) and the compatibility tab.
 * Each catalog keeps its own columns, form fields and validation; the list
 * states, card chrome, row anatomy and edit dialog shell live here. Their state
 * hooks live in `compatibilitySharedState.ts`.
 */
import type { ReactNode } from 'react';
import { Pencil, Plus, Search, type LucideIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import EmptyState from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useI18n } from '@/i18n';

// ---------------------------------------------------------------------------
// List states
// ---------------------------------------------------------------------------

export function LoadFailedAlert({ onRetry }: { onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <Alert variant="destructive">
      <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
        <span>{t('toolingCompat.common.loadFailed')}</span>
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t('toolingCompat.common.retry')}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function CatalogAddButton({ label, onClick, className }: { label: string; onClick: () => void; className?: string }) {
  return (
    <Button onClick={onClick} className={className}>
      <Plus className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );
}

interface CatalogIntroProps {
  icon: LucideIcon;
  title: string;
  description: string;
  addLabel: string;
  /** Omit for read-only viewers: no add button is rendered. */
  onAdd?: () => void;
}

export function CatalogEmptyState({ icon, title, description, addLabel, onAdd }: CatalogIntroProps) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      action={onAdd ? <CatalogAddButton label={addLabel} onClick={onAdd} /> : undefined}
    />
  );
}

interface CatalogListStateProps {
  isLoading: boolean;
  hasError: boolean;
  onRetry: () => void;
  /** Rows in the catalog before the search filter. */
  totalCount: number;
  /** Rows left after the search filter. */
  visibleCount: number;
  emptyState: ReactNode;
  noMatchMessage: string;
  children: ReactNode;
}

/** Shows the first state that applies: loading, load error, empty catalog, no search match, then the rows. */
export function CatalogListState({
  isLoading,
  hasError,
  onRetry,
  totalCount,
  visibleCount,
  emptyState,
  noMatchMessage,
  children,
}: CatalogListStateProps) {
  if (isLoading) {
    return (
      <div className="space-y-2" aria-busy="true">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }
  if (hasError) return <LoadFailedAlert onRetry={onRetry} />;
  if (totalCount === 0) return <>{emptyState}</>;
  if (visibleCount === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{noMatchMessage}</p>;
  }
  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// Card chrome
// ---------------------------------------------------------------------------

export function CatalogHeader({ icon: Icon, title, description, addLabel, onAdd }: CatalogIntroProps) {
  return (
    <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
      <div className="space-y-1.5">
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5" aria-hidden="true" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </div>
      {onAdd && <CatalogAddButton label={addLabel} onClick={onAdd} className="w-full sm:w-auto" />}
    </CardHeader>
  );
}

interface CatalogSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Accessible name of the search input. */
  label: string;
  countLabel: string;
}

export function CatalogSearchBar({ value, onChange, placeholder, label, countLabel }: CatalogSearchBarProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-label={label}
          className="pl-9"
        />
      </div>
      <p className="text-xs text-muted-foreground">{countLabel}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

function CatalogActiveBadge({ active }: { active: boolean }) {
  const { t } = useI18n();
  return (
    <Badge
      variant="outline"
      className={
        active
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
          : 'border-muted-foreground/30 bg-muted text-muted-foreground'
      }
    >
      {active ? t('toolingCompat.common.active') : t('toolingCompat.common.inactive')}
    </Badge>
  );
}

function CatalogEditButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="ghost" size="icon" onClick={onClick} aria-label={label}>
      <Pencil className="h-4 w-4" />
    </Button>
  );
}

interface CatalogTableProps {
  codeHeader: string;
  nameHeader: string;
  /** Headers of the catalog-specific columns between the name and the status. */
  extraHeaders: string[];
  showActions: boolean;
  /** One `CatalogTableRow` per row. */
  children: ReactNode;
}

/** Desktop table: code, name, the catalog's own columns, status and (for managers) actions. */
export function CatalogTable({ codeHeader, nameHeader, extraHeaders, showActions, children }: CatalogTableProps) {
  const { t } = useI18n();
  return (
    <div className="hidden md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{codeHeader}</TableHead>
            <TableHead>{nameHeader}</TableHead>
            {extraHeaders.map((header, index) => (
              <TableHead key={index}>{header}</TableHead>
            ))}
            <TableHead>{t('toolingCompat.common.status')}</TableHead>
            {showActions && <TableHead className="text-right">{t('toolingCompat.common.actions')}</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>{children}</TableBody>
      </Table>
    </div>
  );
}

interface CatalogRowProps {
  code: string;
  name: string;
  active: boolean;
  /** Accessible name of the edit button. */
  editLabel: string;
  /** Omit for read-only viewers: no edit button is rendered. */
  onEdit?: () => void;
}

interface CatalogTableRowProps extends CatalogRowProps {
  description?: string | null;
  /** Cells of the catalog-specific columns, in `extraHeaders` order. */
  children?: ReactNode;
}

export function CatalogTableRow({ code, name, description, active, editLabel, onEdit, children }: CatalogTableRowProps) {
  return (
    <TableRow>
      <TableCell className="font-mono font-medium">{code}</TableCell>
      <TableCell>
        <p className="font-medium">{name}</p>
        {description && <p className="mt-0.5 max-w-sm text-xs text-muted-foreground">{description}</p>}
      </TableCell>
      {children}
      <TableCell>
        <CatalogActiveBadge active={active} />
      </TableCell>
      {onEdit && (
        <TableCell className="text-right">
          <CatalogEditButton label={editLabel} onClick={onEdit} />
        </TableCell>
      )}
    </TableRow>
  );
}

interface CatalogMobileItemProps extends CatalogRowProps {
  /** Short secondary line under the name. */
  caption?: string;
  /** Extra details rendered under the heading row. */
  children?: ReactNode;
}

/** One row of the mobile list (`<ul className="space-y-2 md:hidden">`). */
export function CatalogMobileItem({ code, name, caption, active, editLabel, onEdit, children }: CatalogMobileItemProps) {
  return (
    <li className="rounded-lg border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words font-mono text-sm font-semibold">{code}</p>
          <p className="break-words text-sm">{name}</p>
          {caption !== undefined && <p className="mt-1 text-xs text-muted-foreground">{caption}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <CatalogActiveBadge active={active} />
          {onEdit && <CatalogEditButton label={editLabel} onClick={onEdit} />}
        </div>
      </div>
      {children}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Edit dialog
// ---------------------------------------------------------------------------

interface CatalogFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** Validation message shown above the footer. */
  error: string | null;
  isSaving: boolean;
  onSubmit: () => void;
  /** The form fields. */
  children: ReactNode;
}

export function CatalogFormDialog({
  open,
  onOpenChange,
  title,
  description,
  error,
  isSaving,
  onSubmit,
  children,
}: CatalogFormDialogProps) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          {children}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('tooling.cancel')}
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? t('tooling.saving') : t('tooling.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface CatalogFieldProps {
  /** Id of the control rendered as `children`. */
  id: string;
  label: string;
  required?: boolean;
  children: ReactNode;
}

/** Label (with the required marker) above a form control. */
export function CatalogField({ id, label, required = false, children }: CatalogFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required && (
          <>
            {' '}
            <span aria-hidden="true">*</span>
          </>
        )}
      </Label>
      {children}
    </div>
  );
}

interface CatalogTextFieldProps extends Omit<CatalogFieldProps, 'children'> {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  placeholder?: string;
}

export function CatalogTextField({
  id,
  label,
  required = false,
  value,
  onChange,
  maxLength,
  placeholder,
}: CatalogTextFieldProps) {
  return (
    <CatalogField id={id} label={label} required={required}>
      <Input
        id={id}
        value={value}
        required={required}
        aria-required={required ? 'true' : undefined}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </CatalogField>
  );
}

interface CatalogActiveFieldProps {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function CatalogActiveField({ id, label, hint, checked, onCheckedChange }: CatalogActiveFieldProps) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border p-3">
      <div className="space-y-0.5">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
