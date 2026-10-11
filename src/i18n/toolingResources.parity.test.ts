import { describe, expect, it } from 'vitest';
import { toolingResources } from '@/i18n/toolingResources';
import { toolingMasterResources } from '@/i18n/toolingMasterResources';
import { toolingCompatibilityResources } from '@/i18n/toolingCompatibilityResources';
import { toolingOperationsResources } from '@/i18n/toolingOperationsResources';

type Tree = { readonly [key: string]: unknown };

const LANGUAGES = ['en', 'vi', 'ko'] as const;

const RESOURCE_FILES: Record<string, Record<(typeof LANGUAGES)[number], Tree>> = {
  toolingResources,
  toolingMasterResources,
  toolingCompatibilityResources,
  toolingOperationsResources,
};

/** Flatten a nested resource tree into `dotted.key -> string value`. */
function flatten(tree: unknown, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  if (!tree || typeof tree !== 'object') return out;
  for (const [key, value] of Object.entries(tree as Tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      out.set(path, value);
    } else if (value && typeof value === 'object') {
      for (const [nestedKey, nestedValue] of flatten(value, path)) out.set(nestedKey, nestedValue);
    } else {
      out.set(path, `<<non-string:${typeof value}>>`);
    }
  }
  return out;
}

function tokens(value: string): string[] {
  return [...value.matchAll(/{{\s*([^}\s]+)\s*}}/g)].map((match) => match[1]).sort();
}

describe.each(Object.entries(RESOURCE_FILES))('%s en/vi/ko parity', (_name, resources) => {
  const english = flatten(resources.en);

  it('has the same top-level namespaces in every language', () => {
    const namespaces = Object.keys(resources.en).sort();
    for (const language of LANGUAGES) {
      expect(Object.keys(resources[language]).sort()).toEqual(namespaces);
    }
  });

  it.each(['vi', 'ko'] as const)('%s has exactly the English key set', (language) => {
    const localized = flatten(resources[language]);
    const missing = [...english.keys()].filter((key) => !localized.has(key));
    const extra = [...localized.keys()].filter((key) => !english.has(key));
    expect({ missing, extra }).toEqual({ missing: [], extra: [] });
  });

  it.each(['vi', 'ko'] as const)('%s keeps the same {{token}} placeholders', (language) => {
    const localized = flatten(resources[language]);
    const mismatches: string[] = [];
    for (const [key, englishValue] of english) {
      const localizedValue = localized.get(key);
      if (localizedValue === undefined) continue;
      const expected = tokens(englishValue).join(',');
      const actual = tokens(localizedValue).join(',');
      if (expected !== actual) mismatches.push(`${key}: en[${expected}] ${language}[${actual}]`);
    }
    expect(mismatches).toEqual([]);
  });

  it('has only non-empty string leaves', () => {
    for (const language of LANGUAGES) {
      const invalid = [...flatten(resources[language])]
        .filter(([, value]) => value.startsWith('<<non-string:') || value.trim() === '')
        .map(([key]) => `${language}:${key}`);
      expect(invalid).toEqual([]);
    }
  });
});
