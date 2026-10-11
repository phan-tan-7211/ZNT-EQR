/**
 * Deno unit tests for Google Workspace OAuth callback pure validation helpers.
 */
import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import { __gwOauthValidationTestables } from "./gw-oauth-validation.ts";
import { __stateTestables } from "./gw-oauth-state.ts";
import { __gwOauthRedirectUriTestables } from "./gw-oauth-redirect-uri.ts";
import { __gwOauthGoogleApiTestables } from "./gw-oauth-google-api.ts";
import { __gwOauthSuccessRedirectTestables } from "./gw-oauth-success-redirect.ts";
import { __gwOauthUserErrorTestables } from "./gw-oauth-user-error.ts";

const {
  normalizeDomain,
  isValidEmail,
  isProductionEnvironment,
  isPreviewEnvironment,
  isValidRedirectUrl,
  isTrustedDomain,
  STATE_TTL_MS,
  MAX_CLOCK_SKEW_MS,
} = __gwOauthValidationTestables;

const { parseOAuthState, validateOAuthStateTimestamp } = __stateTestables;
const { buildOAuthRedirectUri, resolveOAuthRedirectBaseUrl } = __gwOauthRedirectUriTestables;
const { extractUserDomain } = __gwOauthGoogleApiTestables;
const { buildSuccessRedirectUrl, resolveFallbackProductionUrl, buildGoogleOAuthErrorRedirectUrl } = __gwOauthSuccessRedirectTestables;

function withEnv(updates: Record<string, string | undefined>, fn: () => void): void {
  const previous = new Map<string, string | undefined>();
  for (const key of Object.keys(updates)) {
    previous.set(key, Deno.env.get(key));
    const value = updates[key];
    if (value === undefined) {
      Deno.env.delete(key);
    } else {
      Deno.env.set(key, value);
    }
  }

  try {
    fn();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) {
        Deno.env.delete(key);
      } else {
        Deno.env.set(key, value);
      }
    }
  }
}

Deno.test("normalizeDomain lowercases and trims", () => {
  assertEquals(normalizeDomain("  Example.COM  "), "example.com");
});

Deno.test("isValidEmail accepts well-formed addresses and rejects malformed", () => {
  assertEquals(isValidEmail("user@example.com"), true);
  assertEquals(isValidEmail("@domain.com"), false);
  assertEquals(isValidEmail("user@"), false);
  assertEquals(isValidEmail(null), false);
});

Deno.test({
  name: "isValidRedirectUrl allows relative paths and rejects protocol-relative URLs",
  permissions: { env: ["PUBLIC_SITE_URL", "PRODUCTION_URL", "CLOUDFLARE_PAGES_PROJECT"] },
  fn: () => {
    withEnv({ PUBLIC_SITE_URL: "https://eqr.zinitek.com", PRODUCTION_URL: "https://eqr.zinitek.com" }, () => {
      assertEquals(isValidRedirectUrl("/dashboard", "https://eqr.zinitek.com"), true);
      assertEquals(isValidRedirectUrl("//evil.com/path", "https://eqr.zinitek.com"), false);
    });
  },
});

Deno.test({
  name: "isValidRedirectUrl allows Cloudflare Pages previews (*.eqr-zinitek.pages.dev) when PUBLIC_SITE_URL is production",
  permissions: { env: ["PUBLIC_SITE_URL", "PRODUCTION_URL", "CLOUDFLARE_PAGES_PROJECT"] },
  fn: () => {
    withEnv({ PUBLIC_SITE_URL: "https://eqr.zinitek.com", PRODUCTION_URL: "https://eqr.zinitek.com" }, () => {
      assertEquals(
        isValidRedirectUrl("https://preview.eqr-zinitek.pages.dev/dashboard/organization/integrations", "https://eqr.zinitek.com"),
        true,
      );
    });
  },
});

