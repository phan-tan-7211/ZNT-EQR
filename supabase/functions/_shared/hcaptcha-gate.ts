/**
 * Fail-closed captcha gate for public endpoints.
 *
 * - HCAPTCHA_SECRET_KEY present: captcha is required and verified.
 * - Secret missing on a hosted Supabase project (preview/prod): captcha is
 *   still required, so submissions are rejected until the secret is set.
 *   A missing secret must never silently open a public endpoint.
 * - Secret missing on the local stack (SUPABASE_URL is http:// or a local
 *   host such as kong/localhost): captcha is skipped so E2E can run; callers
 *   must still enforce throttle / idempotency.
 *
 * Non-production hosted branches that intentionally run without hCaptcha can
 * opt out explicitly with HCAPTCHA_ALLOW_MISSING_SECRET=true. Never set that
 * on production.
 */

export interface CaptchaRuntime {
  /** Value of SUPABASE_URL as seen by the edge runtime. */
  supabaseUrl?: string | null;
  /** Value of HCAPTCHA_ALLOW_MISSING_SECRET. */
  allowMissingSecret?: string | null;
}

const LOCAL_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "[::1]",
  "kong",
  "host.docker.internal",
]);

/** True only when the URL clearly points at the local Supabase stack. */
export function isLocalSupabaseUrl(supabaseUrl: string | null | undefined): boolean {
  if (!supabaseUrl) return false;
  try {
    const url = new URL(supabaseUrl.trim());
    return url.protocol === "http:" || LOCAL_HOSTNAMES.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function readRuntime(): CaptchaRuntime {
  return {
    supabaseUrl: Deno.env.get("SUPABASE_URL"),
    allowMissingSecret: Deno.env.get("HCAPTCHA_ALLOW_MISSING_SECRET"),
  };
}

/**
 * Whether a captcha token must be presented. When this returns true and the
 * secret is missing, callers must reject the request (misconfiguration).
 */
export function isCaptchaEnforced(
  secretKey: string | null | undefined,
  runtime: CaptchaRuntime = readRuntime(),
): boolean {
  if (secretKey && secretKey.trim().length > 0) return true;
  if (isLocalSupabaseUrl(runtime.supabaseUrl)) return false;
  return runtime.allowMissingSecret?.trim().toLowerCase() !== "true";
}
