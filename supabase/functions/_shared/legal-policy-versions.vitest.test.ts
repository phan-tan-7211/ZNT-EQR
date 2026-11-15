import { describe, expect, it } from 'vitest';
import * as app from '@/lib/legalPolicyVersions';
import * as edge from './legal-policy-versions';

/**
 * The app and record-terms-acceptance each keep their own copy of the legal policy
 * version ids. Deno tests do not run in CI, so this keeps the two copies in step.
 */
describe('legal policy version ids shared by the app and the Edge Function', () => {
  it('uses the same current ids in both runtimes', () => {
    expect(edge.TERMS_VERSION_HASH).toBe(app.TERMS_VERSION_HASH);
    expect(edge.PRIVACY_VERSION_HASH).toBe(app.PRIVACY_VERSION_HASH);
  });

  it('uses the same alias list in both runtimes', () => {
    expect(edge.LEGAL_POLICY_VERSION_ID_ALIASES).toEqual(app.LEGAL_POLICY_VERSION_ID_ALIASES);
  });

  it('keeps aliases only of the current texts (empty the list when an id is bumped)', () => {
    // An alias is the current id under the previous product prefix: `<product>-<policy>-<date>`.
    const withCurrentPrefix = (id: string) => `znteqr${id.slice(id.indexOf('-'))}`;
    const bumpHint =
      'TERMS_VERSION_HASH or PRIVACY_VERSION_HASH was bumped: empty LEGAL_POLICY_VERSION_ID_ALIASES in both runtimes';

    for (const alias of app.LEGAL_POLICY_VERSION_ID_ALIASES) {
      expect(alias.termsVersionHash).not.toBe(app.TERMS_VERSION_HASH);
      expect(alias.privacyVersionHash).not.toBe(app.PRIVACY_VERSION_HASH);
      expect(withCurrentPrefix(alias.termsVersionHash), bumpHint).toBe(app.TERMS_VERSION_HASH);
      expect(withCurrentPrefix(alias.privacyVersionHash), bumpHint).toBe(app.PRIVACY_VERSION_HASH);
    }
  });

  it('accepts, and records as sent, every id pair the app sends or reads from storage', () => {
    const pairs = [app.CURRENT_LEGAL_POLICY_VERSION_IDS, ...app.LEGAL_POLICY_VERSION_ID_ALIASES];
    for (const ids of pairs) {
      expect(app.isCurrentLegalPolicyVersionPair(ids.termsVersionHash, ids.privacyVersionHash)).toBe(true);
      expect(edge.checkClientLegalPolicyVersions(ids.termsVersionHash, ids.privacyVersionHash)).toEqual({
        ok: true,
        ids,
      });
    }
  });
});
