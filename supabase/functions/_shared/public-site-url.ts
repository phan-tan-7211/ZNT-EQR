/**
 * Canonical public app origin for Edge Function redirects and invite links.
 *
 * Prefer PUBLIC_SITE_URL per environment. PRODUCTION_URL remains a legacy
 * fallback for existing deployed secrets until they are migrated.
 */

export const DEFAULT_PUBLIC_SITE_URL = "https://eqr.zinitek.com";

// Secrets that still hold a retired host resolve to the live app instead of
// sending users to a dead domain.
const RETIRED_PUBLIC_SITE_URLS: Record<string, string> = {
  "https://preview.supabase.app": DEFAULT_PUBLIC_SITE_URL,
};

// The app is no longer hosted on Vercel (it is served by Cloudflare Pages), and
// the Vercel team it used to deploy from belongs to the product's previous
// publisher. A secret that still points at any *.vercel.app host must never
// receive invite links or be trusted as a redirect target.
const RETIRED_HOST_SUFFIXES = [".vercel.app"];

function hasRetiredHost(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return RETIRED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
  } catch {
    return false;
  }
}

function resolveConfiguredUrl(url: string): string {
  const mapped = RETIRED_PUBLIC_SITE_URLS[url.replace(/\/+$/, "")];
  if (mapped) return mapped;
  return hasRetiredHost(url) ? DEFAULT_PUBLIC_SITE_URL : url;
}

export function resolvePublicSiteUrl(): string {
  const publicSiteUrl = Deno.env.get("PUBLIC_SITE_URL")?.trim();
  if (publicSiteUrl) {
    return resolveConfiguredUrl(publicSiteUrl);
  }

  const legacyProductionUrl = Deno.env.get("PRODUCTION_URL")?.trim();
  if (legacyProductionUrl) {
    return resolveConfiguredUrl(legacyProductionUrl);
  }

  return DEFAULT_PUBLIC_SITE_URL;
}
