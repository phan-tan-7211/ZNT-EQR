/**
 * Fail-closed captcha gate shared by every public endpoint that takes a
 * hCaptcha token (quick-form, operator-check-in, submit-privacy-request).
 *
 * - HCAPTCHA_SECRET_KEY present: captcha is required and verified.
 * - Secret missing on a hosted Supabase project (preview/prod): captcha is
 *   still required, so submissions are rejected until the secret is set.
 *   A missing secret must never silently open a public endpoint.
 * - Secret missing on the local CLI stack (SUPABASE_URL host is one of the
 *   local names below, e.g. http://kong:8000): captcha is skipped so local
 *   E2E can run; callers must still enforce throttle / idempotency.
 *
 * A throwaway hosted branch that intentionally runs without hCaptcha can opt
 * out by setting HCAPTCHA_ALLOW_MISSING_SECRET to ITS OWN project ref (the
 * first label of its SUPABASE_URL host). Binding the value to the ref means a
 * flag copied to another project, production included, has no effect.
 *
 * Limitation: a self-hosted Supabase stack gives functions the same internal
 * URL as the CLI stack (http://kong:8000) and is therefore treated as local.
 * This project only deploys to Supabase-hosted projects.
 */

export interface CaptchaRuntime {
  /** Value of SUPABASE_URL as seen by the edge runtime. */
  supabaseUrl?: string | null;
  /** Value of HCAPTCHA_ALLOW_MISSING_SECRET. */
  allowMissingSecret?: string | null;
}

/**
 * - `verify`: a secret exists; a token must be presented and verified.
 * - `skip-local`: no secret on the local stack; captcha is skipped.
 * - `skip-opt-out`: no secret on a hosted branch that opted out by ref.
 * - `reject-misconfigured`: no secret on a hosted project; reject everything.
 */
export type CaptchaMode = "verify" | "skip-local" | "skip-opt-out" | "reject-misconfigured";

const LOCAL_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "[::1]",
  "kong",
  "api.supabase.internal",
  "host.docker.internal",
]);

const HCAPTCHA_SITEVERIFY_URL = "https://hcaptcha.com/siteverify";

function parseHostname(supabaseUrl: string | null | undefined): string | null {
  if (!supabaseUrl) return null;
  try {
    return new URL(supabaseUrl.trim()).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isLocalHostname(hostname: string): boolean {
  // `supabase_kong_<project>` is the CLI's docker container name for the local gateway.
  return LOCAL_HOSTNAMES.has(hostname) || hostname.startsWith("supabase_kong_");
}

/** True only when the URL host is one of the local Supabase stack names. */
export function isLocalSupabaseUrl(supabaseUrl: string | null | undefined): boolean {
  const hostname = parseHostname(supabaseUrl);
  return hostname !== null && isLocalHostname(hostname);
}

/** Project ref of a hosted project (`<ref>.supabase.co`), or null when unknown. */
export function projectRefFromSupabaseUrl(supabaseUrl: string | null | undefined): string | null {
  const hostname = parseHostname(supabaseUrl);
  if (hostname === null || isLocalHostname(hostname)) return null;
  const [ref, ...rest] = hostname.split(".");
  return ref && rest.length > 0 ? ref : null;
}

function readRuntime(): CaptchaRuntime {
  return {
    supabaseUrl: Deno.env.get("SUPABASE_URL"),
    allowMissingSecret: Deno.env.get("HCAPTCHA_ALLOW_MISSING_SECRET"),
  };
}

export function resolveCaptchaMode(
  secretKey: string | null | undefined,
  runtime: CaptchaRuntime = readRuntime(),
): CaptchaMode {
  if (secretKey && secretKey.trim().length > 0) return "verify";
  if (isLocalSupabaseUrl(runtime.supabaseUrl)) return "skip-local";

  const projectRef = projectRefFromSupabaseUrl(runtime.supabaseUrl);
  const optOut = runtime.allowMissingSecret?.trim().toLowerCase();
  if (projectRef && optOut && optOut === projectRef) return "skip-opt-out";

  return "reject-misconfigured";
}

/**
 * Whether a captcha token must be presented. When this returns true and the
 * secret is missing, `verifyCaptchaToken` rejects the request.
 */
export function isCaptchaEnforced(
  secretKey: string | null | undefined,
  runtime: CaptchaRuntime = readRuntime(),
): boolean {
  const mode = resolveCaptchaMode(secretKey, runtime);
  return mode === "verify" || mode === "reject-misconfigured";
}

export interface VerifyCaptchaOptions {
  /** Short tag for operator logs, e.g. "QUICK-FORM". */
  logTag: string;
  runtime?: CaptchaRuntime;
  /** Injectable for tests. */
  fetchImpl?: typeof fetch;
}

const skipWarned = new Set<string>();

function warnSkipOnce(logTag: string, mode: "skip-local" | "skip-opt-out"): void {
  const key = `${logTag}:${mode}`;
  if (skipWarned.has(key)) return;
  skipWarned.add(key);
  const why = mode === "skip-local"
    ? "local stack without HCAPTCHA_SECRET_KEY"
    : "HCAPTCHA_ALLOW_MISSING_SECRET matches this project ref";
  console.warn(`[${logTag}] hCaptcha verification is SKIPPED (${why})`);
}

/**
 * Single place that decides whether a submission passes the captcha gate.
 * Returns true only when the token verified with hCaptcha, or when captcha is
 * deliberately skipped (local stack / bound opt-out). Never throws.
 */
export async function verifyCaptchaToken(
  secretKey: string | null | undefined,
  token: string | null | undefined,
  options: VerifyCaptchaOptions,
): Promise<boolean> {
  const { logTag, fetchImpl = fetch } = options;
  const mode = resolveCaptchaMode(secretKey, options.runtime ?? readRuntime());

  if (mode === "skip-local" || mode === "skip-opt-out") {
    warnSkipOnce(logTag, mode);
    return true;
  }
  if (mode === "reject-misconfigured" || !secretKey) {
    console.error(`[${logTag}] HCAPTCHA_SECRET_KEY is not configured; rejecting submission (fail-closed)`);
    return false;
  }
  if (!token || typeof token !== "string") return false;

  const form = new FormData();
  form.append("secret", secretKey);
  form.append("response", token);

  try {
    const res = await fetchImpl(HCAPTCHA_SITEVERIFY_URL, { method: "POST", body: form });
    const result = await res.json();
    return result?.success === true;
  } catch {
    console.error(`[${logTag}] hCaptcha verification failed`);
    return false;
  }
}
