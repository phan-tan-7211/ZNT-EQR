import { getFinalHardcodedAuditCopy } from '@/i18n/finalHardcodedAuditCopy';
import { resolvePreferredLanguage } from '@/i18n/languageStorage';

export function getRuntimeFinalHardcodedAuditCopy() {
  return getFinalHardcodedAuditCopy(resolvePreferredLanguage());
}
