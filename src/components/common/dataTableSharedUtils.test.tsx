import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  usePersistedColumnOrder,
  usePersistedColumnSizing,
} from '@/components/common/dataTableSharedUtils';
import { applyCookieConsentDecision, COOKIE_CONSENT_STORAGE_KEY } from '@/lib/cookieConsent';

const SIZING_KEY = 'znteqr:equipment-table-column-sizing:v3';
const ORDER_KEY = 'znteqr:equipment-table-column-order:v1';
const SIZING_DEFAULTS = { name: 200, status: 120 };
const ORDER_DEFAULTS = ['name', 'status', 'team'];

function acceptPreferences() {
  localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, 'accepted');
}

function readJson(key: string): unknown {
  const raw = localStorage.getItem(key);
  return raw === null ? null : JSON.parse(raw);
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

describe('usePersistedColumnSizing', () => {
  it('merges saved widths over the defaults when preferences are allowed', () => {
    acceptPreferences();
    localStorage.setItem(SIZING_KEY, JSON.stringify({ name: 260 }));

    const { result } = renderHook(() => usePersistedColumnSizing(SIZING_KEY, SIZING_DEFAULTS));

    expect(result.current[0]).toEqual({ name: 260, status: 120 });
  });

  it('writes width changes after a 160 ms debounce', () => {
    acceptPreferences();
    const { result } = renderHook(() => usePersistedColumnSizing(SIZING_KEY, SIZING_DEFAULTS));

    act(() => result.current[1]({ name: 300, status: 120 }));
    act(() => {
      vi.advanceTimersByTime(159);
    });
    expect(localStorage.getItem(SIZING_KEY)).toBeNull();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(readJson(SIZING_KEY)).toEqual({ name: 300, status: 120 });
  });

  it('flushes widths chosen before Accept when nothing is saved yet', () => {
    const { result } = renderHook(() => usePersistedColumnSizing(SIZING_KEY, SIZING_DEFAULTS));

    act(() => result.current[1]({ name: 222, status: 111 }));
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(localStorage.getItem(SIZING_KEY)).toBeNull();

    act(() => {
      applyCookieConsentDecision('accepted');
    });
    expect(readJson(SIZING_KEY)).toEqual({ name: 222, status: 111 });
  });

  it('rehydrates saved widths when preferences are accepted later', () => {
    localStorage.setItem(SIZING_KEY, JSON.stringify({ status: 333 }));
    const { result } = renderHook(() => usePersistedColumnSizing(SIZING_KEY, SIZING_DEFAULTS));
    expect(result.current[0]).toEqual(SIZING_DEFAULTS);

    act(() => {
      applyCookieConsentDecision('accepted');
    });
    expect(result.current[0]).toEqual({ name: 200, status: 333 });
  });
});

describe('usePersistedColumnOrder', () => {
  it('keeps saved known columns first and appends columns missing from the saved order', () => {
    acceptPreferences();
    localStorage.setItem(ORDER_KEY, JSON.stringify(['team', 'removed', 'name']));

    const { result } = renderHook(() => usePersistedColumnOrder(ORDER_KEY, ORDER_DEFAULTS));

    expect(result.current[0]).toEqual(['team', 'name', 'status']);
  });

  it('writes order changes after a 120 ms debounce', () => {
    acceptPreferences();
    const { result } = renderHook(() => usePersistedColumnOrder(ORDER_KEY, ORDER_DEFAULTS));

    act(() => result.current[1](['status', 'team', 'name']));
    act(() => {
      vi.advanceTimersByTime(119);
    });
    expect(localStorage.getItem(ORDER_KEY)).toBeNull();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(readJson(ORDER_KEY)).toEqual(['status', 'team', 'name']);
  });

  it('rehydrates a saved order when preferences are accepted later', () => {
    localStorage.setItem(ORDER_KEY, JSON.stringify(['team']));
    const { result } = renderHook(() => usePersistedColumnOrder(ORDER_KEY, ORDER_DEFAULTS));
    expect(result.current[0]).toEqual(ORDER_DEFAULTS);

    act(() => {
      applyCookieConsentDecision('accepted');
    });
    expect(result.current[0]).toEqual(['team', 'name', 'status']);
  });
});
