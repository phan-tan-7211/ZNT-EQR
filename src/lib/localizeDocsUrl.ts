/** Languages the Help Center publishes under a path prefix (English is served at the root). */
const DOCS_LOCALE_PREFIXES: Record<string, string> = {
  vi: '/vi',
  ko: '/ko',
};

/**
 * Points a Help Center URL at the guide in the reader's language.
 *
 * `https://eqrdocs.zinitek.com/support` becomes `https://eqrdocs.zinitek.com/vi/support`
 * for Vietnamese and `/ko/support` for Korean. English, unknown languages and
 * unparseable URLs are returned unchanged.
 */
export function localizeDocsUrl(url: string, language: string | undefined): string {
  const prefix = language ? DOCS_LOCALE_PREFIXES[language] : undefined;
  if (!prefix) return url;

  try {
    const parsed = new URL(url);
    if (parsed.pathname === prefix || parsed.pathname.startsWith(`${prefix}/`)) return url;
    parsed.pathname = `${prefix}${parsed.pathname === '/' ? '' : parsed.pathname}`;
    return parsed.toString();
  } catch {
    return url;
  }
}
