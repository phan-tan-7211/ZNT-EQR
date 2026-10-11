# Agent secrets and access (ZNTEQR)

Operational reference for Cursor agents and headless automation. ZNT LLC / ZNTEQR.

---

## Vault and tokens

**Primary vault:** `ZNTEQR Agents` (`tgo2m6qbct5otqeqirjocn3joa`)

**ZNT Agents vault:** `mrviyowmjwrxv7syobdlhnmawa` — maintainer Google sign-in for admin.google.com and console.cloud.google.com. Readable with the same `OP_SERVICE_ACCOUNT_TOKEN` as ZNTEQR Agents.

| Item | Item ID | Purpose |
|---|---|---|
| `Google (Business)` | `ukvy6bzwb2ikq5cfeambgcq5u4` | Workspace admin + GCP Console browser sign-in (`username`, `password`) |
| `Google (Test User)` | `hlp7llqbvfm7mmic2z2e43ftem` | Alternate test-user record (Playwright E2E still uses ZNTEQR Agents `google-login`) |
| `wordpress-mcp` | `ywccaftp6lat6kuq2fomu7byn4` | WordPress MCP credentials |

Load Google Business credentials for browser automation:

```powershell
. .\dev\e2e\Load-GoogleBusinessEnv.ps1
# Sets GOOGLE_BUSINESS_EMAIL and GOOGLE_BUSINESS_PASSWORD
```

**op:// note:** titles with parentheses break `op read` URIs. Use vault UUID + item ID:

```powershell
op read op://mrviyowmjwrxv7syobdlhnmawa/ukvy6bzwb2ikq5cfeambgcq5u4/username
```

Constants and helpers: `dev/op/znt-agents-vault.ps1`.

| Token env var | Service account | Permissions | Typical use |
|---|---|---|---|
| `OP_SERVICE_ACCOUNT_TOKEN` | `op-svc-equipqr-agents` | Read | `op read`, `op inject`, metadata, CI |
| `OP_SAT_ZNTEQR` | Write SAT (maintainer-provisioned) | Read, Write & Share on vault | `op item create`, `op item edit` |

Cloud Agents and GitHub Actions use the read-only token as a repo/org secret. Never commit either token.

---

## Cursor shell vs 1Password writes

### Symptom

Running `op item edit` or `op item create` **inline** in a Cursor agent terminal:

- Hangs until killed (exit `4294967295` / timeout)
- `invalid JSON in piped input`
- `cannot create an item from template and stdin at the same time`

### Cause

Cursor's integrated shell attaches **stdin as a pipe** to child processes. The 1Password CLI treats active stdin as [JSON template input](https://www.1password.dev/cli/reference/management-commands/item#item-edit) (the `-` positional form). Reads do not use that code path, so `op read` works inline.

### Fix (required pattern)

Use the repo helper, which runs `op` in a **detached** `powershell.exe -File` process:

```powershell
# Dry-run field update (safe)
.\dev\op-item-mutate.ps1 `
  -Action Edit `
  -Item "app-env-preview-public" `
  -Assignment "GOOGLE_WORKSPACE_CLIENT_ID[text]=87469690682-example.apps.googleusercontent.com" `
  -DryRun

# Apply
.\dev\op-item-mutate.ps1 -Action Edit -Item "app-env-preview-public" `
  -Assignment "GOOGLE_WORKSPACE_CLIENT_ID[text]=87469690682-example.apps.googleusercontent.com"
