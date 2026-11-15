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
const LEGACY_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'previous product name', pattern: new RegExp(['equ', 'ip', '[-_ ]?', 'q', 'r'].join(''), 'i') },
  { label: 'previous company name', pattern: new RegExp(['colum', 'bia', '[-_ ]?', 'cloud', '[-_ ]?', 'works'].join(''), 'i') },
  { label: 'previous customer name', pattern: new RegExp(['3-A', ' ', 'Equip', 'ment'].join(''), 'i') },
  { label: 'previous maintainer name', pattern: new RegExp(['Nicho', 'las', ' ', 'King'].join(''), 'i') },
];

const BINARY_FILE = /\.(png|jpe?g|gif|webp|avif|ico|svg|ttf|otf|woff2?|eot|pdf|mp4|webm|zip|gz|lockb)$/i;
const SKIPPED_FILES = new Set(['package-lock.json', 'docs/package-lock.json']);

function trackedFiles(root: string): string[] {
  return execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    .split('\0')
    .filter((file) => file.length > 0 && !BINARY_FILE.test(file) && !SKIPPED_FILES.has(file));
}

describe('legacy identity guard', () => {
  it('finds no trace of the previous product, company, customer or maintainer', () => {
    const root = process.cwd();
    const offenders: string[] = [];

    for (const file of trackedFiles(root)) {
      for (const { label, pattern } of LEGACY_PATTERNS) {
        if (pattern.test(file)) offenders.push(`${file}: file name contains the ${label}`);
      }

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
