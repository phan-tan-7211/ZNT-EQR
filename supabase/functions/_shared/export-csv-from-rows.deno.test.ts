import { assertEquals } from "jsr:@std/assert@1";
import { buildEquipmentCsvFromRows, buildEquipmentUrl } from "./export-csv-from-rows.ts";

const PUBLIC_SITE_ENV = ["PUBLIC_SITE_URL", "PRODUCTION_URL"] as const;

function withSiteEnv(
  values: Partial<Record<(typeof PUBLIC_SITE_ENV)[number], string>>,
  fn: () => void,
): void {
  const prior = PUBLIC_SITE_ENV.map((key) => [key, Deno.env.get(key)] as const);
  try {
    for (const key of PUBLIC_SITE_ENV) {
      const value = values[key];
      if (value === undefined) {
        Deno.env.delete(key);
      } else {
        Deno.env.set(key, value);
      }
    }
    fn();
  } finally {
    for (const [key, value] of prior) {
      if (value === undefined) {
        Deno.env.delete(key);
      } else {
        Deno.env.set(key, value);
      }
    }
  }
}

Deno.test({
  name: "buildEquipmentUrl uses an explicit siteUrl and strips trailing slashes",
  permissions: { env: [...PUBLIC_SITE_ENV] },
  fn: () => {
    withSiteEnv({ PUBLIC_SITE_URL: "https://eqr.zinitek.com" }, () => {
      assertEquals(
        buildEquipmentUrl("abc-123", "https://preview.eqr-zinitek.pages.dev"),
        "https://preview.eqr-zinitek.pages.dev/dashboard/equipment/abc-123",
      );
      assertEquals(
        buildEquipmentUrl("abc-123", "https://preview.eqr-zinitek.pages.dev///"),
        "https://preview.eqr-zinitek.pages.dev/dashboard/equipment/abc-123",
      );
    });
  },
});

Deno.test({
  name: "buildEquipmentUrl falls back to the shared public site resolver",
  permissions: { env: [...PUBLIC_SITE_ENV] },
  fn: () => {
    withSiteEnv({}, () => {
      assertEquals(
        buildEquipmentUrl("abc-123"),
        "https://eqr.zinitek.com/dashboard/equipment/abc-123",
      );
    });

    withSiteEnv({ PUBLIC_SITE_URL: "https://preview.eqr-zinitek.pages.dev/" }, () => {
      assertEquals(
        buildEquipmentUrl("abc-123"),
        "https://preview.eqr-zinitek.pages.dev/dashboard/equipment/abc-123",
      );
    });

    withSiteEnv({ PRODUCTION_URL: "https://eqr.zinitek.com/" }, () => {
      assertEquals(
        buildEquipmentUrl("abc-123"),
        "https://eqr.zinitek.com/dashboard/equipment/abc-123",
      );
    });

    // A secret still holding a retired host resolves to the live app.
    withSiteEnv(
      { PUBLIC_SITE_URL: "https://equip-qr-preview-columbia-cloudworks-llc.vercel.app" },
      () => {
        assertEquals(
          buildEquipmentUrl("abc-123"),
          "https://eqr.zinitek.com/dashboard/equipment/abc-123",
        );
      },
    );
  },
});

Deno.test({
  name: "buildEquipmentCsvFromRows URL column links to the live app, not a retired host",
  permissions: { env: [...PUBLIC_SITE_ENV] },
  fn: () => {
    withSiteEnv({}, () => {
      const { csvContent } = buildEquipmentCsvFromRows(
        [{ id: "e1", name: "Pump A" }],
        ["name", "url"],
      );
      assertEquals(
        csvContent,
        "Name,URL\nPump A,https://eqr.zinitek.com/dashboard/equipment/e1",
      );
      assertEquals(csvContent.includes("equipqr"), false);
    });
  },
});
