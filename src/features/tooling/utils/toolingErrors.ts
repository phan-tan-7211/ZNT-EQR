/**
 * Tooling RPCs raise stable machine codes (e.g. `TOOLING_ALREADY_ISSUED`) as
 * the Postgres error message. Map them to i18n keys under `tooling.errors.*`.
 */
export const TOOLING_ERROR_CODES = [
  'TOOLING_NOT_AUTHENTICATED',
  'TOOLING_NOT_FOUND',
  'TOOLING_PERMISSION_DENIED',
  'TOOLING_CROSS_ORGANIZATION',
  'TOOLING_RESPONSIBLE_NOT_MEMBER',
  'TOOLING_MACHINE_IS_TOOL',
  'TOOLING_EQUIPMENT_NOT_TL',
  'TOOLING_ALREADY_REGISTERED',
  'TOOLING_NAME_REQUIRED',
  'TOOLING_RETIRED',
  'TOOLING_COMPATIBILITY_DUPLICATE',
  'TOOLING_COMPATIBILITY_INACTIVE',
  'TOOLING_INVALID_ACTION',
  'TOOLING_HOLDER_NOT_MEMBER',
  'TOOLING_ALREADY_ISSUED',
  'TOOLING_NOT_APPROVED',
  'TOOLING_NOT_USABLE',
  'TOOLING_DAMAGED',
  'TOOLING_LIFE_LIMIT_REACHED',
  'TOOLING_INSPECTION_OVERDUE',
  'TOOLING_INCOMPATIBLE_CONTEXT',
  'TOOLING_INVALID_QUANTITY',
  'TOOLING_CONDITION_REQUIRED',
  'TOOLING_NOT_ISSUED',
  'TOOLING_LOCATION_REQUIRED',
  'TOOLING_ISSUED_RETURN_FIRST',
  'TOOLING_REASON_REQUIRED',
  'TOOLING_USAGE_NEGATIVE',
  'TOOLING_UNIT_LOCKED',
  'TOOLING_DISPOSITION_REQUIRED',
  'TOOLING_INVALID_LIFE_LIMIT',
  'TOOLING_INVALID_STATE',
  'TOOLING_WORK_ORDER_MISMATCH',
  'TOOLING_RTS_REQUIRES_PASS',
  'TOOLING_REVISION_REQUIRED',
  'TOOLING_REVISION_DUPLICATE',
] as const;
export type ToolingErrorCode = (typeof TOOLING_ERROR_CODES)[number];

const CODE_PATTERN = /TOOLING_[A-Z_]+/;

export function extractToolingErrorCode(error: unknown): ToolingErrorCode | null {
  const message =
    typeof error === 'string'
      ? error
      : error && typeof error === 'object' && 'message' in error
        ? String((error as { message: unknown }).message)
        : '';
  const match = message.match(CODE_PATTERN);
  if (!match) return null;
  return (TOOLING_ERROR_CODES as readonly string[]).includes(match[0]) ? (match[0] as ToolingErrorCode) : null;
}

/**
 * Translate a tooling mutation error. Unknown errors fall back to the generic
 * message; Postgres unique-violation on master tables maps to `duplicateCode`.
 */
export function toolingErrorMessage(error: unknown, t: (key: string) => string): string {
  const code = extractToolingErrorCode(error);
  if (code) return t(`tooling.errors.${code}`);
  if (error && typeof error === 'object' && 'code' in error) {
    const pgCode = String((error as { code: unknown }).code);
    if (pgCode === '23505') return t('tooling.errors.duplicateCode');
    if (pgCode === '42501') return t('tooling.errors.TOOLING_PERMISSION_DENIED');
  }
  return t('tooling.errors.generic');
}
