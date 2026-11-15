import type { FormEvent } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@vitest-harness/utils/test-utils';
import { toast } from 'sonner';
import {
  LoadStateBoundary,
  OperationFormDialog,
  RecordListBoundary,
  RequiredReasonField,
  UsabilityReasonDialog,
} from '@/features/tooling/components/operations/ToolingOperationShared';

const usabilityMutate = vi.fn();
const usabilityHook = vi.fn();
let usabilityPending = false;

vi.mock('@/features/tooling/hooks/useTooling', () => ({
  useSetToolingUsability: (toolingId?: string) => {
    usabilityHook(toolingId);
    return { mutate: usabilityMutate, isPending: usabilityPending };
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

type MutateOptions = { onSuccess: () => void; onError: (error: unknown) => void };

beforeEach(() => {
  usabilityMutate.mockReset();
  usabilityHook.mockReset();
  usabilityPending = false;
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
});

describe('OperationFormDialog', () => {
  const renderDialog = (props: Partial<Parameters<typeof OperationFormDialog>[0]> = {}) => {
    const onOpenChange = vi.fn();
    const onSubmit = vi.fn((event: FormEvent) => event.preventDefault());
    render(
      <OperationFormDialog
        open
        onOpenChange={onOpenChange}
        title="Move tool"
        description="Pick the new place."
        onSubmit={onSubmit}
        pending={false}
        submitLabel="Move"
        {...props}
      >
        <input aria-label="Place" />
      </OperationFormDialog>,
    );
    return { onOpenChange, onSubmit };
  };

  it('labels the dialog with the title and description and renders the fields', () => {
    renderDialog();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAccessibleName('Move tool');
    expect(dialog).toHaveAccessibleDescription('Pick the new place.');
    expect(within(dialog).getByRole('textbox', { name: 'Place' })).toBeInTheDocument();
  });

  it('submits through the form and closes through Cancel', () => {
    const { onSubmit, onOpenChange } = renderDialog();
    const dialog = within(screen.getByRole('dialog'));

    fireEvent.click(dialog.getByRole('button', { name: 'Move' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalled();

    fireEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('locks both actions and shows the saving label while pending', () => {
    renderDialog({ pending: true });
    const dialog = within(screen.getByRole('dialog'));

    expect(dialog.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(dialog.getByRole('button', { name: 'Saving...' })).toBeDisabled();
    expect(dialog.queryByRole('button', { name: 'Move' })).not.toBeInTheDocument();
  });

  it('is large by default', () => {
    renderDialog();
    expect(screen.getByRole('dialog')).toHaveClass('sm:max-w-lg');
    expect(screen.getByRole('dialog')).not.toHaveClass('sm:max-w-md');
  });

  it('is medium on request', () => {
    renderDialog({ width: 'md' });
    expect(screen.getByRole('dialog')).toHaveClass('sm:max-w-md');
    expect(screen.getByRole('dialog')).not.toHaveClass('sm:max-w-lg');
  });

  it('renders nothing while closed', () => {
    renderDialog({ open: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('RequiredReasonField', () => {
  it('links the label to the textarea and reports typed text', () => {
    const onChange = vi.fn();
    render(<RequiredReasonField id="reason-field" value="" onChange={onChange} showError={false} />);

    const textarea = screen.getByLabelText('Reason');
    expect(textarea).toHaveAttribute('id', 'reason-field');
    expect(textarea).toHaveAttribute('maxlength', '1000');
    expect(textarea).toHaveAttribute('aria-invalid', 'false');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    fireEvent.change(textarea, { target: { value: 'cracked' } });
    expect(onChange).toHaveBeenCalledWith('cracked');
  });

  it('marks the textarea invalid and shows the required message', () => {
    render(<RequiredReasonField id="reason-field" value="" onChange={vi.fn()} showError />);

    expect(screen.getByLabelText('Reason')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('A reason is required.');
  });
});

describe('UsabilityReasonDialog', () => {
  const renderDialog = (props: Partial<Parameters<typeof UsabilityReasonDialog>[0]> = {}) => {
    const onOpenChange = vi.fn();
    render(
      <UsabilityReasonDialog
        toolingId="tool-1"
        state="blocked"
        open
        onOpenChange={onOpenChange}
        title="Block tool"
        description="Stops all use."
        reasonFieldId="block-reason"
        successMessage="Tool blocked."
        submitLabel="Block"
        {...props}
      />,
    );
    return { onOpenChange, dialog: within(screen.getByRole('dialog')) };
  };

  it('binds the usability mutation to the tool', () => {
    renderDialog();
    expect(usabilityHook).toHaveBeenCalledWith('tool-1');
  });

  it('refuses to submit without a reason, including a whitespace-only one', () => {
    const { dialog } = renderDialog();

    expect(dialog.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.click(dialog.getByRole('button', { name: 'Block' }));
    expect(dialog.getByRole('alert')).toHaveTextContent('A reason is required.');
    expect(dialog.getByLabelText('Reason')).toHaveAttribute('aria-invalid', 'true');

    fireEvent.change(dialog.getByLabelText('Reason'), { target: { value: '   ' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Block' }));
    expect(usabilityMutate).not.toHaveBeenCalled();
  });

  it('sends the target state with the trimmed reason', () => {
    const { dialog } = renderDialog({ state: 'under_repair' });

    fireEvent.change(dialog.getByLabelText('Reason'), { target: { value: '  bent pin ' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Block' }));

    expect(usabilityMutate).toHaveBeenCalledTimes(1);
    expect(usabilityMutate.mock.calls[0][0]).toEqual({ state: 'under_repair', reason: 'bent pin' });
    expect(dialog.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('confirms and closes on success', () => {
    const { dialog, onOpenChange } = renderDialog();
    fireEvent.change(dialog.getByLabelText('Reason'), { target: { value: 'audit hold' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Block' }));

    act(() => (usabilityMutate.mock.calls[0][1] as MutateOptions).onSuccess());

    expect(toast.success).toHaveBeenCalledWith('Tool blocked.');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('reports a failure and stays open', () => {
    const { dialog, onOpenChange } = renderDialog();
    fireEvent.change(dialog.getByLabelText('Reason'), { target: { value: 'audit hold' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Block' }));

    act(() => (usabilityMutate.mock.calls[0][1] as MutateOptions).onError(new Error('TOOLING_ISSUED_RETURN_FIRST')));

    expect(toast.error).toHaveBeenCalledWith('Return the tool before this action.');
    expect(toast.success).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('renders extra context above the reason field', () => {
    renderDialog({ children: <p>Available → Blocked</p> });

    const context = screen.getByText('Available → Blocked');
    const reason = screen.getByLabelText('Reason');
    expect(context.compareDocumentPosition(reason) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('disables the actions while the mutation is pending', () => {
    usabilityPending = true;
    const { dialog } = renderDialog();

    expect(dialog.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(dialog.getByRole('button', { name: 'Saving...' })).toBeDisabled();
  });
});

describe('LoadStateBoundary', () => {
  it('shows two skeleton rows while loading, even if the query also failed', () => {
    const { container } = render(
      <LoadStateBoundary loading failed>
        <p>records</p>
      </LoadStateBoundary>,
    );

    const busy = screen.getByLabelText('Loading...');
    expect(busy).toHaveAttribute('aria-busy', 'true');
    expect(busy.children).toHaveLength(2);
    expect(busy.children[0]).toHaveClass('h-10', 'w-full');
    expect(screen.queryByText('records')).not.toBeInTheDocument();
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it('sizes the skeleton rows on request', () => {
    render(
      <LoadStateBoundary loading failed={false} skeletonClassName="h-12 w-full">
        <p>records</p>
      </LoadStateBoundary>,
    );

    const rows = screen.getByLabelText('Loading...').children;
    expect(rows[0]).toHaveClass('h-12');
    expect(rows[1]).toHaveClass('h-12');
    expect(rows[0]).not.toHaveClass('h-10');
  });

  it('replaces the content with an alert when loading failed', () => {
    render(
      <LoadStateBoundary loading={false} failed>
        <p>records</p>
      </LoadStateBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load these records.');
    expect(screen.queryByText('records')).not.toBeInTheDocument();
  });

  it('renders the content once loaded', () => {
    render(
      <LoadStateBoundary loading={false} failed={false}>
        <p>records</p>
      </LoadStateBoundary>,
    );

    expect(screen.getByText('records')).toBeInTheDocument();
    expect(screen.queryByLabelText('Loading...')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('RecordListBoundary', () => {
  const renderList = (props: { loading?: boolean; failed?: boolean; empty?: boolean }) =>
    render(
      <RecordListBoundary
        loading={props.loading ?? false}
        failed={props.failed ?? false}
        empty={props.empty ?? false}
        emptyMessage="Nothing recorded yet."
      >
        <p>first row</p>
        <p>second row</p>
      </RecordListBoundary>,
    );

  it('renders the records when there are some', () => {
    renderList({});
    expect(screen.getByText('first row')).toBeInTheDocument();
    expect(screen.getByText('second row')).toBeInTheDocument();
    expect(screen.queryByText('Nothing recorded yet.')).not.toBeInTheDocument();
  });

  it('shows the empty message instead of the records', () => {
    renderList({ empty: true });
    expect(screen.getByText('Nothing recorded yet.')).toBeInTheDocument();
    expect(screen.queryByText('first row')).not.toBeInTheDocument();
  });

  it('prefers the loading and failed states over the empty message', () => {
    const loadingView = renderList({ loading: true, empty: true });
    expect(screen.getByLabelText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Nothing recorded yet.')).not.toBeInTheDocument();
    loadingView.unmount();

    renderList({ failed: true, empty: true });
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load these records.');
    expect(screen.queryByText('Nothing recorded yet.')).not.toBeInTheDocument();
  });
});
