import type { FormEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@vitest-harness/utils/test-utils';
import {
  FieldError,
  FormDialogShell,
  ListMessage,
  LoadStateView,
  type FormDialogShellProps,
  type LoadStateViewProps,
} from '@/features/tooling/components/toolingShared';

describe('FieldError', () => {
  it('renders nothing until it is shown', () => {
    render(<FieldError show={false} message="Required" />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText('Required')).not.toBeInTheDocument();
  });

  it('announces the message as an alert', () => {
    render(<FieldError show message="Required" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Required');
  });
});

describe('ListMessage', () => {
  it('renders the message as a centered muted line', () => {
    render(<ListMessage message="Nothing recorded yet." />);
    expect(screen.getByText('Nothing recorded yet.')).toHaveClass('text-center', 'text-muted-foreground');
  });
});

describe('FormDialogShell', () => {
  const renderShell = (props: Partial<FormDialogShellProps> = {}) => {
    const onOpenChange = vi.fn();
    const onSubmit = vi.fn((event: FormEvent) => event.preventDefault());
    render(
      <FormDialogShell
        open
        onOpenChange={onOpenChange}
        title="Edit row"
        description="Fill in the code."
        onSubmit={onSubmit}
        pending={false}
        submitLabel="Save row"
        headerPlacement="inside-form"
        lockCancelWhilePending
        noValidate
        {...props}
      >
        <input aria-label="Code" required />
      </FormDialogShell>,
    );
    const dialog = screen.getByRole('dialog');
    return { onOpenChange, onSubmit, dialog, form: dialog.querySelector('form') as HTMLFormElement };
  };

  it('labels the dialog and puts the header inside the form on request', () => {
    const { dialog, form } = renderShell({ headerPlacement: 'inside-form' });
    expect(dialog).toHaveAccessibleName('Edit row');
    expect(dialog).toHaveAccessibleDescription('Fill in the code.');
    expect(within(form).getByText('Edit row')).toBeInTheDocument();
  });

  it('puts the header above the form on request', () => {
    const { dialog, form } = renderShell({ headerPlacement: 'above-form' });
    const title = within(dialog).getByText('Edit row');
    expect(form).not.toContainElement(title);
    expect(title.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('submits through the form and closes through Cancel', () => {
    const { dialog, onSubmit, onOpenChange } = renderShell();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Save row' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('turns the browser validation off only on request', () => {
    expect(renderShell({ noValidate: true }).form.noValidate).toBe(true);
  });

  it('keeps the browser validation when it is not turned off', () => {
    const { form, onSubmit, dialog } = renderShell({ noValidate: false });
    expect(form.noValidate).toBe(false);
    // The required field is empty, so the browser blocks the submission.
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save row' }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('locks submit while pending, and Cancel only when asked to', () => {
    const locked = renderShell({ pending: true, lockCancelWhilePending: true }).dialog;
    expect(within(locked).getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(within(locked).getByRole('button', { name: 'Saving...' })).toBeDisabled();
    expect(within(locked).queryByRole('button', { name: 'Save row' })).not.toBeInTheDocument();
  });

  it('leaves Cancel usable while pending when it is not locked', () => {
    const { dialog, onOpenChange } = renderShell({ pending: true, lockCancelWhilePending: false });
    expect(within(dialog).getByRole('button', { name: 'Saving...' })).toBeDisabled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows the validation message between the fields and the actions', () => {
    const { dialog } = renderShell({ error: 'Code is required.' });
    const alert = within(dialog).getByRole('alert');
    expect(alert).toHaveTextContent('Code is required.');
    const field = within(dialog).getByRole('textbox', { name: 'Code' });
    const cancel = within(dialog).getByRole('button', { name: 'Cancel' });
    expect(field.compareDocumentPosition(alert) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(alert.compareDocumentPosition(cancel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it.each([null, ''])('renders no validation message for %j', (error) => {
    const { dialog } = renderShell({ error });
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument();
  });

  it('is large by default', () => {
    expect(renderShell().dialog).toHaveClass('sm:max-w-lg');
  });

  it('is medium on request', () => {
    const { dialog } = renderShell({ width: 'md' });
    expect(dialog).toHaveClass('sm:max-w-md');
    expect(dialog).not.toHaveClass('sm:max-w-lg');
  });

  it('renders nothing while closed', () => {
    render(
      <FormDialogShell
        open={false}
        onOpenChange={vi.fn()}
        title="Edit row"
        description="Fill in the code."
        onSubmit={vi.fn()}
        pending={false}
        submitLabel="Save row"
        headerPlacement="above-form"
        lockCancelWhilePending={false}
        noValidate={false}
      >
        <input aria-label="Code" />
      </FormDialogShell>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('LoadStateView', () => {
  const renderView = (props: Partial<LoadStateViewProps> = {}) =>
    render(
      <LoadStateView
        loading={false}
        failed={false}
        skeletons={['h-20 w-full', 'h-10 w-full']}
        failedMessage="Could not load."
        emptyState={<p>Nothing yet</p>}
        noMatchState={<p>No match</p>}
        {...props}
      >
        <p>The rows</p>
      </LoadStateView>,
    );

  it('renders one skeleton row per class while loading, ahead of every other state', () => {
    const { container } = renderView({ loading: true, failed: true, empty: true, noMatch: true, loadingLabel: 'Loading rows' });

    const busy = screen.getByLabelText('Loading rows');
    expect(busy).toHaveAttribute('aria-busy', 'true');
    expect(busy.children).toHaveLength(2);
    expect(busy.children[0]).toHaveClass('h-20');
    expect(busy.children[1]).toHaveClass('h-10');
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(screen.queryByText('Nothing yet')).not.toBeInTheDocument();
    expect(screen.queryByText('The rows')).not.toBeInTheDocument();
  });

  it('leaves the busy placeholder unnamed without a label', () => {
    const { container } = renderView({ loading: true });
    const busy = container.querySelector('[aria-busy="true"]');
    expect(busy).toBeInTheDocument();
    expect(busy).not.toHaveAttribute('aria-label');
  });

  it('replaces the content with the failure alert, without a retry unless asked', () => {
    renderView({ failed: true, empty: true });

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load.');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByText('Nothing yet')).not.toBeInTheDocument();
  });

  it('offers a retry in the failure alert on request', () => {
    const onRetry = vi.fn();
    renderView({ failed: true, retry: { label: 'Retry', onRetry } });

    const alert = screen.getByRole('alert');
    expect(within(alert).getByText('Could not load.')).toBeInTheDocument();
    fireEvent.click(within(alert).getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('prefers the empty state over the no-match state', () => {
    renderView({ empty: true, noMatch: true });
    expect(screen.getByText('Nothing yet')).toBeInTheDocument();
    expect(screen.queryByText('No match')).not.toBeInTheDocument();
    expect(screen.queryByText('The rows')).not.toBeInTheDocument();
  });

  it('shows the no-match state when a filter hid everything', () => {
    renderView({ noMatch: true });
    expect(screen.getByText('No match')).toBeInTheDocument();
    expect(screen.queryByText('The rows')).not.toBeInTheDocument();
  });

  it('renders the content once loaded with something to show', () => {
    renderView();
    expect(screen.getByText('The rows')).toBeInTheDocument();
    expect(screen.queryByText('Nothing yet')).not.toBeInTheDocument();
    expect(screen.queryByText('No match')).not.toBeInTheDocument();
  });
});
