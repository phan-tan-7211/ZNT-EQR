import { describe, expect, it } from 'vitest';
import { localizeDocsUrl } from './localizeDocsUrl';

describe('localizeDocsUrl', () => {
  const support = 'https://eqrdocs.zinitek.com/support';

  it('keeps English guides at the root', () => {
    expect(localizeDocsUrl(support, 'en')).toBe(support);
  });

  it('prefixes Vietnamese and Korean guides', () => {
    expect(localizeDocsUrl(support, 'vi')).toBe('https://eqrdocs.zinitek.com/vi/support');
    expect(localizeDocsUrl(support, 'ko')).toBe('https://eqrdocs.zinitek.com/ko/support');
  });

  it('keeps nested paths, the local dev host and its port', () => {
    expect(
      localizeDocsUrl('http://localhost:5174/support/administration/operator-daily-check-ins', 'vi'),
    ).toBe('http://localhost:5174/vi/support/administration/operator-daily-check-ins');
  });

  it('does not prefix a URL twice', () => {
    expect(localizeDocsUrl('https://eqrdocs.zinitek.com/ko/support', 'ko')).toBe(
      'https://eqrdocs.zinitek.com/ko/support',
    );
  });

  it('returns the URL unchanged for a missing language, an unknown language or a bad URL', () => {
    expect(localizeDocsUrl(support, undefined)).toBe(support);
    expect(localizeDocsUrl(support, 'fr')).toBe(support);
    expect(localizeDocsUrl('not a url', 'vi')).toBe('not a url');
  });
});
