import type { User } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFrom, mockGetSession } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetSession: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mockFrom,
    auth: { getSession: mockGetSession },
  },
}));

import { PRIVACY_VERSION_HASH, TERMS_VERSION_HASH } from '@/lib/legalPolicyVersions';
import {
  markPendingTermsAcceptanceForUser,
  recordTermsAcceptance,
  schedulePendingTermsAcceptanceFlush,
} from '@/lib/termsAcceptanceRecording';

// Spelled as character codes for the same reason as in the module under test.
const LEGACY = String.fromCharCode(101, 113, 117, 105, 112, 113, 114);
const LEGACY_TERMS = `${LEGACY}-terms-2026-05-03`;
const LEGACY_PRIVACY = `${LEGACY}-privacy-2026-05-03`;

const USER_ID = 'user-1';
const PENDING_KEY = `znteqr_pending_terms_acceptance:${USER_ID}`;

type AcceptanceRow = Record<'user_id' | 'terms_version_hash' | 'privacy_version_hash', string>;
type SentIds = { terms_version_hash: string; privacy_version_hash: string };

function signupUser(termsVersionHash: string, privacyVersionHash: string): User {
  return {
    id: USER_ID,
    user_metadata: {
      terms_accepted: 'true',
      terms_version_hash: termsVersionHash,
      privacy_version_hash: privacyVersionHash,
    },
  } as unknown as User;
}

/** terms_acceptances double that applies the query's filters the way PostgREST would. */
function mockAcceptanceRows(rows: AcceptanceRow[]) {
  const filters: Array<(row: AcceptanceRow) => boolean> = [];
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn((column: keyof AcceptanceRow, value: string) => {
      filters.push((row) => row[column] === value);
      return chain;
    }),
    in: vi.fn((column: keyof AcceptanceRow, values: readonly string[]) => {
      filters.push((row) => values.includes(row[column]));
      return chain;
    }),
    limit: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => ({
      data: rows.some((row) => filters.every((matches) => matches(row))) ? { id: 'row-1' } : null,
      error: null,
    })),
  };
  mockFrom.mockReturnValue(chain);
  return chain;
}

/**
 * record-terms-acceptance double: 409 for ids it does not know, like the real function.
 * `acceptedTerms` lists the Terms ids the deployed function accepts.
 */
function stubRecordFunction(acceptedTerms: string[]) {
  const sent: SentIds[] = [];
  const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as SentIds;
    sent.push(body);
    if (!acceptedTerms.includes(body.terms_version_hash)) {
      return new Response(JSON.stringify({ error: 'Legal policy version mismatch' }), { status: 409 });
    }
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, sent };
}

/** Lets the queued flush (microtask, session lookup, row lookup, POST) run to completion. */
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('schedulePendingTermsAcceptanceFlush', () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockGetSession.mockReset();
  });

  function startSession(user: User) {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'token', user } } });
  }

  it('records the acceptance of a sign-up made before the id rename, under the ids that user accepted', async () => {
    const user = signupUser(LEGACY_TERMS, LEGACY_PRIVACY);
    startSession(user);
    mockAcceptanceRows([]);
    const { sent } = stubRecordFunction([TERMS_VERSION_HASH, LEGACY_TERMS]);

    schedulePendingTermsAcceptanceFlush(user);
    await settle();

    expect(sent).toEqual([{ terms_version_hash: LEGACY_TERMS, privacy_version_hash: LEGACY_PRIVACY }]);
  });

  it('does not record a second acceptance when the existing row carries the pre-rename ids', async () => {
    const user = signupUser(LEGACY_TERMS, LEGACY_PRIVACY);
    startSession(user);
    markPendingTermsAcceptanceForUser(USER_ID);
    const lookup = mockAcceptanceRows([
      { user_id: USER_ID, terms_version_hash: LEGACY_TERMS, privacy_version_hash: LEGACY_PRIVACY },
    ]);
    const { fetchMock } = stubRecordFunction([TERMS_VERSION_HASH, LEGACY_TERMS]);

    schedulePendingTermsAcceptanceFlush(user);
    await settle();

    expect(lookup.maybeSingle).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(localStorage.getItem(PENDING_KEY)).toBeNull();
  });

  it('counts a pre-rename row for a sign-up that stored the current ids', async () => {
    const user = signupUser(TERMS_VERSION_HASH, PRIVACY_VERSION_HASH);
    startSession(user);
    mockAcceptanceRows([
      { user_id: USER_ID, terms_version_hash: LEGACY_TERMS, privacy_version_hash: LEGACY_PRIVACY },
    ]);
    const { fetchMock } = stubRecordFunction([TERMS_VERSION_HASH, LEGACY_TERMS]);

    schedulePendingTermsAcceptanceFlush(user);
    await settle();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('records a current sign-up without a row under the current ids', async () => {
    const user = signupUser(TERMS_VERSION_HASH, PRIVACY_VERSION_HASH);
    startSession(user);
    mockAcceptanceRows([
      { user_id: 'someone-else', terms_version_hash: TERMS_VERSION_HASH, privacy_version_hash: PRIVACY_VERSION_HASH },
    ]);
    const { sent } = stubRecordFunction([TERMS_VERSION_HASH, LEGACY_TERMS]);

    schedulePendingTermsAcceptanceFlush(user);
    await settle();

    expect(sent).toEqual([{ terms_version_hash: TERMS_VERSION_HASH, privacy_version_hash: PRIVACY_VERSION_HASH }]);
  });

  it('ignores sign-up metadata that names another policy version', async () => {
    const user = signupUser('znteqr-terms-2026-01-01', 'znteqr-privacy-2026-01-01');
    startSession(user);
    mockAcceptanceRows([]);
    const { fetchMock } = stubRecordFunction([TERMS_VERSION_HASH, LEGACY_TERMS]);

    schedulePendingTermsAcceptanceFlush(user);
    await settle();

    expect(mockGetSession).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('recordTermsAcceptance', () => {
  it('sends the current ids', async () => {
    const { sent } = stubRecordFunction([TERMS_VERSION_HASH, LEGACY_TERMS]);

    await expect(recordTermsAcceptance('token')).resolves.toBe(true);
    expect(sent).toEqual([{ terms_version_hash: TERMS_VERSION_HASH, privacy_version_hash: PRIVACY_VERSION_HASH }]);
  });

  it('falls back to the pre-rename ids when the deployed function predates the rename', async () => {
    const { sent } = stubRecordFunction([LEGACY_TERMS]);

    await expect(recordTermsAcceptance('token')).resolves.toBe(true);
    expect(sent).toEqual([
      { terms_version_hash: TERMS_VERSION_HASH, privacy_version_hash: PRIVACY_VERSION_HASH },
      { terms_version_hash: LEGACY_TERMS, privacy_version_hash: LEGACY_PRIVACY },
    ]);
  });

  it('gives up after the aliases when the function knows none of the ids', async () => {
    const { sent } = stubRecordFunction(['znteqr-terms-2027-01-01']);

    await expect(recordTermsAcceptance('token')).resolves.toBe(false);
    expect(sent).toHaveLength(2);
  });

  it('does not resend after a failure other than a version mismatch', async () => {
    const fetchMock = vi.fn(async () => new Response('boom', { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(recordTermsAcceptance('token')).resolves.toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
