import { assertEquals } from "jsr:@std/assert@1";
import { timingSafeEqualStrings } from "./timing-safe-equal.ts";

Deno.test("timingSafeEqualStrings matches identical strings", async () => {
  assertEquals(await timingSafeEqualStrings("service-role-key", "service-role-key"), true);
  assertEquals(await timingSafeEqualStrings("", ""), true);
});

Deno.test("timingSafeEqualStrings rejects different strings", async () => {
  assertEquals(await timingSafeEqualStrings("service-role-key", "service-role-kez"), false);
  assertEquals(await timingSafeEqualStrings("service-role-key", "service-role-key "), false);
  assertEquals(await timingSafeEqualStrings("short", "a-much-longer-value"), false);
  assertEquals(await timingSafeEqualStrings("", "x"), false);
});

Deno.test("timingSafeEqualStrings does not conflate ill-formed UTF-16 strings", async () => {
  // TextEncoder would map both lone surrogates to U+FFFD and report a match.
  assertEquals(await timingSafeEqualStrings("\uD800", "\uD801"), false);
  assertEquals(await timingSafeEqualStrings("a�", "a\uD800"), false);
  assertEquals(await timingSafeEqualStrings("a\uD800", "a\uD800"), true);
});
