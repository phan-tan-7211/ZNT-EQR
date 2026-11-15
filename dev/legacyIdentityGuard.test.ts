import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The product was renamed and moved to new hosts. Nothing in the tracked tree
 * may name the previous product, company, customer or maintainer again: not
 * in code, comments, docs, tests, storage keys or URLs.
 *
 * The patterns are assembled from fragments so this guard does not match
 * itself.
 */
// Separators people put between the words of a name: space, dot, underscore,
// hyphen, slash (file names, e-mail addresses, URLs, identifiers).
const SEP = '[\\s._/-]*';
const fragments = (...parts: string[]) => new RegExp(parts.join(''), 'i');

const LEGACY_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  // The brand was written as one word (optionally with - _ or .). Ordinary
  // copy such as "equip QR labels" (verb + space) is allowed.
  { label: 'previous product name', pattern: fragments('(?<![a-z])', 'equ', 'ip', '[-_.]?', 'q', 'r') },
  // The same name inside a camelCase identifier (case-sensitive on purpose).
  {
    label: 'previous product name',
    pattern: new RegExp(['(?<=[a-z0-9])', 'Equ', 'ip', '[-_.]?', 'Q', '[Rr]'].join('')),
  },
  { label: 'previous company name', pattern: fragments('colum', 'bia', SEP, 'cloud', SEP, 'works') },
  { label: 'previous company name', pattern: fragments('cloud', '[-_.]?', 'works') },
  { label: 'previous customer name', pattern: fragments('(?<![a-z0-9])', '3', '[\\s-]?', 'a', '[\\s._-]?', 'equip') },
  { label: 'previous maintainer name', pattern: fragments('nicho', 'las', SEP, 'king') },
  { label: 'previous maintainer name', pattern: fragments('nicho', 'las', '-', 'google') },
  { label: 'previous customer contact', pattern: fragments('han', 'kins') },
  { label: 'previous demo organisation', pattern: fragments('(?<![a-z])', 'cw', SEP, 'rentals') },
  { label: 'previous publisher domain', pattern: fragments('theca', 'bcall') },
];

// Contents of these are not scanned (text inside images cannot be matched;
// check new images by eye). Their file names are still checked.
const BINARY_FILE = /\.(png|jpe?g|gif|webp|avif|ico|ttf|otf|woff2?|eot|pdf|mp4|webm|zip|gz|lockb)$/i;
const SKIPPED_FILES = new Set(['package-lock.json', 'docs/package-lock.json']);

function trackedFiles(root: string): string[] {
  return execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    .split('\0')
    .filter((file) => file.length > 0);
}

describe('legacy identity guard', () => {
  it('finds no trace of the previous product, company, customer or maintainer', () => {
    const root = process.cwd();
    const offenders: string[] = [];

    for (const file of trackedFiles(root)) {
      for (const { label, pattern } of LEGACY_PATTERNS) {
        if (pattern.test(file)) offenders.push(`${file}: file name contains the ${label}`);
      }

      if (BINARY_FILE.test(file) || SKIPPED_FILES.has(file)) continue;

      let content: string;
      try {
        content = readFileSync(join(root, file), 'utf8');
      } catch {
        continue; // deleted in the working tree but still listed, or unreadable
      }
      for (const { label, pattern } of LEGACY_PATTERNS) {
        const match = pattern.exec(content);
        if (match) {
          const line = content.slice(0, match.index).split('\n').length;
          offenders.push(`${file}:${line}: ${label}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});

describe('legacy identity guard patterns', () => {
  const codes = (...c: number[]) => String.fromCharCode(...c);
  const product = codes(101, 113, 117, 105, 112); // first half of the old product name
  const matches = (text: string) => LEGACY_PATTERNS.some(({ pattern }) => pattern.test(text));

  it.each([
    `${product}QR`,
    `${product.toUpperCase()}QR`,
    `${product}-qr-preview`,
    `VITE_${product.toUpperCase()}QR_URL`,
    `3A-${product}ment-Logo.png`,
    `3-A ${product}ment`,
    `3a${product}.com`,
    'nicho' + 'las.king@example.com',
    'Nicho' + 'las King',
    'nicho' + 'las-google-qbo.json',
    `M. ${codes(72, 97, 110, 107, 105, 110, 115)}`,
    'CW' + ' Rentals',
    `const cloud${'Works'}Links`,
    `legacy${codes(69, 113, 117, 105, 112)}QrPrefix`,
    `use${codes(69, 113, 117, 105, 112)}QR`,
  ])('flags %s', (text) => {
    expect(matches(text)).toBe(true);
  });

  it.each([
    'Equip QR labels on every machine',
    'equipment QR codes',
    'Step 3 add equipment',
    'ZNTEQR',
    'znteqr_offline_queue',
    'Equipment Rentals',
    'cloud storage works offline',
  ])('allows %s', (text) => {
    expect(matches(text)).toBe(false);
  });
});
