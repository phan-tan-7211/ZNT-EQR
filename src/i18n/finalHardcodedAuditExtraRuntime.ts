import { getFinalHardcodedAuditExtraCopy } from '@/i18n/finalHardcodedAuditExtraCopy';
import { resolvePreferredLanguage } from '@/i18n/languageStorage';

export function getRuntimeFinalHardcodedAuditExtraCopy() {
  return getFinalHardcodedAuditExtraCopy(resolvePreferredLanguage());
}
