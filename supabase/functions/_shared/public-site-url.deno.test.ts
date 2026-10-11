import { assertEquals } from "jsr:@std/assert@1";
import { resolvePublicSiteUrl } from "./public-site-url.ts";

const PUBLIC_SITE_ENV = ["PUBLIC_SITE_URL", "PRODUCTION_URL"] as const;

Deno.test({
  name: "resolvePublicSiteUrl prefers PUBLIC_SITE_URL over PRODUCTION_URL",
  permissions: { env: [...PUBLIC_SITE_ENV] },
  fn: () => {
    const prevPublic = Deno.env.get("PUBLIC_SITE_URL");
    const prevProduction = Deno.env.get("PRODUCTION_URL");
    try {
      Deno.env.set("PUBLIC_SITE_URL", "https://preview.eqr-zinitek.pages.dev");
      Deno.env.set("PRODUCTION_URL", "https://eqr.zinitek.com");
      assertEquals(resolvePublicSiteUrl(), "https://preview.eqr-zinitek.pages.dev");
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
  name: "resolvePublicSiteUrl falls back to PRODUCTION_URL then default",
  permissions: { env: [...PUBLIC_SITE_ENV] },
  fn: () => {
    const prevPublic = Deno.env.get("PUBLIC_SITE_URL");
    const prevProduction = Deno.env.get("PRODUCTION_URL");
    try {
      Deno.env.delete("PUBLIC_SITE_URL");
      Deno.env.set("PRODUCTION_URL", "https://preview.eqr-zinitek.pages.dev");
      assertEquals(resolvePublicSiteUrl(), "https://preview.eqr-zinitek.pages.dev");

      Deno.env.delete("PRODUCTION_URL");
      assertEquals(resolvePublicSiteUrl(), "https://eqr.zinitek.com");
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
  name: "resolvePublicSiteUrl maps retired hosts (stale preview Supabase app, old Vercel preview) to the live app",
  permissions: { env: [...PUBLIC_SITE_ENV] },
  fn: () => {
    const prevPublic = Deno.env.get("PUBLIC_SITE_URL");
    const prevProduction = Deno.env.get("PRODUCTION_URL");
    try {
      Deno.env.set("PUBLIC_SITE_URL", "https://preview.supabase.app");
      Deno.env.set("PRODUCTION_URL", "https://eqr.zinitek.com");
      assertEquals(resolvePublicSiteUrl(), "https://eqr.zinitek.com");

      Deno.env.set("PUBLIC_SITE_URL", "https://equip-qr-preview-columbia-cloudworks-llc.vercel.app/");
      assertEquals(resolvePublicSiteUrl(), "https://eqr.zinitek.com");

      Deno.env.delete("PUBLIC_SITE_URL");
      Deno.env.set("PRODUCTION_URL", "https://preview.supabase.app");
      assertEquals(resolvePublicSiteUrl(), "https://eqr.zinitek.com");
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