Deno.test({
  name: "buildSuccessRedirectUrl returns preview origin when shared prod edge uses production PUBLIC_SITE_URL",
  permissions: { env: ["PUBLIC_SITE_URL", "PRODUCTION_URL", "CLOUDFLARE_PAGES_PROJECT"] },
}, () => {
  withEnv({ PUBLIC_SITE_URL: "https://eqr.zinitek.com", PRODUCTION_URL: "https://eqr.zinitek.com" }, () => {
    const url = buildSuccessRedirectUrl({
      originUrl: "https://preview.eqr-zinitek.pages.dev",
      redirectUrl: "/dashboard/organization/integrations",
      resolvedProductionUrl: "https://eqr.zinitek.com",
    });
    assertEquals(
      url,
      "https://preview.eqr-zinitek.pages.dev/dashboard/organization/integrations?gw_connected=true",
    );
  });
});

Deno.test({
  name: "isValidRedirectUrl rejects loopback and broad Vercel hosts in deployed contexts",
  permissions: { env: ["PUBLIC_SITE_URL", "PRODUCTION_URL", "CLOUDFLARE_PAGES_PROJECT"] },
}, () => {
  withEnv({ PUBLIC_SITE_URL: "https://preview.eqr-zinitek.pages.dev", PRODUCTION_URL: "https://eqr.zinitek.com" }, () => {
    assertEquals(isValidRedirectUrl("http://localhost:8080/dashboard", "https://preview.eqr-zinitek.pages.dev"), false);
    assertEquals(isValidRedirectUrl("http://127.0.0.1:8080/dashboard", "https://preview.eqr-zinitek.pages.dev"), false);
    assertEquals(isValidRedirectUrl("https://equip-qr-evil.vercel.app/dashboard", "https://preview.eqr-zinitek.pages.dev"), false);
  });
});

Deno.test({
  name: "isValidRedirectUrl allows loopback only when public site URL is local",
  permissions: { env: ["PUBLIC_SITE_URL", "PRODUCTION_URL", "CLOUDFLARE_PAGES_PROJECT"] },
}, () => {
  withEnv({ PUBLIC_SITE_URL: "http://localhost:8080", PRODUCTION_URL: "https://eqr.zinitek.com" }, () => {
    assertEquals(isValidRedirectUrl("http://localhost:8080/dashboard", "https://eqr.zinitek.com"), true);
    assertEquals(isValidRedirectUrl("http://127.0.0.1:8080/dashboard", "https://eqr.zinitek.com"), true);
  });
});

Deno.test({
  name: "isTrustedDomain allows only the production frontend",
  permissions: { env: ["PUBLIC_SITE_URL", "PRODUCTION_URL", "CLOUDFLARE_PAGES_PROJECT"] },
}, () => {
  withEnv({ PUBLIC_SITE_URL: "https://eqr.zinitek.com", PRODUCTION_URL: "https://eqr.zinitek.com" }, () => {
    assertEquals(isTrustedDomain("https://eqr.zinitek.com/dashboard"), true);
    assertEquals(isTrustedDomain("https://preview.eqr.zinitek.com/dashboard"), false);
    assertEquals(isTrustedDomain("https://evil.example.com/"), false);
  });
});

Deno.test("parseOAuthState decodes base64 JSON state", () => {
  const state = {
    sessionToken: "sess-123",
    nonce: "nonce-456",
    timestamp: Date.now(),
  };
  const encoded = btoa(JSON.stringify(state));
  const parsed = parseOAuthState(encoded);
  assertEquals(parsed.sessionToken, "sess-123");
  assertEquals(parsed.nonce, "nonce-456");
});

Deno.test("parseOAuthState rejects missing sessionToken or nonce", () => {
  const encoded = btoa(JSON.stringify({ timestamp: Date.now() }));
  assertThrows(() => parseOAuthState(encoded), Error, "Missing state parameters");
});

Deno.test("validateOAuthStateTimestamp rejects expired state", () => {
  const expired = {
    sessionToken: "sess",
    nonce: "nonce",
    timestamp: Date.now() - STATE_TTL_MS - 1,
  };
  assertThrows(
    () => validateOAuthStateTimestamp(expired),
    Error,
    "OAuth state has expired",
  );
});

