import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import {
  CURRENT_LEGAL_POLICY_VERSION_IDS,
  CURRENT_PRIVACY_VERSION_HASHES,
  CURRENT_TERMS_VERSION_HASHES,
  LEGAL_POLICY_VERSION_ID_ALIASES,
  isCanonicalLegalPolicyVersionPair,
  isCurrentLegalPolicyVersionPair,
  type LegalPolicyVersionIds,
} from '@/lib/legalPolicyVersions';
import { logger } from '@/utils/logger';

const storageKey = (userId: string) => `znteqr_pending_terms_acceptance:${userId}`;

export function markPendingTermsAcceptanceForUser(userId: string): void {
  try {
    localStorage.setItem(storageKey(userId), '1');
  } catch {
    // ignore quota / private mode
  }
}

export function clearPendingTermsAcceptanceForUser(userId: string): void {
  try {
    localStorage.removeItem(storageKey(userId));
  } catch {
    // ignore
  }
}

function hasPendingTermsAcceptanceForUser(userId: string): boolean {
  try {
    return localStorage.getItem(storageKey(userId)) === '1';
  } catch {
    return false;
  }
}

/**
 * Sign-up stores acceptance intent in user_metadata so it survives cross-device email verification.
 * Returns the ids the user accepted when they name the current Terms and Privacy texts (a sign-up
 * made before the id rename carries an alias), otherwise null.
 */
function signupAcceptedLegalPolicyVersionIds(user: User): LegalPolicyVersionIds | null {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  if (!meta) return null;

  const accepted = meta.terms_accepted;
  const acceptedOk =
    accepted === true ||
    accepted === 'true' ||
    String(accepted).toLowerCase() === 'true';
  if (!acceptedOk) return null;

  const th = meta.terms_version_hash;
  const ph = meta.privacy_version_hash;
  if (typeof th !== 'string' || typeof ph !== 'string' || !isCurrentLegalPolicyVersionPair(th, ph)) {
    return null;
  }
  return { termsVersionHash: th, privacyVersionHash: ph };
}

function shouldAttemptTermsAcceptanceFlush(user: User): boolean {
  if (hasPendingTermsAcceptanceForUser(user.id)) return true;
  return signupAcceptedLegalPolicyVersionIds(user) !== null;
}

/**
 * A row recorded under an alias id is evidence for the same texts, so it counts: recording
 * another one would invent a second acceptance event.
 */
async function userHasCurrentTermsAcceptanceRow(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('terms_acceptances')
    .select('id')
    .eq('user_id', userId)
    .in('terms_version_hash', CURRENT_TERMS_VERSION_HASHES)
    .in('privacy_version_hash', CURRENT_PRIVACY_VERSION_HASHES)
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.error('Failed to check terms_acceptances row', error);
    return false;
  }
  return data != null;
}

type TermsAcceptancePostOutcome = 'recorded' | 'version-mismatch' | 'failed';

async function postTermsAcceptance(
  accessToken: string,
  ids: LegalPolicyVersionIds,
): Promise<TermsAcceptancePostOutcome> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/record-terms-acceptance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        terms_version_hash: ids.termsVersionHash,
        privacy_version_hash: ids.privacyVersionHash,
      }),
    });

    if (res.status === 409) return 'version-mismatch';
    const payload = await res.json().catch(() => ({}));
    return res.ok && payload?.success === true ? 'recorded' : 'failed';
  } catch {
    return 'failed';
  }
}

/**
 * Records acceptance of the given Terms + Privacy ids: the current ones, or the alias a sign-up
 * made before the id rename accepted. An Edge Function deployed before the rename answers 409 to
 * the current ids; the same texts are then sent once more under their alias ids, so a deploy
 * window where the app is newer than the function does not fail the sign-up.
 */
export async function recordTermsAcceptance(
  accessToken: string,
  ids: LegalPolicyVersionIds = CURRENT_LEGAL_POLICY_VERSION_IDS,
): Promise<boolean> {
  const attempts = isCanonicalLegalPolicyVersionPair(ids) ? [ids, ...LEGAL_POLICY_VERSION_ID_ALIASES] : [ids];
  for (const attempt of attempts) {
    const outcome = await postTermsAcceptance(accessToken, attempt);
    if (outcome !== 'version-mismatch') return outcome === 'recorded';
  }
  return false;
}

/**
 * Email-confirmation signups have no session at submit time; persist intent (localStorage +
 * user_metadata on sign-up) and record evidence on the first session (see AuthProvider auth listener).
 */
export function schedulePendingTermsAcceptanceFlush(user: User): void {
  if (!shouldAttemptTermsAcceptanceFlush(user)) return;

  const userIdAtEvent = user.id;

  queueMicrotask(() => {
    supabase.auth
      .getSession()
      .then(async ({ data: { session: liveSession } }) => {
        const uid = liveSession?.user?.id;
        if (!liveSession?.access_token || uid !== userIdAtEvent) return;

        const sessionUser = liveSession.user;
        if (!shouldAttemptTermsAcceptanceFlush(sessionUser)) return;

        const already = await userHasCurrentTermsAcceptanceRow(uid);
        if (already) {
          clearPendingTermsAcceptanceForUser(uid);
          return;
        }

        // Record the ids the user accepted at sign-up so the row matches what they saw.
        const ok = await recordTermsAcceptance(
          liveSession.access_token,
          signupAcceptedLegalPolicyVersionIds(sessionUser) ?? CURRENT_LEGAL_POLICY_VERSION_IDS,
        );
        if (ok) clearPendingTermsAcceptanceForUser(uid);
      })
      .catch(err => {
        logger.error('Deferred terms acceptance flush failed', err);
      });
  });
}
