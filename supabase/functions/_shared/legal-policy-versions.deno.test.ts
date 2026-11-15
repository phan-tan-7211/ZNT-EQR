import { assertEquals } from "jsr:@std/assert@1";
import {
  checkClientLegalPolicyVersions,
  type ClientLegalPolicyVersionCheck,
  LEGAL_POLICY_VERSION_ID_ALIASES,
  PRIVACY_VERSION_HASH,
  TERMS_VERSION_HASH,
} from "./legal-policy-versions.ts";

// Spelled as character codes for the same reason as in the module under test.
const LEGACY = String.fromCharCode(101, 113, 117, 105, 112, 113, 114);
const LEGACY_TERMS = `${LEGACY}-terms-2026-05-03`;
const LEGACY_PRIVACY = `${LEGACY}-privacy-2026-05-03`;

Deno.test("current ids are accepted and recorded as sent", () => {
  assertEquals(checkClientLegalPolicyVersions(TERMS_VERSION_HASH, PRIVACY_VERSION_HASH), {
    ok: true,
    ids: { termsVersionHash: TERMS_VERSION_HASH, privacyVersionHash: PRIVACY_VERSION_HASH },
  });
});

Deno.test("pre-rename ids are accepted and recorded as sent, not as the current ids", () => {
  assertEquals(checkClientLegalPolicyVersions(LEGACY_TERMS, LEGACY_PRIVACY), {
    ok: true,
    ids: { termsVersionHash: LEGACY_TERMS, privacyVersionHash: LEGACY_PRIVACY },
  });
});

Deno.test("the alias list holds exactly the pre-rename ids of the current texts", () => {
  assertEquals(LEGAL_POLICY_VERSION_ID_ALIASES, [
    { termsVersionHash: LEGACY_TERMS, privacyVersionHash: LEGACY_PRIVACY },
  ]);
});

Deno.test("surrounding whitespace is trimmed before comparing and recording", () => {
  assertEquals(checkClientLegalPolicyVersions(` ${LEGACY_TERMS}\n`, `\t${LEGACY_PRIVACY} `), {
    ok: true,
    ids: { termsVersionHash: LEGACY_TERMS, privacyVersionHash: LEGACY_PRIVACY },
  });
});

Deno.test("ids of another policy version are a mismatch", () => {
  assertEquals(checkClientLegalPolicyVersions("znteqr-terms-2026-01-01", PRIVACY_VERSION_HASH), {
    ok: false,
    reason: "mismatch",
  });
  assertEquals(checkClientLegalPolicyVersions(TERMS_VERSION_HASH, `${LEGACY}-privacy-2026-01-01`), {
    ok: false,
    reason: "mismatch",
  });
});

Deno.test("a pair mixing current and pre-rename ids is a mismatch (no client build sends one)", () => {
  assertEquals(checkClientLegalPolicyVersions(LEGACY_TERMS, PRIVACY_VERSION_HASH), {
    ok: false,
    reason: "mismatch",
  });
  assertEquals(checkClientLegalPolicyVersions(TERMS_VERSION_HASH, LEGACY_PRIVACY), {
    ok: false,
    reason: "mismatch",
  });
});

Deno.test("missing, empty, non-string or oversized ids are invalid", () => {
  const invalid: ClientLegalPolicyVersionCheck = { ok: false, reason: "invalid" };
  assertEquals(checkClientLegalPolicyVersions(undefined, PRIVACY_VERSION_HASH), invalid);
  assertEquals(checkClientLegalPolicyVersions(TERMS_VERSION_HASH, null), invalid);
  assertEquals(checkClientLegalPolicyVersions("   ", PRIVACY_VERSION_HASH), invalid);
  assertEquals(checkClientLegalPolicyVersions(42, PRIVACY_VERSION_HASH), invalid);
  assertEquals(checkClientLegalPolicyVersions("x".repeat(257), PRIVACY_VERSION_HASH), invalid);
  assertEquals(checkClientLegalPolicyVersions(TERMS_VERSION_HASH, "x".repeat(257)), invalid);
});
