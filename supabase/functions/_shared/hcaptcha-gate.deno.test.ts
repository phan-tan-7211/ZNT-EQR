import { assertEquals } from "jsr:@std/assert@1";
import { isCaptchaEnforced, isLocalSupabaseUrl } from "./hcaptcha-gate.ts";

const LOCAL = { supabaseUrl: "http://kong:8000" };
const HOSTED = { supabaseUrl: "https://abcdefghijklmnop.supabase.co" };

Deno.test("captcha is skipped when the secret is missing on the local stack (local E2E)", () => {
  assertEquals(isCaptchaEnforced(null, LOCAL), false);
  assertEquals(isCaptchaEnforced("", LOCAL), false);
  assertEquals(isCaptchaEnforced("   ", LOCAL), false);
  assertEquals(isCaptchaEnforced(null, { supabaseUrl: "http://127.0.0.1:54321" }), false);
});

Deno.test("captcha is required when a secret exists (any environment)", () => {
  assertEquals(isCaptchaEnforced("secret-from-env", LOCAL), true);
  assertEquals(isCaptchaEnforced("secret-from-env", HOSTED), true);
});

Deno.test("captcha stays required on hosted projects when the secret is missing (fail-closed)", () => {
  assertEquals(isCaptchaEnforced(null, HOSTED), true);
  assertEquals(isCaptchaEnforced("  ", HOSTED), true);
  assertEquals(isCaptchaEnforced(null, { ...HOSTED, allowMissingSecret: "false" }), true);
});

Deno.test("captcha stays required when the runtime URL is unknown or invalid", () => {
  assertEquals(isCaptchaEnforced(null, {}), true);
  assertEquals(isCaptchaEnforced(null, { supabaseUrl: "not a url" }), true);
});

Deno.test("hosted branches can opt out only with the explicit flag", () => {
  assertEquals(isCaptchaEnforced(null, { ...HOSTED, allowMissingSecret: "true" }), false);
  assertEquals(isCaptchaEnforced(null, { ...HOSTED, allowMissingSecret: " TRUE " }), false);
});

Deno.test("isLocalSupabaseUrl only matches the local stack", () => {
  assertEquals(isLocalSupabaseUrl("http://localhost:54321"), true);
  assertEquals(isLocalSupabaseUrl("http://kong:8000"), true);
  assertEquals(isLocalSupabaseUrl("https://abcdefghijklmnop.supabase.co"), false);
  assertEquals(isLocalSupabaseUrl("https://localhost.evil.example"), false);
  assertEquals(isLocalSupabaseUrl(undefined), false);
});
