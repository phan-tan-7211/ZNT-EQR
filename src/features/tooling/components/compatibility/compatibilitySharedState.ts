/**
 * State hooks for the compatibility master-data catalogs (product parts, production
 * operations). Kept out of `CompatibilityShared.tsx` so that file stays
 * `react-refresh/only-export-components` clean.
 */
import { useMemo, useState } from 'react';

/**
 * Search text of a catalog and the rows matching it. A row matches when one of its
 * search values contains the trimmed search text, ignoring case. Pass a stable
 * `toSearchValues` (module-level or `useCallback`) so the filtering stays memoised.
 */
export function useCatalogSearch<TItem>(rows: TItem[], toSearchValues: (row: TItem) => string[]) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => toSearchValues(row).some((value) => value.toLowerCase().includes(query)));
  }, [rows, search, toSearchValues]);

  return { search, setSearch, filtered };
}

/**
 * State of a catalog's create/edit dialog: which row is being edited (`null` while
 * creating), the form values and the validation message shown in the dialog.
 */
export function useCatalogEditor<TItem, TForm extends object>(emptyForm: TForm, toForm: (item: TItem) => TForm) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TItem | null>(null);
  const [form, setForm] = useState<TForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const open = (item: TItem | null) => {
    setEditing(item);
    setForm(item === null ? emptyForm : toForm(item));
    setFormError(null);
    setDialogOpen(true);
  };

  return {
    dialogOpen,
    setDialogOpen,
    editing,
    form,
    setField: <K extends keyof TForm>(key: K, value: TForm[K]) =>
      setForm((current) => ({ ...current, [key]: value })),
    formError,
    setFormError,
    openCreate: () => open(null),
    openEdit: (item: TItem) => open(item),
  };
}
