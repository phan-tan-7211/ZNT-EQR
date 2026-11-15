import { describe, expect, it } from 'vitest';
import { landingImage } from './landingImage';

describe('landingImage', () => {
  it('returns a same-origin path under /images/landing/', () => {
    expect(landingImage('homepage-collage/col-3.webp')).toBe(
      '/images/landing/homepage-collage/col-3.webp',
    );
  });

  it('no longer resolves the retired 2026-04 product stills', () => {
    // They showed the previous product identity and real people's details.
    for (const retired of ['work-orders-list-2026-04.webp', 'teams-list-2026-04.webp', 'team-detail-2026-04.webp']) {
      expect(() => landingImage(retired)).toThrow(/unknown/i);
    }
  });

  it('resolves collage strip keys', () => {
    expect(landingImage('homepage-collage/col-0.webp')).toBe(
      '/images/landing/homepage-collage/col-0.webp',
    );
  });

  it('strips a leading slash before resolving', () => {
    expect(landingImage('/homepage-collage/col-0.webp')).toBe(
      '/images/landing/homepage-collage/col-0.webp',
    );
  });

  it('normalizes backslashes', () => {
    expect(landingImage('homepage-collage\\col-0.webp')).toBe(
      '/images/landing/homepage-collage/col-0.webp',
    );
  });

  it('throws for an unknown key', () => {
    expect(() => landingImage('hero.png')).toThrow(/unknown/i);
  });

  it('throws for pr-evidence paths', () => {
    expect(() => landingImage('pr-evidence/branch/shot.png')).toThrow(/pr-evidence/);
  });

  it('throws for parent-directory segments', () => {
    expect(() => landingImage('../work-orders-list-2026-04.webp')).toThrow(/\.\./);
  });
});
