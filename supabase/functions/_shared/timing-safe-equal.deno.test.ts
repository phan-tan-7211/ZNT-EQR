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