```

Assignment rules ([official docs](https://www.1password.dev/cli/reference/management-commands/item#item-edit)):

- `--` before assignments when values contain `.` or special characters
- `field[text]=value` for plain text fields
- For multi-field or sensitive bulk edits: `-Action Edit -TemplatePath C:\path\to\item.json` after `op item get ... --format json`

Interactive maintainer terminals (`PS D:\ZNTEQR>`) can run `op` directly; agents should not rely on that.

---

## Secret sync pipelines

| Script | Source | Target |
|---|---|---|
| `dev-start.bat` / `dev-start.ps1` | `app-env-local-dev`, `edge-env-local-dev` | `.env`, `supabase/functions/.env` |
| Manual (no script) | `app-env-*-public` | Cloudflare Pages project `eqr-zinitek` → **Settings → Environment variables** (Production / Preview). The former `dev/sync-vercel-from-1password.ps1` was removed with Vercel. |
| `dev/sync-supabase-secrets-from-1password.ps1` | `edge-env-*-secrets` | Supabase Edge secrets |
| `dev/render-mcp-config.ps1` | `dev/mcp.template.json` + `op inject` | `~/.cursor/mcp.json` |

Verify MCP wiring: `.\dev\op-mcp-doctor.ps1` (expect 13/13 green on maintainer machine).

### Edge origin allowlist (`CLOUDFLARE_PAGES_PROJECT`)

Edge Functions decide which browser origins to trust — CORS (`getCorsHeaders`), Stripe return URLs, and QuickBooks / Google Workspace OAuth redirect validation — in `supabase/functions/_shared/origin-validation.ts`. Besides the static allowlist (`https://eqr.zinitek.com` plus local dev ports), they trust Cloudflare Pages deployments of **this** Pages project only:

- `https://<label>.<project>.pages.dev` — one `[a-z0-9-]` label in front, which covers per-deployment hashes and branch aliases such as `https://preview.eqr-zinitek.pages.dev`
- `https://<project>.pages.dev` — the project root

`<project>` is read from the edge secret `CLOUDFLARE_PAGES_PROJECT` (trimmed) and defaults to `eqr-zinitek` when unset. It is configuration, not a credential, but it is a trust boundary: a wrong value breaks preview CORS/OAuth, and a value naming someone else's Pages project would trust their deployments.

- Set `CLOUDFLARE_PAGES_PROJECT` explicitly on **both** `edge-env-prod-secrets` and `edge-env-preview-secrets` to the real Cloudflare Pages project name (the `<project>` part of the `*.pages.dev` hostname in Cloudflare → Workers & Pages); do not rely on the code default.
- Write it with the detached helper (`.\dev\op-item-mutate.ps1 -Action Edit -Item "edge-env-prod-secrets" -Assignment "CLOUDFLARE_PAGES_PROJECT[text]=<pages-project>" -DryRun`, then without `-DryRun`), repeat for `edge-env-preview-secrets`, and apply with `sync-supabase-secrets-from-1password.ps1`.
- If the Pages project is renamed, update both items in the same change, sync, and re-test preview OAuth on the new `*.pages.dev` host.

### Preview OAuth alignment checklist

Google Workspace OAuth requires **matching client ID** in:

