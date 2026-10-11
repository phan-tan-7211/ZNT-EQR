import { assertEquals } from "jsr:@std/assert@1";
import { isAllowedOrigin } from "./origin-validation.ts";

Deno.test("isAllowedOrigin accepts eqr.zinitek.com production origin", () => {
  assertEquals(isAllowedOrigin("https://eqr.zinitek.com"), true);
});

Deno.test("isAllowedOrigin accepts local preview port 4174", () => {
  assertEquals(isAllowedOrigin("http://localhost:4174"), true);
});

Deno.test("isAllowedOrigin accepts Cloudflare Pages deployment and branch previews of this project", () => {
  assertEquals(isAllowedOrigin("https://61b375b1.eqr-zinitek.pages.dev"), true);
  assertEquals(isAllowedOrigin("https://claude-wonderful-wozniak-6qa.eqr-zinitek.pages.dev"), true);
});

Deno.test("isAllowedOrigin rejects other Pages projects and look-alike hosts", () => {
  assertEquals(isAllowedOrigin("https://abc123.evil.pages.dev"), false);
  assertEquals(isAllowedOrigin("https://abc123.eqr-zinitek.pages.dev.evil.com"), false);
  assertEquals(isAllowedOrigin("https://eqr-zinitek.pages.dev.evil.com"), false);
  assertEquals(isAllowedOrigin("http://abc123.eqr-zinitek.pages.dev"), false);
  assertEquals(isAllowedOrigin("https://a.b.eqr-zinitek.pages.dev"), false);
});

Deno.test("isAllowedOrigin no longer trusts the retired Vercel team previews", () => {
  assertEquals(isAllowedOrigin("https://equipqr-abc123-columbia-cloudworks-llc.vercel.app"), false);
  assertEquals(isAllowedOrigin("https://equip-qr-preview-columbia-cloudworks-llc.vercel.app"), false);
});

Deno.test("isAllowedOrigin honours a trimmed CLOUDFLARE_PAGES_PROJECT override", () => {
  const key = "CLOUDFLARE_PAGES_PROJECT";
  const prior = Deno.env.get(key);
  try {
    Deno.env.set(key, "  eqr-renamed  ");
    assertEquals(isAllowedOrigin("https://abc123.eqr-renamed.pages.dev"), true);
    assertEquals(isAllowedOrigin("https://abc123.eqr-zinitek.pages.dev"), false);
  } finally {
    if (prior === undefined) {
      Deno.env.delete(key);
    } else {
      Deno.env.set(key, prior);
    }
  }
});
