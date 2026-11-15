import { describe, expect, it } from 'vitest';
import { auditExplorerResources } from '@/i18n/auditExplorerResources';
import { FIELD_LABELS } from '@/types/audit';

const LANGUAGES = ['en', 'vi', 'ko'] as const;

describe('auditExplorerResources field labels', () => {
  it('shows the canonical FIELD_LABELS as the English field labels', () => {
    expect(auditExplorerResources.en.auditExplorer.fields).toEqual(FIELD_LABELS);
  });

  // ChangesDiff looks up `auditExplorer.fields.<key>` for every key in FIELD_LABELS.
  it.each(LANGUAGES)('%s labels exactly the FIELD_LABELS keys with non-empty text', (language) => {
    const fields: Record<string, string> = auditExplorerResources[language].auditExplorer.fields;

    expect(Object.keys(fields).sort()).toEqual(Object.keys(FIELD_LABELS).sort());
    for (const label of Object.values(fields)) {
      expect(label.trim()).not.toBe('');
    }
  });
});