Deno.test("validateOAuthStateTimestamp rejects far-future timestamps", () => {
  const future = {
    sessionToken: "sess",
    nonce: "nonce",
    timestamp: Date.now() + MAX_CLOCK_SKEW_MS + 60_000,
  };
  assertThrows(
    () => validateOAuthStateTimestamp(future),
    Error,
    "invalid timestamp",
  );
});

Deno.test("buildOAuthRedirectUri appends callback path without trailing slash duplication", () => {
  assertEquals(
    buildOAuthRedirectUri("https://supabase.example.co/"),
    "https://supabase.example.co/functions/v1/google-workspace-oauth-callback",
  );
});

Deno.test("resolveOAuthRedirectBaseUrl normalizes retired preview Supabase hostname", () => {
  assertEquals(
    resolveOAuthRedirectBaseUrl(
      "https://wgynakhoppqkrutnslmv.supabase.co",
      "https://olsdirkvvfegvclbpgrg.supabase.co",
    ),
    "https://wgynakhoppqkrutnslmv.supabase.co",
  );
});

Deno.test("extractUserDomain uses hosted domain when present", () => {
  const result = extractUserDomain({
    email: "admin@acme.com",
    hd: "acme.com",
  });
  assertEquals(result.userEmail, "admin@acme.com");
  assertEquals(result.userDomain, "acme.com");
});

Deno.test("extractUserDomain blocks consumer gmail domains", () => {
  assertThrows(
    () => extractUserDomain({ email: "user@gmail.com" }),
    Error,
    "Consumer Google accounts",
  );
});

Deno.test({
  name: "buildSuccessRedirectUrl appends gw_connected query param",
  permissions: { env: ["PUBLIC_SITE_URL", "PRODUCTION_URL", "CLOUDFLARE_PAGES_PROJECT"] },
}, () => {
  withEnv({ PUBLIC_SITE_URL: "https://eqr.zinitek.com", PRODUCTION_URL: "https://eqr.zinitek.com" }, () => {
    const url = buildSuccessRedirectUrl({
      originUrl: null,
      redirectUrl: "/dashboard/onboarding/workspace",
      resolvedProductionUrl: "https://eqr.zinitek.com",
    });
    assertEquals(url, "https://eqr.zinitek.com/dashboard/onboarding/workspace?gw_connected=true");
  });
});

Deno.test({
  name: "buildGoogleOAuthErrorRedirectUrl honors integrations redirectUrl from OAuth session",
  permissions: { env: ["PUBLIC_SITE_URL", "PRODUCTION_URL", "CLOUDFLARE_PAGES_PROJECT"] },
}, () => {
  withEnv({ PUBLIC_SITE_URL: "https://preview.eqr-zinitek.pages.dev", PRODUCTION_URL: "https://eqr.zinitek.com" }, () => {
    const url = buildGoogleOAuthErrorRedirectUrl({
      originUrl: "https://preview.eqr-zinitek.pages.dev",
      redirectUrl: "/dashboard/organization/integrations",
      resolvedProductionUrl: "https://preview.eqr-zinitek.pages.dev",
      errorCode: "oauth_failed",
      supportRef: "corr-abc123",
    });
    assertEquals(
      url,
      "https://preview.eqr-zinitek.pages.dev/dashboard/organization/integrations?gw_error=oauth_failed&gw_ref=corr-abc123",
    );
  });
});

Deno.test({
  name: "resolveFallbackProductionUrl falls back when PRODUCTION_URL is untrusted",
  permissions: { env: ["PUBLIC_SITE_URL", "PRODUCTION_URL", "CLOUDFLARE_PAGES_PROJECT"] },
  fn: () => {
    const prev = Deno.env.get("PRODUCTION_URL");
    try {
      Deno.env.set("PRODUCTION_URL", "https://evil.example.com");
      assertEquals(resolveFallbackProductionUrl(), "https://eqr.zinitek.com");
    } finally {
      if (prev === undefined) {
        Deno.env.delete("PRODUCTION_URL");
      } else {
        Deno.env.set("PRODUCTION_URL", prev);
      }
    }
  },
});

