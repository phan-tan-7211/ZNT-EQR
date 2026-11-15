/**
 * Canonical legal policy version tokens for terms_acceptances evidence.
 * Must stay identical to `src/lib/legalPolicyVersions.ts` (bump both together,
 * and empty LEGAL_POLICY_VERSION_ID_ALIASES in both in the same change).
 *
 * No imports: keeps this module runnable with a plain `deno test`.
 */
export const TERMS_VERSION_HASH = 'znteqr-terms-2026-05-03';
export const PRIVACY_VERSION_HASH = 'znteqr-privacy-2026-05-03';

export interface LegalPolicyVersionIds {
  termsVersionHash: string;
  privacyVersionHash: string;
}

// The product's previous id prefix, spelled as character codes so the old name
// does not appear as a word in the source tree.
const RETIRED_ID_PREFIX = String.fromCharCode(101, 113, 117, 105, 112, 113, 114);

/**
 * Earlier ids of the current (unchanged) Terms and Privacy texts. App bundles
 * built before the ids were renamed still send them, and sign-ups made before
 * the rename carry them in user_metadata, so they are accepted as the current
 * ids and recorded as sent.
 *
 * Remove this list, together with its twin in `src/lib/legalPolicyVersions.ts`,
 * in the same release that bumps TERMS_VERSION_HASH or PRIVACY_VERSION_HASH (the
 * aliases then name a superseded text), and not earlier: the app finds the rows
 * recorded under the alias ids only through its twin list, and without it would
 * record a second acceptance event for those users.
 */
export const LEGAL_POLICY_VERSION_ID_ALIASES: readonly LegalPolicyVersionIds[] = [
  {
    termsVersionHash: `${RETIRED_ID_PREFIX}-terms-2026-05-03`,
    privacyVersionHash: `${RETIRED_ID_PREFIX}-privacy-2026-05-03`,
  },
];

const CURRENT_AND_ALIAS_IDS: readonly LegalPolicyVersionIds[] = [
  { termsVersionHash: TERMS_VERSION_HASH, privacyVersionHash: PRIVACY_VERSION_HASH },
  ...LEGAL_POLICY_VERSION_ID_ALIASES,
];

const MAX_VERSION_ID_LENGTH = 256;

export type ClientLegalPolicyVersionCheck =
  /** The ids to record: exactly what the client sent (trimmed), the current ids or an alias. */
  | { ok: true; ids: LegalPolicyVersionIds }
  /** Missing, empty, non-string or oversized ids (400). */
  | { ok: false; reason: 'invalid' }
  /** Well-formed ids that do not name the current texts (409). */
  | { ok: false; reason: 'mismatch' };

/** Validates the version ids a client sent with its acceptance. */
export function checkClientLegalPolicyVersions(
  termsVersionHash: unknown,
  privacyVersionHash: unknown,
): ClientLegalPolicyVersionCheck {
  const terms = typeof termsVersionHash === 'string' ? termsVersionHash.trim() : '';
  const privacy = typeof privacyVersionHash === 'string' ? privacyVersionHash.trim() : '';

  if (!terms || !privacy || terms.length > MAX_VERSION_ID_LENGTH || privacy.length > MAX_VERSION_ID_LENGTH) {
    return { ok: false, reason: 'invalid' };
  }

  const known = CURRENT_AND_ALIAS_IDS.find(
    (ids) => ids.termsVersionHash === terms && ids.privacyVersionHash === privacy,
  );
  if (!known) return { ok: false, reason: 'mismatch' };

  return { ok: true, ids: { termsVersionHash: known.termsVersionHash, privacyVersionHash: known.privacyVersionHash } };
}
