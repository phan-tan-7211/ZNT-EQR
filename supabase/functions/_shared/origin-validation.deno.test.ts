import { assertEquals } from "jsr:@std/assert@1";
import { isAllowedOrigin } from "./origin-validation.ts";

Deno.test("isAllowedOrigin accepts eqr.zinitek.com production origin", () => {
  assertEquals(isAllowedOrigin("https://eqr.zinitek.com"), true);
});

Deno.test("isAllowedOrigin accepts local preview port 4174", () => {
  assertEquals(isAllowedOrigin("http://localhost:4174"), true);
});

Deno.test("isAllowedOrigin accepts local dev origins on both localhost and 127.0.0.1", () => {
  for (const port of [8080, 5173, 4173, 4174, 3000]) {
    assertEquals(isAllowedOrigin(`http://localhost:${port}`), true, `localhost:${port}`);
    assertEquals(isAllowedOrigin(`http://127.0.0.1:${port}`), true, `127.0.0.1:${port}`);
  }
});

Deno.test("isAllowedOrigin rejects unlisted local ports and non-http loopback schemes", () => {
  assertEquals(isAllowedOrigin("http://127.0.0.1:9999"), false);
  assertEquals(isAllowedOrigin("http://localhost:9999"), false);
  assertEquals(isAllowedOrigin("https://127.0.0.1:8080"), false);
  assertEquals(isAllowedOrigin("http://127.0.0.1"), false);
});

Deno.test("isAllowedOrigin accepts Cloudflare Pages deployment and branch previews of this project", () => {
  assertEquals(isAllowedOrigin("https://61b375b1.eqr-zinitek.pages.dev"), true);
  assertEquals(isAllowedOrigin("https://claude-wonderful-wozniak-6qa.eqr-zinitek.pages.dev"), true);
});

Deno.test("isAllowedOrigin accepts the Cloudflare Pages project root", () => {
  assertEquals(isAllowedOrigin("https://eqr-zinitek.pages.dev"), true);
});

Deno.test("isAllowedOrigin rejects look-alikes of the Pages project root", () => {
  assertEquals(isAllowedOrigin("https://evil-eqr-zinitek.pages.dev"), false);
  assertEquals(isAllowedOrigin("https://eqr-zinitekevil.pages.dev"), false);
  assertEquals(isAllowedOrigin("https://eqr-zinitek.pages.dev.evil.com"), false);
  assertEquals(isAllowedOrigin("http://eqr-zinitek.pages.dev"), false);
  assertEquals(isAllowedOrigin("https://.eqr-zinitek.pages.dev"), false);
  assertEquals(isAllowedOrigin("https://eqr-zinitek.pages.dev/"), false);
  assertEquals(isAllowedOrigin("https://pages.dev"), false);
  assertEquals(isAllowedOrigin("https://other-project.pages.dev"), false);
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
    assertEquals(isAllowedOrigin("https://eqr-renamed.pages.dev"), true);
    assertEquals(isAllowedOrigin("https://evil-eqr-renamed.pages.dev"), false);
    assertEquals(isAllowedOrigin("https://abc123.eqr-zinitek.pages.dev"), false);
    assertEquals(isAllowedOrigin("https://eqr-zinitek.pages.dev"), false);
  } finally {
    if (prior === undefined) {
      Deno.env.delete(key);
    } else {
      Deno.env.set(key, prior);
    }
  }
});

Deno.test("isAllowedOrigin escapes regex metacharacters in CLOUDFLARE_PAGES_PROJECT", () => {
  const key = "CLOUDFLARE_PAGES_PROJECT";
  const prior = Deno.env.get(key);
  try {
    Deno.env.set(key, "eqr.renamed");
    assertEquals(isAllowedOrigin("https://eqr.renamed.pages.dev"), true);
    assertEquals(isAllowedOrigin("https://eqrxrenamed.pages.dev"), false);
    assertEquals(isAllowedOrigin("https://abc.eqrxrenamed.pages.dev"), false);
  } finally {
    if (prior === undefined) {
      Deno.env.delete(key);
    } else {
      Deno.env.set(key, prior);
    }
  }
});
