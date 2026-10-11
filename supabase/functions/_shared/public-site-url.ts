/**
 * Canonical public app origin for Edge Function redirects and invite links.
 *
 * Prefer PUBLIC_SITE_URL per environment. PRODUCTION_URL remains a legacy
 * fallback for existing deployed secrets until they are migrated.
 */

export const DEFAULT_PUBLIC_SITE_URL = "https://eqr.zinitek.com";

// Secrets that still hold a retired host resolve to the live app instead of
// sending users to a dead domain (the old Vercel previews are gone).
const RETIRED_PUBLIC_SITE_URLS: Record<string, string> = {
  "https://preview.supabase.app": DEFAULT_PUBLIC_SITE_URL,
  "https://equip-qr-preview-columbia-cloudworks-llc.vercel.app": DEFAULT_PUBLIC_SITE_URL,
};

export function resolvePublicSiteUrl(): string {
  const publicSiteUrl = Deno.env.get("PUBLIC_SITE_URL")?.trim();
  if (publicSiteUrl) {
    return RETIRED_PUBLIC_SITE_URLS[publicSiteUrl.replace(/\/+$/, "")] ?? publicSiteUrl;
  }

  const legacyProductionUrl = Deno.env.get("PRODUCTION_URL")?.trim();
  if (legacyProductionUrl) {
    return RETIRED_PUBLIC_SITE_URLS[legacyProductionUrl.replace(/\/+$/, "")] ?? legacyProductionUrl;
  }

  return DEFAULT_PUBLIC_SITE_URL;
}