1. `app-env-preview-public` → `GOOGLE_WORKSPACE_CLIENT_ID` → baked into Vite as `VITE_GOOGLE_WORKSPACE_CLIENT_ID`
2. `edge-env-prod-secrets` → `GOOGLE_WORKSPACE_CLIENT_ID` + `GOOGLE_WORKSPACE_CLIENT_SECRET` (cloud preview and production share this item after #1033)

After vault edit:

1. Copy the changed `VITE_*` value into the Cloudflare Pages **Preview** environment variables (project `eqr-zinitek`)
2. Retry the latest Cloudflare Pages deployment for git **`preview`** (or merge/push to `preview`) so `https://preview.eqr-zinitek.pages.dev` rebuilds with the new value
3. Confirm edge secrets via `sync-supabase-secrets-from-1password.ps1 -Check -OpItem edge-env-prod-secrets`

### Rotate-and-verify playbook (preview + production)

Use this end-to-end loop after any secret rotation in 1Password. Never paste secret values into chat, commits, or PR bodies.

**1. Read-only digest check (before change)**

```powershell
$env:OP_SERVICE_ACCOUNT_TOKEN = [Environment]::GetEnvironmentVariable('OP_SERVICE_ACCOUNT_TOKEN','User')
.\dev\sync-supabase-secrets-from-1password.ps1 -Check -OpItem edge-env-prod-secrets
.\dev\sync-supabase-secrets-from-1password.ps1 -Check -OpItem edge-env-preview-secrets
```

Cloudflare Pages build variables have no `-Check` script; compare them by hand in the Pages dashboard against `app-env-preview-public` / `app-env-prod-public`.

**2. Rotate in 1Password** (detached writes only)

```powershell
# Dry-run first
.\dev\op-item-mutate.ps1 -Action Edit -Item "edge-env-prod-secrets" `
  -Assignment "TOKEN_ENCRYPTION_KEY[text]=<openssl rand -base64 32 output>" -DryRun
# Apply without -DryRun when dry-run looks correct
```

For `TOKEN_ENCRYPTION_KEY` on production: generate a **new** key; do not copy the preview value. Rotating production encryption keys invalidates existing Google Workspace refresh tokens unless a re-encryption migration runs first — coordinate with maintainers before prod rotation.

**3. Apply to targets**

```powershell
# Production edge (serves the Cloudflare Pages preview and eqr.zinitek.com) — apply only when maintainer authorizes
.\dev\sync-supabase-secrets-from-1password.ps1 -OpItem edge-env-prod-secrets
```

For public `VITE_*` values, update the Cloudflare Pages **Preview** and **Production** environment variables in the dashboard (no sync script).

**4. Redeploy affected surfaces**

- Cloudflare Pages: retry the latest deployment for git `preview` (and for `main` when production variables changed) so baked `VITE_*` values refresh.
- Supabase Edge: secrets apply immediately; invoke a smoke edge function if unsure (`edge-functions-smoke-test.yml` or local `dev-start.bat` + integration path).

**5. Smoke verify**

| Surface | Signal |
|---------|--------|
| Preview GW | `/dashboard/organization/integrations` — Connect / sync users |
| Preview QB | Connect sandbox company; `quickbooks_credentials` row present |
| Production GW/QB | Repeat on `eqr.zinitek.com` after prod apply only |
| Drift CI | `secrets-drift-check.yml` daily run green on both edge items |

**6. Re-run `-Check`** — both edge `-Check` commands must exit 0, and the Cloudflare Pages variables must match the vault, before closing a rotation task.

See also `docs/ops/preview-architecture-migration.md` (#1033) for consolidating cloud preview on `edge-env-prod-secrets`.

---

## MCP and vendor access tiers

Rendered in `~/.cursor/mcp.json` from `dev/mcp.template.json`:

| MCP entry | Tier | Notes |
|---|---|---|
| `github-read` | Read | Default PR/issue inspection |
| `github-write` | Write | Mutates GitHub; maintainer approval for destructive ops |
| `gcloud` | Read | Viewer SA JSON |
| `gcloud-write` | Write | Impersonates editor SA via `CLOUDSDK_AUTH_IMPERSONATE_SERVICE_ACCOUNT` |
| `supabase` plugin | Mixed | Prefer read; migrations/production need explicit scope |
| Plugin MCPs (Datadog, Grafana, etc.) | Varies | First use may open **browser OAuth** in Cursor MCP settings |

When an MCP call returns auth errors, ask the maintainer to complete OAuth in **Cursor → Settings → MCP**, then retry once.

---

## Escalation template for agents

When blocked, post:

1. **Blocked on:** (e.g. "1Password vault write", "Supabase production migrate", "Google OAuth consent")
2. **Already tried:** (e.g. "inline op item edit — stdin pipe failure; detached script works")
3. **Request:** (e.g. "Please authorize Supabase MCP for project wgynakhoppqkrutnslmv" or "Please click Connect Google Workspace on preview integrations page")
4. **Verify after:** (e.g. "I'll confirm `google_workspace_credentials` row count = 1")

---

## Related docs

- `docs/ops/cloud-admin-access.md` — GCP org posture
- `.cursor/skills/secrets-rotation/SKILL.md` — rotation procedures (when present)
- `docs/technical/setup.md` — human developer onboarding
