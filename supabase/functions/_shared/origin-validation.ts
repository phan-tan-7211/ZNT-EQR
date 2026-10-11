/**
 * Origin Validation Utility
 *
 * Validates the Origin header from incoming requests against a known allowlist
 * of trusted origins. Used by Stripe-related Edge Functions (create-checkout,
 * customer-portal, purchase-user-licenses) to build safe redirect URLs, and
 * by getCorsHeaders() for CORS responses.
 *
 * Prevents an attacker from supplying a malicious Origin header that would
 * cause Stripe to redirect the user to a phishing site after checkout.
 */

/**
 * Local dev server ports: Vite dev (8080), Vite default dev (5173), local
 * `vite preview` servers (4173, 4174) and a generic local server (3000). Each
 * is trusted on both `localhost` and `127.0.0.1`, since the browser sends
 * whichever host the developer or Playwright opened.
 */
const LOCAL_DEV_PORTS = [8080, 5173, 4173, 4174, 3000];

/**
 * Static allowlist of trusted origins.
 *
 * The production custom domain is listed explicitly.
 * Local dev servers are included for development convenience.
 */
const ALLOWED_ORIGINS = [
  "https://eqr.zinitek.com",
  ...LOCAL_DEV_PORTS.flatMap((port) => [
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`,
  ]),
];

/**
 * Matches Cloudflare Pages deployments of this project only:
 *   - https://<project>.pages.dev                     (project root / production branch)
 *   - https://<deployment-hash>.<project>.pages.dev   (per-commit / per-PR)
 *   - https://<branch-alias>.<project>.pages.dev      (per-branch alias)
 *
 * Only the Cloudflare account that owns the Pages project can publish under
 * `<project>.pages.dev`, so this does not trust arbitrary third-party sites.
 * The former Vercel team preview pattern was
 * removed: that team no longer belongs to this product, so trusting it let
 * anyone in it host an origin these functions would accept.
 *
 * CLOUDFLARE_PAGES_PROJECT lets operators override the project name without
 * a code change (e.g. if the Pages project is renamed).
 */
function getPagesPreviewPattern(): RegExp {
  const project = (Deno.env.get("CLOUDFLARE_PAGES_PROJECT")?.trim() || "eqr-zinitek")
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^https://(?:[a-z0-9-]+\\.)?${project}\\.pages\\.dev$`);
}

/**
 * Returns true when `origin` is in the static allowlist **or** is a preview
 * deployment of this Cloudflare Pages project.
 */
export function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.includes(origin)) {
    return true;
  }
  return getPagesPreviewPattern().test(origin);
}

/** The default production origin used as a safe fallback. */
export const PRODUCTION_ORIGIN = "https://eqr.zinitek.com";
