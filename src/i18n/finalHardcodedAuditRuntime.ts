import type { Language } from '@/i18n/I18nProvider';
import { getFinalHardcodedAuditCopy } from '@/i18n/finalHardcodedAuditCopy';
import { resolvePreferredLanguage } from '@/i18n/languageStorage';

export function resolveRuntimeLanguage(): Language {
  return resolvePreferredLanguage();
}

export function getRuntimeFinalHardcodedAuditCopy() {
  return getFinalHardcodedAuditCopy(resolveRuntimeLanguage());
}
