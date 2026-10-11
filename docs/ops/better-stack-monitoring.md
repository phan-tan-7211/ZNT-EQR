# Better Stack Monitoring & Status Page

> Operational reference for the ZNTEQR uptime monitors hosted by Better Stack. ZNTEQR does **not** publish a customer-facing status page (see [Status page](#status-page-not-published)).

## Overview

Better Stack provides two uptime monitors for ZNTEQR:

| Component | Purpose |
|---|---|
| **Web Availability Monitor** | Proves the production SPA at `https://eqr.zinitek.com/` responds with HTTP 200 |
| **Deep Health Monitor** | Proves the Supabase backend and database are reachable via the healthcheck edge function |
| **Status page** | Not published to customers. See [Status page](#status-page-not-published) |

## Monitors

### Web Availability

| Field | Value |
|---|---|
| Monitor name | `ZNTEQR Web` |
| Target URL | `https://eqr.zinitek.com/` |
| Check type | HTTP(S) keyword / status code |
| Expected status | 200 |
| Check interval | 3 minutes |
| Regions | US East, US West (or Better Stack default multi-region) |

### Deep Health (Backend + Database)

| Field | Value |
|---|---|
| Monitor name | `ZNTEQR API Health` |
| Target URL | `https://wgynakhoppqkrutnslmv.supabase.co/functions/v1/healthcheck` |
| Check type | HTTP(S) keyword |
| Expected status | 200 |
| Expected keyword | `"ok":true` |
| Check interval | 3 minutes |
| Regions | US East, US West (or Better Stack default multi-region) |

The healthcheck endpoint returns JSON with the following contract:

```json
{
  "ok": true,
  "service": "healthcheck",
  "environment": "production",
  "checked_at": "2026-04-04T12:00:00.000Z",
  "checks": {
    "db": {
      "ok": true,
      "latency_ms": 12
    }
  }
}
```

When the database check fails or times out, the endpoint returns HTTP 503 with `"ok": false` and an `error_code` field in `checks.db`.

## Status page (not published)

ZNTEQR has no customer-facing status page. The former custom domain `status.equipqr.app` is retired, and the app no longer links to a status page. `https://eqr.zinitek.com/support` is the public **Support** page (contact email and response time) — it is not a status page and must not be pointed at Better Stack.

If the Better Stack status page is still enabled, it is reachable only at its Better Stack subdomain and is for operators:

| Field | Value |
|---|---|
| Status page title | ZNTEQR Status |
| Better Stack subdomain | `equipqr.betteruptime.com` (legacy name) |
| Custom domain | None (`status.equipqr.app` retired) |
| Components shown | ZNTEQR Web, ZNTEQR API Health |
| History / uptime chart | Enabled (90-day history) |

### Publishing a custom domain (maintainer decision only)

Do not attach a hostname to the status page or link it from the app without maintainer approval. If one is approved:

1. In the Better Stack status page settings, enable the custom domain and note the **CNAME target** provided (historically `statuspage.betteruptime.com`).
2. At the DNS provider for `zinitek.com`, add a CNAME record for the approved subdomain pointing at that target.
3. Wait for DNS propagation, then verify the hostname loads the Better Stack status page.
4. Update this runbook, the Help Center article `docs/support/privacy-support/system-status.md`, and the app Support page in the same change.

## Alert Policy

| Setting | Value |
|---|---|
| Alert recipients | Managed in Better Stack (on-call team member email) |
| Escalation policy | Email immediately on incident confirmation |
| Incident confirmation | Confirmed after 2 consecutive failures |
| Recovery notification | Enabled |

## Healthcheck Edge Function Details

- **Source:** `supabase/functions/healthcheck/index.ts`
- **Database RPC:** `public.monitoring_healthcheck()` (migration `20260404120000`)
- **JWT required:** No (`verify_jwt = false` in `supabase/config.toml`)
- **Timeout:** 5 seconds (returns `503` with `error_code: "timeout"` if exceeded)
- **Methods:** `GET` only (returns `405` for other methods, `OPTIONS` for CORS preflight)

## Maintenance

- If the healthcheck endpoint changes its response contract, update the Better Stack keyword monitor to match.
- If the Supabase project is migrated to a new ref, update the deep health monitor URL.
- If a status-page custom domain is ever published, record the hostname and its DNS provider in the table above.

## Better Stack MCP smoke check

Use this after installing or re-authenticating the Better Stack Cursor plugin to confirm MCP connectivity and read access in under five minutes. **Read-only** (no monitor, dashboard, or incident mutations).

### Preconditions

- Better Stack MCP server is configured and authenticated.
- MCP server id: `plugin-better-stack-betterstack`.

### Standard 4-step validation

1. **Uptime monitors** — call `uptime_list_monitors_tool`. Pass: no auth/tool errors; expected monitors include **ZNTEQR Web** and **ZNTEQR API Health** (see tables above).
2. **Uptime incidents** — call `uptime_list_incidents_tool`. Pass: success; history or empty set with valid status fields.
3. **Telemetry inventory** — call `telemetry_list_sources_tool` or `telemetry_list_applications_tool`. Pass: success; at least one source/application when telemetry is configured.
4. **Error tracking visibility** — call `telemetry_list_error_states_tool`, or fall back to `telemetry_list_applications_tool` if error states are not enabled. Pass: success; structured rows or empty-but-valid result.

### Evidence capture template

Record timestamped results (e.g. in `tmp/` or your audit notes):

```text
Smoke Check Timestamp (UTC): <YYYY-MM-DD HH:MM:SS>
Server: plugin-better-stack-betterstack

1) uptime_list_monitors_tool -> PASS|FAIL
   Notes: <key monitor names / error details>

2) uptime_list_incidents_tool -> PASS|FAIL
   Notes: <incident summary or empty-valid result>

3) telemetry_list_sources_tool or telemetry_list_applications_tool -> PASS|FAIL
   Notes: <count or key entries>

4) telemetry_list_error_states_tool (or fallback) -> PASS|FAIL
   Notes: <state summary / fallback used>

Overall: PASS|FAIL
Next Action: <none | re-auth | verify team scope | investigate API permissions>
```

### Failure triage

- **Auth errors:** re-run `mcp_auth` for server `plugin-better-stack-betterstack`.
- **Empty results with expected data:** check Better Stack team/workspace scope and filters.
- **Tool not found:** confirm plugin version and that server tool descriptors are loaded.
- **Intermittent failures:** retry once, log the exact error, then stop (avoid blind retry loops).