Deno.test({
  name: "isProductionEnvironment and isPreviewEnvironment prefer PUBLIC_SITE_URL",
  permissions: { env: ["PUBLIC_SITE_URL", "PRODUCTION_URL", "CLOUDFLARE_PAGES_PROJECT"] },
  fn: () => {
    const prevPublic = Deno.env.get("PUBLIC_SITE_URL");
    const prevProduction = Deno.env.get("PRODUCTION_URL");
    try {
      Deno.env.set("PUBLIC_SITE_URL", "https://preview.eqr-zinitek.pages.dev");
      Deno.env.set("PRODUCTION_URL", "https://eqr.zinitek.com");
      assertEquals(isProductionEnvironment(), true);
      assertEquals(isPreviewEnvironment(), true);
    } finally {
      if (prevPublic === undefined) {
        Deno.env.delete("PUBLIC_SITE_URL");
      } else {
        Deno.env.set("PUBLIC_SITE_URL", prevPublic);
      }
      if (prevProduction === undefined) {
        Deno.env.delete("PRODUCTION_URL");
      } else {
        Deno.env.set("PRODUCTION_URL", prevProduction);
      }
    }
  },
});

Deno.test({
  name: "isProductionEnvironment and isPreviewEnvironment reflect PRODUCTION_URL fallback",
  permissions: { env: ["PUBLIC_SITE_URL", "PRODUCTION_URL", "CLOUDFLARE_PAGES_PROJECT"] },
  fn: () => {
    const prevPublic = Deno.env.get("PUBLIC_SITE_URL");
    const prev = Deno.env.get("PRODUCTION_URL");
    try {
      Deno.env.delete("PUBLIC_SITE_URL");
      Deno.env.set("PRODUCTION_URL", "https://eqr.zinitek.com");
      assertEquals(isProductionEnvironment(), true);
      assertEquals(isPreviewEnvironment(), false);

      Deno.env.set("PRODUCTION_URL", "https://preview.eqr-zinitek.pages.dev");
      assertEquals(isProductionEnvironment(), true);
      assertEquals(isPreviewEnvironment(), true);

      Deno.env.set("PRODUCTION_URL", "http://localhost:8080");
      assertEquals(isProductionEnvironment(), false);
    } finally {
      if (prevPublic === undefined) {
        Deno.env.delete("PUBLIC_SITE_URL");
      } else {
        Deno.env.set("PUBLIC_SITE_URL", prevPublic);
      }
      if (prev === undefined) {
        Deno.env.delete("PRODUCTION_URL");
      } else {
        Deno.env.set("PRODUCTION_URL", prev);
      }
    }
  },
});

Deno.test("resolveGoogleOAuthCallbackErrorCode maps Google callback errors", () => {
  const { resolveGoogleOAuthCallbackErrorCode } = __gwOauthUserErrorTestables;

  assertEquals(resolveGoogleOAuthCallbackErrorCode("access_denied"), "access_denied");
  assertEquals(resolveGoogleOAuthCallbackErrorCode("invalid_scope"), "misconfigured");
  assertEquals(resolveGoogleOAuthCallbackErrorCode("server_error"), "oauth_failed");
  assertEquals(resolveGoogleOAuthCallbackErrorCode(null), "oauth_failed");
});

Deno.test("resolveGoogleWorkspaceOAuthErrorCode maps internal messages to safe codes", () => {
  const { resolveGoogleWorkspaceOAuthErrorCode } = __gwOauthUserErrorTestables;

  assertEquals(
    resolveGoogleWorkspaceOAuthErrorCode(
      new Error("Invalid or expired OAuth session. Please try again."),
    ),
    "session_expired",
  );
  assertEquals(
    resolveGoogleWorkspaceOAuthErrorCode(
      new Error("Only Google Workspace administrators can connect their organization to ZNTEQR."),
    ),
    "not_workspace_admin",
  );
  assertEquals(
    resolveGoogleWorkspaceOAuthErrorCode(
      new Error("This Google Workspace domain is already linked to another ZNTEQR organization."),
    ),
    "domain_already_linked",
  );
  assertEquals(
    resolveGoogleWorkspaceOAuthErrorCode(new Error("unexpected internal failure")),
    "oauth_failed",
  );
});
