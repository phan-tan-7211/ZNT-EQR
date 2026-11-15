/** Supported UI languages (also exported from `@/i18n` and `@/i18n/I18nProvider`). */
export type Language = 'vi' | 'en' | 'ko';

export const LANGUAGE_STORAGE_KEY = 'znteqr-language';

/**
 * Resolves the UI language: the saved choice when it is a supported language,
 * otherwise the browser language (Vietnamese or Korean), otherwise English.
 * Without a window (SSR) it always returns English.
 */
export function resolvePreferredLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (saved === 'vi' || saved === 'en' || saved === 'ko') return saved;
  const browserLanguage = window.navigator.language.toLowerCase();
  if (browserLanguage.startsWith('vi')) return 'vi';
  if (browserLanguage.startsWith('ko')) return 'ko';
  return 'en';
}
