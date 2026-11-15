import { assertEquals } from "jsr:@std/assert@1";
import {
  isCaptchaEnforced,
  isLocalSupabaseUrl,
  projectRefFromSupabaseUrl,
  resolveCaptchaMode,
  verifyCaptchaToken,
} from "./hcaptcha-gate.ts";

const LOCAL = { supabaseUrl: "http://kong:8000" };
const HOSTED_REF = "abcdefghijklmnop";
const HOSTED = { supabaseUrl: `https://${HOSTED_REF}.supabase.co` };

function fakeFetch(body: unknown, calls: string[] = []): typeof fetch {
  return ((input: Request | URL | string) => {
    calls.push(String(input));
    return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
  }) as typeof fetch;
}

Deno.test("captcha is skipped when the secret is missing on the local stack (local E2E)", () => {
  assertEquals(isCaptchaEnforced(null, LOCAL), false);
  assertEquals(isCaptchaEnforced("", LOCAL), false);
  assertEquals(isCaptchaEnforced("   ", LOCAL), false);
  assertEquals(isCaptchaEnforced(null, { supabaseUrl: "http://127.0.0.1:54321" }), false);
  assertEquals(resolveCaptchaMode(null, LOCAL), "skip-local");
});

Deno.test("captcha is required when a secret exists (any environment)", () => {
  assertEquals(isCaptchaEnforced("secret-from-env", LOCAL), true);
  assertEquals(isCaptchaEnforced("secret-from-env", HOSTED), true);
  assertEquals(resolveCaptchaMode("secret-from-env", HOSTED), "verify");
});

Deno.test("captcha stays required on hosted projects when the secret is missing (fail-closed)", () => {
  assertEquals(isCaptchaEnforced(null, HOSTED), true);
  assertEquals(isCaptchaEnforced("  ", HOSTED), true);
  assertEquals(resolveCaptchaMode(null, HOSTED), "reject-misconfigured");
});

Deno.test("captcha stays required when the runtime URL is unknown or invalid", () => {
  assertEquals(isCaptchaEnforced(null, {}), true);
  assertEquals(isCaptchaEnforced(null, { supabaseUrl: "not a url" }), true);
});

Deno.test("a plain-http public host is not treated as the local stack", () => {
  assertEquals(isLocalSupabaseUrl(`http://${HOSTED_REF}.supabase.co`), false);
  assertEquals(isLocalSupabaseUrl("http://api.example.com"), false);
  assertEquals(isCaptchaEnforced(null, { supabaseUrl: "http://api.example.com" }), true);
});

Deno.test("the opt-out only works when it names this project's own ref", () => {
  assertEquals(resolveCaptchaMode(null, { ...HOSTED, allowMissingSecret: HOSTED_REF }), "skip-opt-out");
  assertEquals(resolveCaptchaMode(null, { ...HOSTED, allowMissingSecret: ` ${HOSTED_REF.toUpperCase()} ` }), "skip-opt-out");
  assertEquals(isCaptchaEnforced(null, { ...HOSTED, allowMissingSecret: HOSTED_REF }), false);
});

Deno.test("a generic or foreign opt-out value does not disable captcha", () => {
  for (const value of ["true", "1", "yes", "false", "", "someotherprojectref"]) {
    assertEquals(resolveCaptchaMode(null, { ...HOSTED, allowMissingSecret: value }), "reject-misconfigured");
  }
  // A flag copied from a throwaway branch has no effect on another project.
  assertEquals(
    resolveCaptchaMode(null, { supabaseUrl: "https://productionref.supabase.co", allowMissingSecret: HOSTED_REF }),
    "reject-misconfigured",
  );
});

Deno.test("a present secret always wins over the opt-out", () => {
  assertEquals(resolveCaptchaMode("secret", { ...HOSTED, allowMissingSecret: HOSTED_REF }), "verify");
});

Deno.test("isLocalSupabaseUrl only matches the local stack", () => {
  assertEquals(isLocalSupabaseUrl("http://localhost:54321"), true);
  assertEquals(isLocalSupabaseUrl("http://kong:8000"), true);
  assertEquals(isLocalSupabaseUrl("http://supabase_kong_znt-eqr:8000"), true);
  assertEquals(isLocalSupabaseUrl(HOSTED.supabaseUrl), false);
  assertEquals(isLocalSupabaseUrl("https://localhost.evil.example"), false);
  assertEquals(isLocalSupabaseUrl(undefined), false);
});

Deno.test("projectRefFromSupabaseUrl reads the first host label of hosted projects only", () => {
  assertEquals(projectRefFromSupabaseUrl(HOSTED.supabaseUrl), HOSTED_REF);
  assertEquals(projectRefFromSupabaseUrl("http://kong:8000"), null);
  assertEquals(projectRefFromSupabaseUrl("https://singlelabel"), null);
  assertEquals(projectRefFromSupabaseUrl(null), null);
});

Deno.test("verifyCaptchaToken rejects without calling hCaptcha when a hosted project has no secret", async () => {
  const calls: string[] = [];
  const ok = await verifyCaptchaToken(null, "token", {
    logTag: "TEST",
    runtime: HOSTED,
    fetchImpl: fakeFetch({ success: true }, calls),
  });
  assertEquals(ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("verifyCaptchaToken passes on the local stack and on a bound opt-out without calling hCaptcha", async () => {
  const calls: string[] = [];
  const fetchImpl = fakeFetch({ success: false }, calls);
  assertEquals(await verifyCaptchaToken(null, undefined, { logTag: "TEST", runtime: LOCAL, fetchImpl }), true);
  assertEquals(
    await verifyCaptchaToken(null, undefined, {
      logTag: "TEST",
      runtime: { ...HOSTED, allowMissingSecret: HOSTED_REF },
      fetchImpl,
    }),
    true,
  );
  assertEquals(calls.length, 0);
});

Deno.test("verifyCaptchaToken requires a token and trusts only success === true", async () => {
  const calls: string[] = [];
  const base = { logTag: "TEST", runtime: HOSTED };
  assertEquals(await verifyCaptchaToken("secret", undefined, { ...base, fetchImpl: fakeFetch({ success: true }, calls) }), false);
  assertEquals(await verifyCaptchaToken("secret", "", { ...base, fetchImpl: fakeFetch({ success: true }, calls) }), false);
  assertEquals(calls.length, 0);

  assertEquals(await verifyCaptchaToken("secret", "token", { ...base, fetchImpl: fakeFetch({ success: true }, calls) }), true);
  assertEquals(calls, ["https://hcaptcha.com/siteverify"]);
  assertEquals(await verifyCaptchaToken("secret", "token", { ...base, fetchImpl: fakeFetch({ success: false }) }), false);
  assertEquals(await verifyCaptchaToken("secret", "token", { ...base, fetchImpl: fakeFetch({ success: "true" }) }), false);
  assertEquals(await verifyCaptchaToken("secret", "token", { ...base, fetchImpl: fakeFetch(null) }), false);
});

Deno.test("verifyCaptchaToken fails closed when hCaptcha cannot be reached", async () => {
  const failing = (() => Promise.reject(new Error("network down"))) as typeof fetch;
  assertEquals(await verifyCaptchaToken("secret", "token", { logTag: "TEST", runtime: HOSTED, fetchImpl: failing }), false);
});
