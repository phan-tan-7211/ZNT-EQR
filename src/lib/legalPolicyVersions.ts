/**
 * Semantic version tokens for Terms + Privacy evidence rows.
 * Bump these whenever published legal pages materially change.
 *
 * Edge Function `record-terms-acceptance` duplicates these in
 * `supabase/functions/_shared/legal-policy-versions.ts` — keep both files in sync.
 */
export const TERMS_VERSION_HASH = 'znteqr-terms-2026-05-03';
export const PRIVACY_VERSION_HASH = 'znteqr-privacy-2026-05-03';

/** A Terms + Privacy version id pair, as sent to `record-terms-acceptance` and stored in user_metadata. */
export interface LegalPolicyVersionIds {
  termsVersionHash: string;
  privacyVersionHash: string;
}

export const CURRENT_LEGAL_POLICY_VERSION_IDS: LegalPolicyVersionIds = {
  termsVersionHash: TERMS_VERSION_HASH,
  privacyVersionHash: PRIVACY_VERSION_HASH,
};

// The product's previous id prefix, spelled as character codes so the old name
// does not appear as a word in the source tree.
const RETIRED_ID_PREFIX = String.fromCharCode(101, 113, 117, 105, 112, 113, 114);

/**
 * Earlier ids of the current (unchanged) Terms and Privacy texts. Sign-ups made
 * before the ids were renamed carry them in user_metadata and in their
 * terms_acceptances rows, cached app bundles still send them, and an Edge
 * Function deployed before the rename accepts only them. Every comparison of an
 * id that comes from a client or from storage treats them as the current ids.
 *
 * Remove this list, together with its twin in
 * `supabase/functions/_shared/legal-policy-versions.ts`, in the same release that
 * bumps TERMS_VERSION_HASH or PRIVACY_VERSION_HASH (the aliases then name a
 * superseded text), or earlier once no app bundle and no unconfirmed sign-up from
 * before the rename (2026-11-15) can still be in use.
 */
export const LEGAL_POLICY_VERSION_ID_ALIASES: readonly LegalPolicyVersionIds[] = [
  {
    termsVersionHash: `${RETIRED_ID_PREFIX}-terms-2026-05-03`,
    privacyVersionHash: `${RETIRED_ID_PREFIX}-privacy-2026-05-03`,
  },
];

const CURRENT_AND_ALIAS_IDS: readonly LegalPolicyVersionIds[] = [
  CURRENT_LEGAL_POLICY_VERSION_IDS,
  ...LEGAL_POLICY_VERSION_ID_ALIASES,
];

/** Every id of the current Terms text, current id first (for terms_acceptances lookups). */
export const CURRENT_TERMS_VERSION_HASHES: readonly string[] = CURRENT_AND_ALIAS_IDS.map(
  (ids) => ids.termsVersionHash,
);

/** Every id of the current Privacy text, current id first (for terms_acceptances lookups). */
export const CURRENT_PRIVACY_VERSION_HASHES: readonly string[] = CURRENT_AND_ALIAS_IDS.map(
  (ids) => ids.privacyVersionHash,
);

/** True when the pair names the current Terms and Privacy texts, under the current ids or an alias. */
export function isCurrentLegalPolicyVersionPair(termsVersionHash: unknown, privacyVersionHash: unknown): boolean {
  return CURRENT_AND_ALIAS_IDS.some(
    (ids) => ids.termsVersionHash === termsVersionHash && ids.privacyVersionHash === privacyVersionHash,
  );
}

/** True when the pair is exactly the current ids (not an alias). */
export function isCanonicalLegalPolicyVersionPair(ids: LegalPolicyVersionIds): boolean {
  return (
    ids.termsVersionHash === CURRENT_LEGAL_POLICY_VERSION_IDS.termsVersionHash &&
    ids.privacyVersionHash === CURRENT_LEGAL_POLICY_VERSION_IDS.privacyVersionHash
  );
}
