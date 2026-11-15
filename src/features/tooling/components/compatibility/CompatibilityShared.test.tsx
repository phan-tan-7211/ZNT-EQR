import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { TableCell } from '@/components/ui/table';
import {
  CatalogFormDialog,
  CatalogListState,
  CatalogTable,
  CatalogTableRow,
  CatalogTextField,
} from '@/features/tooling/components/compatibility/CompatibilityShared';

describe('CatalogListState', () => {
  const renderState = (overrides: Partial<Parameters<typeof CatalogListState>[0]> = {}) => {
    const onRetry = vi.fn();
    const view = render(
      <CatalogListState
        isLoading={false}
        hasError={false}
        onRetry={onRetry}
        totalCount={2}
        visibleCount={2}
        emptyState={<p>Nothing here yet</p>}
        noMatchMessage="No rows match"
        {...overrides}
      >
        <p>The rows</p>
      </CatalogListState>,
    );
    return { ...view, onRetry };
  };

  it('renders the rows when there is something to show', () => {
    renderState();
    expect(screen.getByText('The rows')).toBeInTheDocument();
    expect(screen.queryByText('No rows match')).not.toBeInTheDocument();
  });

  it('shows only the busy placeholder while loading, even with an error or no rows', () => {
    const { container } = renderState({ isLoading: true, hasError: true, totalCount: 0, visibleCount: 0 });

    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(screen.queryByText('The rows')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    expect(screen.queryByText('Nothing here yet')).not.toBeInTheDocument();
  });

  it('prefers the load error with a retry over the empty state', () => {
    const { onRetry } = renderState({ hasError: true, totalCount: 0, visibleCount: 0 });

    expect(screen.getByText('Unable to load data. Try again later.')).toBeInTheDocument();
    expect(screen.queryByText('Nothing here yet')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows the empty state when the catalog has no rows at all', () => {
    renderState({ totalCount: 0, visibleCount: 0 });

    expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
    expect(screen.queryByText('No rows match')).not.toBeInTheDocument();
    expect(screen.queryByText('The rows')).not.toBeInTheDocument();
  });

  it('shows the no-match message when the search hides every row', () => {
    renderState({ totalCount: 2, visibleCount: 0 });

    expect(screen.getByText('No rows match')).toBeInTheDocument();
    expect(screen.queryByText('Nothing here yet')).not.toBeInTheDocument();
    expect(screen.queryByText('The rows')).not.toBeInTheDocument();
  });
});

describe('CatalogTable and CatalogTableRow', () => {
  const renderTable = (canManage: boolean, onEdit = vi.fn()) => {
    render(
      <CatalogTable codeHeader="Code" nameHeader="Name" extraHeaders={['Customer', 'Revision']} showActions={canManage}>
        <CatalogTableRow
          code="R-1"
          name="First row"
          description="With a description"
          active
          editLabel="Edit row R-1"
          onEdit={canManage ? onEdit : undefined}
        >
          <TableCell>Acme</TableCell>
          <TableCell>C</TableCell>
        </CatalogTableRow>
        <CatalogTableRow code="R-2" name="Second row" description={null} active={false} editLabel="Edit row R-2" />
      </CatalogTable>,
    );
    return onEdit;
  };

  it('puts the catalog columns between the name and the status, with actions for managers', () => {
    const onEdit = renderTable(true);

    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Code',
      'Name',
      'Customer',
      'Revision',
      'Status',
      'Actions',
    ]);
    const [, firstRow, secondRow] = screen.getAllByRole('row');
    expect(within(firstRow).getAllByRole('cell').map((cell) => cell.textContent)).toEqual([
      'R-1',
      'First rowWith a description',
      'Acme',
      'C',
      'Active',
      '',
    ]);
    fireEvent.click(within(firstRow).getByRole('button', { name: 'Edit row R-1' }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    // No `onEdit`: the row has no action cell and no description line.
    expect(within(secondRow).getAllByRole('cell').map((cell) => cell.textContent)).toEqual([
      'R-2',
      'Second row',
      'Inactive',
    ]);
  });

  it('drops the actions column for read-only viewers', () => {
    renderTable(false);

    expect(screen.queryByRole('columnheader', { name: 'Actions' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('CatalogFormDialog', () => {
  const renderDialog = (overrides: Partial<Parameters<typeof CatalogFormDialog>[0]> = {}) => {
    const onSubmit = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <CatalogFormDialog
        open
        onOpenChange={onOpenChange}
        title="Edit row"
        description="Code is required."
        error={null}
        isSaving={false}
        onSubmit={onSubmit}
        {...overrides}
      >
        <input aria-label="Code" defaultValue="R-1" />
      </CatalogFormDialog>,
    );
    return { onSubmit, onOpenChange };
  };

  it('renders nothing while closed', () => {
    renderDialog({ open: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('submits through the form without a page navigation and cancels through onOpenChange', () => {
    const { onSubmit, onOpenChange } = renderDialog();
    const dialog = screen.getByRole('dialog', { name: 'Edit row' });

    expect(within(dialog).getByText('Code is required.')).toBeInTheDocument();
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument();
    const form = dialog.querySelector('form') as HTMLFormElement;
    // `fireEvent` returns false when the handler called preventDefault().
    expect(fireEvent.submit(form)).toBe(false);
    expect(onSubmit).toHaveBeenCalledTimes(1);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('shows the validation message and locks the save button while saving', () => {
    renderDialog({ error: 'Code is required.', isSaving: true });
    const dialog = screen.getByRole('dialog');

    expect(within(dialog).getByRole('alert')).toHaveTextContent('Code is required.');
    expect(within(dialog).getByRole('button', { name: 'Saving...' })).toBeDisabled();
    expect(within(dialog).queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  });
});

describe('CatalogTextField', () => {
  it('marks only required text fields and reports the typed value', () => {
    const onChange = vi.fn();
    render(
      <>
        <CatalogTextField id="row-code" label="Code" value="R-1" required maxLength={50} placeholder="e.g. R-1" onChange={onChange} />
        <CatalogTextField id="row-note" label="Note" value="" onChange={onChange} />
      </>,
    );

    const code = screen.getByLabelText(/^Code/);
    expect(code).toBeRequired();
    expect(code).toHaveAttribute('aria-required', 'true');
    expect(code).toHaveAttribute('maxlength', '50');
    expect(code).toHaveAttribute('placeholder', 'e.g. R-1');
    // The asterisk is decorative: it is hidden from assistive technology.
    expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');

    const note = screen.getByLabelText('Note');
    expect(note).not.toBeRequired();
    expect(note).not.toHaveAttribute('aria-required');
    fireEvent.change(note, { target: { value: 'hello' } });
    expect(onChange).toHaveBeenCalledWith('hello');
  });
});
