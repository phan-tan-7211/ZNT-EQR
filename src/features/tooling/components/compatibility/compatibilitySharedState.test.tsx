import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useCatalogEditor, useCatalogSearch } from '@/features/tooling/components/compatibility/compatibilitySharedState';

interface Row {
  id: string;
  code: string;
  note: string | null;
}

interface RowForm {
  code: string;
  note: string;
  is_active: boolean;
}

const EMPTY_FORM: RowForm = { code: '', note: '', is_active: true };
const toForm = (row: Row): RowForm => ({ code: row.code, note: row.note ?? '', is_active: false });

describe('useCatalogSearch', () => {
  const rows: Row[] = [
    { id: 'row-1', code: 'PN-100', note: 'Front Bracket' },
    { id: 'row-2', code: 'PN-200', note: null },
  ];
  const toSearchValues = (row: Row) => [row.code, row.note ?? ''];

  it('returns every row, untouched, while the search text is blank', () => {
    const { result } = renderHook(() => useCatalogSearch(rows, toSearchValues));
    expect(result.current.filtered).toBe(rows);

    act(() => result.current.setSearch('   '));
    expect(result.current.search).toBe('   ');
    expect(result.current.filtered).toBe(rows);
  });

  it('matches the trimmed text against any search value, ignoring case', () => {
    const { result } = renderHook(() => useCatalogSearch(rows, toSearchValues));

    act(() => result.current.setSearch('  bracket '));
    expect(result.current.filtered).toEqual([rows[0]]);

    act(() => result.current.setSearch('pn-2'));
    expect(result.current.filtered).toEqual([rows[1]]);

    act(() => result.current.setSearch('pn-'));
    expect(result.current.filtered).toEqual(rows);

    act(() => result.current.setSearch('missing'));
    expect(result.current.filtered).toEqual([]);
  });

  it('filters again when the rows or their search values change', () => {
    const { result, rerender } = renderHook(
      ({ current, values }: { current: Row[]; values: (row: Row) => string[] }) => useCatalogSearch(current, values),
      { initialProps: { current: rows, values: toSearchValues } },
    );
    act(() => result.current.setSearch('rear'));
    expect(result.current.filtered).toEqual([]);

    const added: Row = { id: 'row-3', code: 'PN-300', note: 'Rear plate' };
    rerender({ current: [...rows, added], values: toSearchValues });
    expect(result.current.filtered).toEqual([added]);

    // E.g. a language switch that changes a translated search value.
    rerender({ current: [...rows, added], values: (row: Row) => [row.code === 'PN-100' ? 'rear (translated)' : row.code] });
    expect(result.current.filtered).toEqual([rows[0]]);
  });
});

describe('useCatalogEditor', () => {
  it('starts closed with the empty form', () => {
    const { result } = renderHook(() => useCatalogEditor<Row, RowForm>(EMPTY_FORM, toForm));

    expect(result.current.dialogOpen).toBe(false);
    expect(result.current.editing).toBeNull();
    expect(result.current.form).toEqual(EMPTY_FORM);
    expect(result.current.formError).toBeNull();
  });

  it('opens an existing row with its form values and clears a stale error', () => {
    const row: Row = { id: 'row-1', code: 'R-1', note: null };
    const { result } = renderHook(() => useCatalogEditor<Row, RowForm>(EMPTY_FORM, toForm));

    act(() => result.current.setFormError('Required'));
    act(() => result.current.openEdit(row));

    expect(result.current.dialogOpen).toBe(true);
    expect(result.current.editing).toBe(row);
    expect(result.current.form).toEqual({ code: 'R-1', note: '', is_active: false });
    expect(result.current.formError).toBeNull();
  });

  it('resets the form, the edited row and the error when creating after an edit', () => {
    const { result } = renderHook(() => useCatalogEditor<Row, RowForm>(EMPTY_FORM, toForm));

    act(() => result.current.openEdit({ id: 'row-1', code: 'R-1', note: 'kept' }));
    act(() => result.current.setFormError('Required'));
    act(() => result.current.setDialogOpen(false));
    act(() => result.current.openCreate());

    expect(result.current.dialogOpen).toBe(true);
    expect(result.current.editing).toBeNull();
    expect(result.current.form).toEqual(EMPTY_FORM);
    expect(result.current.formError).toBeNull();
  });

  it('updates one field at a time and leaves the other values alone', () => {
    const { result } = renderHook(() => useCatalogEditor<Row, RowForm>(EMPTY_FORM, toForm));

    act(() => result.current.setField('code', 'R-2'));
    act(() => result.current.setField('is_active', false));

    expect(result.current.form).toEqual({ code: 'R-2', note: '', is_active: false });
    expect(EMPTY_FORM).toEqual({ code: '', note: '', is_active: true });
  });
});
