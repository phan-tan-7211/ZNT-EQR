import { afterEach, describe, expect, it, vi } from 'vitest';
import { LANGUAGE_STORAGE_KEY, resolvePreferredLanguage } from '@/i18n/languageStorage';

function stubBrowser(saved: string | null, browserLanguage = 'en-US') {
  const getItem = vi.fn<(key: string) => string | null>(() => saved);
  vi.stubGlobal('window', {
    localStorage: { getItem },
    navigator: { language: browserLanguage },
  });
  return getItem;
}

describe('resolvePreferredLanguage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns English when there is no window', () => {
    expect(typeof window).toBe('undefined');
    expect(resolvePreferredLanguage()).toBe('en');
  });

  it.each(['vi', 'en', 'ko'] as const)('returns the saved language %s', (saved) => {
    const getItem = stubBrowser(saved, 'ko-KR');
    expect(resolvePreferredLanguage()).toBe(saved);
    expect(getItem).toHaveBeenCalledWith(LANGUAGE_STORAGE_KEY);
  });

  it('reads the znteqr-language key', () => {
    expect(LANGUAGE_STORAGE_KEY).toBe('znteqr-language');
  });

  it.each([
    [null, 'vi-VN', 'vi'],
    ['fr', 'VI', 'vi'],
    [null, 'ko-KR', 'ko'],
    ['VI', 'ko', 'ko'],
    [null, 'en-GB', 'en'],
    ['', 'de-DE', 'en'],
  ] as const)('falls back to the browser language (saved %s, browser %s)', (saved, browserLanguage, expected) => {
    stubBrowser(saved, browserLanguage);
    expect(resolvePreferredLanguage()).toBe(expected);
  });

  it('lets storage access errors propagate', () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => {
          throw new Error('storage blocked');
        },
      },
      navigator: { language: 'vi-VN' },
    });
    expect(() => resolvePreferredLanguage()).toThrow('storage blocked');
  });
});
