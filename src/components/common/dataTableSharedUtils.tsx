/**
 * Non-component helpers for shared data tables.
 * Kept out of `dataTableShared.tsx` so that file stays
 * `react-refresh/only-export-components` clean.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ColumnOrderState, ColumnSizingState } from '@tanstack/react-table';
import {
  DataTableSortableHeaderButton,
  DataTableStaticHeaderLabel,
} from '@/components/common/dataTableShared';
import { useWhenPreferenceStorageAllowed } from '@/contexts/CookieConsentContext';
import { measureColumnAutoFitWidth } from '@/features/inventory/utils/tableColumnAutoFit';
import { getPreferenceLocalStorage, setPreferenceLocalStorage } from '@/lib/cookieConsent';

export type ResizableColumnMeta = {
  title: string;
  align?: 'left' | 'right' | 'center';
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  resizable: boolean;
  sortable: boolean;
  sortField: string;
  mono?: boolean;
};

export function getResizableColumnSizing<TKey extends string>(
  columnKey: TKey,
  columnSizing: ColumnSizingState,
  meta: ResizableColumnMeta,
) {
  return {
    id: columnKey,
    size: columnSizing[columnKey] ?? meta.defaultWidth,
    minSize: meta.minWidth,
    maxSize: meta.maxWidth,
    enableResizing: meta.resizable,
  };
}

export function applyAutoFitColumnWidth<TKey extends string>(
  setColumnSizing: React.Dispatch<React.SetStateAction<ColumnSizingState>>,
  columnKey: TKey,
  samples: string[],
  meta: Pick<ResizableColumnMeta, 'title' | 'minWidth' | 'maxWidth' | 'mono' | 'resizable'>,
) {
  if (!meta.resizable) return;

  const fitSamples = [...samples];
  fitSamples.unshift(meta.title);

  const nextWidth = measureColumnAutoFitWidth(fitSamples, {
    minWidth: meta.minWidth,
    maxWidth: meta.maxWidth,
    mono: meta.mono,
  });

  setColumnSizing((current) => ({
    ...current,
    [columnKey]: nextWidth,
  }));
}

export function createResizableSortableColumnBase<TKey extends string>(
  columnKey: TKey,
  columnSizing: ColumnSizingState,
  meta: ResizableColumnMeta,
  sortState: {
    active: boolean;
    sortOrder?: 'asc' | 'desc';
    onSort: () => void;
    hideVisibleTitle?: boolean;
  },
) {
  return {
    ...getResizableColumnSizing(columnKey, columnSizing, meta),
    header: () =>
      meta.sortable ? (
        <DataTableSortableHeaderButton
          title={meta.title}
          align={meta.align}
          active={sortState.active}
          sortOrder={sortState.sortOrder}
          onClick={sortState.onSort}
          hideVisibleTitle={sortState.hideVisibleTitle}
        />
      ) : (
        <DataTableStaticHeaderLabel title={meta.title} />
      ),
  };
}

export function getDataTableAlignClass(align?: 'left' | 'right' | 'center'): string {
  if (align === 'right') return 'text-right';
  if (align === 'center') return 'text-center';
  return '';
}

export function loadPersistedColumnSizing(
  storageKey: string,
  defaults: ColumnSizingState,
): ColumnSizingState {
  if (typeof window === 'undefined') {
    return defaults;
  }

  try {
    const raw = getPreferenceLocalStorage(storageKey);
    if (!raw) {
      return defaults;
    }

    const parsed = JSON.parse(raw) as Record<string, number>;
    return {
      ...defaults,
      ...parsed,
    };
  } catch {
    return defaults;
  }
}

/**
 * Table preference state backed by preference storage: loads the saved value on mount,
 * rehydrates (or flushes the in-memory value) once preference storage is allowed, and
 * writes changes after `persistDelayMs`.
 */
function usePersistedTablePreference<TState>(
  storageKey: string,
  defaults: TState,
  loadPersisted: (storageKey: string, defaults: TState) => TState,
  persistDelayMs: number,
) {
  const [state, setState] = useState<TState>(() => loadPersisted(storageKey, defaults));
  const stateRef = useRef(state);
  stateRef.current = state;

  const rehydrateOrFlush = useCallback(() => {
    const raw = getPreferenceLocalStorage(storageKey);
    if (raw) {
      setState(loadPersisted(storageKey, defaults));
      return;
    }
    // Flush in-memory state chosen before Accept (prior writes were no-ops).
    setPreferenceLocalStorage(storageKey, JSON.stringify(stateRef.current));
  }, [defaults, loadPersisted, storageKey]);
  useWhenPreferenceStorageAllowed(rehydrateOrFlush);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const timer = window.setTimeout(() => {
      setPreferenceLocalStorage(storageKey, JSON.stringify(state));
    }, persistDelayMs);
    return () => window.clearTimeout(timer);
  }, [persistDelayMs, state, storageKey]);

  return [state, setState] as const;
}

export function usePersistedColumnSizing(storageKey: string, defaults: ColumnSizingState) {
  return usePersistedTablePreference<ColumnSizingState>(storageKey, defaults, loadPersistedColumnSizing, 160);
}

export function loadPersistedColumnOrder(
  storageKey: string,
  defaults: ColumnOrderState,
): ColumnOrderState {
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = getPreferenceLocalStorage(storageKey);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaults;
    const saved = parsed.filter((value): value is string => typeof value === 'string');
    return [...saved.filter((key) => defaults.includes(key)), ...defaults.filter((key) => !saved.includes(key))];
  } catch {
    return defaults;
  }
}

export function usePersistedColumnOrder(storageKey: string, defaults: ColumnOrderState) {
  return usePersistedTablePreference<ColumnOrderState>(storageKey, defaults, loadPersistedColumnOrder, 120);
}

export function getResizableTableWidth(totalSize: number, minWidth = 960): number {
  return Math.max(totalSize, minWidth);
}
