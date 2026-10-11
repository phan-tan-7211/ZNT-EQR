# CI/CD Pipeline Documentation

> **Current hosting (2026-09-28):** Vercel is retired. The frontend is deployed by
> Cloudflare Pages from Git (project `eqr-zinitek`), while Production Release
> Readiness handles Supabase migrations, strict drift verification, and Edge
> Functions. Remaining Vercel mentions below are migration history only.

This document provides a comprehensive overview of ZNTEQR's entire CI/CD pipeline, including GitHub Actions workflows, external services (Cloudflare Pages, Supabase), and their interactions.

## Pipeline Overview

```text
push / PR ──▶ GitHub Actions
              ├─ ci.yml: lint, typecheck, tests, build, security, release metadata
              ├─ supabase-migration-validator.yml: PRs touching supabase/**
              ├─ schema-drift-check.yml: PRs into main (release gate)
              └─ main only: production-release-readiness.yml
                    └─ Supabase: db push ─▶ strict drift check ─▶ functions deploy

push / PR ──▶ Cloudflare Pages Git integration (project eqr-zinitek)
              ├─ main     ─▶ https://eqr.zinitek.com
              ├─ preview  ─▶ https://preview.eqr-zinitek.pages.dev
              └─ other    ─▶ https://<hash>.eqr-zinitek.pages.dev
                             (URL on the GitHub "Cloudflare Pages" check)

Supabase: production project wgynakhoppqkrutnslmv serves production and cloud
preview today; ephemeral branches only for PRs that touch supabase/**.
```

## Environments

| Environment | Git trigger | Frontend URL | Supabase API |
|-------------|-------------|--------------|--------------|
| **Production** | Push to `main` (Cloudflare Pages production deploy; Production Release Readiness for Supabase) | `<https://eqr.zinitek.com>` | `https://wgynakhoppqkrutnslmv.supabase.co` (`wgynakhoppqkrutnslmv`) |
| **Integration preview** | Push/merge to git **`preview`** | `<https://preview.eqr-zinitek.pages.dev>` | **Current live:** production API (`wgynakhoppqkrutnslmv.supabase.co`). **Approved target:** persistent dataless branch per `docs/ops/preview-persistent-branch.md` |
| **PR Preview** | Feature PRs / work-branch pushes | Per-deployment `https://<hash>.eqr-zinitek.pages.dev` (GitHub **Cloudflare Pages** check) | Prod API by default; ephemeral Supabase when `supabase/**` changes |

> **Train (#1282):** feat → preview → main. Authoritative loop: **`docs/ops/git-and-deploy.md`**. Retired: Vercel (all projects and `*.vercel.app` hosts), `preview-domain-alias.yml`, Vercel custom **`staging`**, persistent Supabase **`olsdirkvvfegvclbpgrg`**. History: `docs/ops/preview-architecture-migration.md`.
>
> **Target decision (not yet live):** `docs/ops/preview-persistent-branch.md`
> records the approved move away from production Supabase for
> `preview.eqr-zinitek.pages.dev`. Do not document that cutover as complete until the
> preview env and branch checklist have been executed.

## GitHub Actions Workflows

### 1. Continuous Integration (`ci.yml`)

**Trigger:** Push or PR to `main` or `preview`

**Purpose:** Validate code quality, run tests, and ensure build works

**Jobs (run in parallel where possible):**

| Job | Runner | Purpose |
|-----|--------|---------|
| `lint-and-typecheck` | Self-hosted | ESLint + TypeScript type checking |
| `test` | Self-hosted | Vitest tests with coverage (Node 24.x LTS, matches `ci.yml`) |
| `security` | GitHub-hosted | npm audit + CodeQL security scan |
| `build` | Self-hosted | Production build + bundle analysis |
| `quality-gates` | Self-hosted | Final checks (bundle size limits, gzip size) |
| `report-coverage` | GitHub-hosted | Post coverage report to PRs |
| `preview-release-metadata` | CI | PRs into **`preview`**: Unreleased-only; forbid package version bump |
| `release-metadata` | CI | PRs into **`main`**: empty Unreleased + semver bump when release-relevant |

**Quality Gates:**
- Build size must be < 12MB total
- Individual JS bundles must be < 500KB gzipped
- Test coverage must meet baseline (70%)

### 2. Deploy Workflow (`deploy.yml`) — REMOVED

`deploy.yml` (Vercel production deployment notifications) was deleted when Vercel was retired. Frontend deploys are handled by the Cloudflare Pages GitHub integration, which reports a **Cloudflare Pages** check on each commit. Merges to git **`preview`** update **`https://preview.eqr-zinitek.pages.dev`**; other branches and PRs get per-deployment `*.eqr-zinitek.pages.dev` URLs.

### 3. Preview Domain Alias — REMOVED

**`preview-domain-alias.yml` is retired (#1282).** It previously fast-forwarded git `preview` from `main` and fired a deploy hook. Do not reference it as live. The Cloudflare Pages branch alias `preview.eqr-zinitek.pages.dev` tracks git **`preview`** through ordinary deploys on that branch.

### 4. Auto Version Tag (`version-tag.yml`)

**Trigger:** Push to `main` when `package.json` changes

**Purpose:** Automatically create git tags when version is bumped

**Process:**
1. Reads version from `package.json`
2. Validates semver format (x.y.z)
3. Creates annotated tag `vX.Y.Z` if it doesn't exist
4. Pushes tag to origin

### 5. Deployment Status (`deployment-status.yml`)

**Trigger:** `deployment_status` events

**Purpose:** Log success/failure for every GitHub `deployment_status` event (`success` or `failure`) and fail the job on a failed deployment. The Vercel-era filter that ignored the `equipqr-docs` project (then serving `equipqr.info`) was removed with Vercel.

### 6. Export Database Schema (`export-schema.yml`)

**Trigger:** Push to `main` branch, or manual dispatch

**Purpose:** Export the database schema from the **production** Supabase project and commit it to the repository

**What it does:**
- Uses Supabase CLI to dump schema from the production project
- Exports `public`, `storage`, `auth`, and `pgmq_public` schemas to `supabase/schema.sql`
- Queries `pg_policies` / table RLS posture into `supabase/rls-policies.sql`
- Commits both reference files if changed
- Uses `paths-ignore` and bot-actor guard to prevent workflow loops

**Benefits:**
- Instant visibility into current database structure
- No need to mentally reconstruct schema from 160+ migration files
- Useful for onboarding and documentation
- Easy schema review in PRs

**Required Secret:** `PREVIEW_DATABASE_URL` (GitHub secret name unchanged; value should point at production pooler after #1033 cutover)
- Format: `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`
- Obtain from: Supabase Dashboard → Production Project (`wgynakhoppqkrutnslmv`) → Settings → Database → Connection string (URI)

---

## External Services

### Cloudflare Pages

**Integration Type:** Cloudflare Pages Git integration (GitHub app, automatic)

**Configuration files:** [`public/_redirects`](../../public/_redirects) (SPA routing to `/app-shell.html`) and [`public/_headers`](../../public/_headers) (security headers, CSP, `noindex` on app routes, `/assets/*` caching). Build settings (`npm run build`, output `dist`) live in the Cloudflare dashboard.

**How it works:**
1. The Cloudflare Pages project `eqr-zinitek` is connected to `phan-tan-7211/ZNT-EQR`.
2. On every push, Cloudflare Pages builds the application (`npm run build`), publishes `dist`, and reports a **Cloudflare Pages** check on the commit/PR with the deployment URL.
3. `main` deploys to production; every other branch deploys to the Preview environment.

**Branch to hostname mapping:**

| Git context | Pages environment | URL |
|-------------|-------------------|-----|
| `main` | Production | `https://eqr.zinitek.com` (live when the build succeeds) |
| `preview` (integration train) | Preview | `https://preview.eqr-zinitek.pages.dev` (branch alias) |
| PR / other non-`main` push | Preview | `https://<hash>.eqr-zinitek.pages.dev` plus a branch alias |

**Trusted by Edge Functions:** `https://eqr.zinitek.com`, `https://<label>.eqr-zinitek.pages.dev` (one label — deployment hash or branch alias), and the project root `https://eqr-zinitek.pages.dev`. The project name comes from the `CLOUDFLARE_PAGES_PROJECT` edge secret (default `eqr-zinitek`); see [`agent-secrets-and-access.md`](./agent-secrets-and-access.md#edge-origin-allowlist-cloudflare_pages_project). Origins from other `*.pages.dev` projects are rejected.

**Environment Variables (Cloudflare Pages → Settings → Environment variables, per environment):**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- Other public `VITE_*` values from `app-env-preview-public` / `app-env-prod-public` (see [`deployment.md`](./deployment.md#secrets-checklist))

#### Public documentation site (`eqrdocs.zinitek.com`)

Technical documentation is deployed as a **separate Cloudflare Pages project** (same GitHub repo, **Root directory** `docs`), so `eqr.zinitek.com` stays the product SPA and `eqrdocs.zinitek.com` serves static docs.

| Item | Value |
|------|--------|
| Repository | `phan-tan-7211/ZNT-EQR` |
| Root directory | `docs` |
| Build command | `npm run docs:build` |
| Output directory | `.vitepress/dist` |
| Headers | [`docs/public/_headers`](../public/_headers) |
| Production hostname | `https://eqrdocs.zinitek.com` (custom domain on the docs project) |
| Retired | Vercel project `equipqr-docs` and the former `equipqr.info` / `www.equipqr.info` hostnames |

**Deployment cadence:** production builds of the docs project run from **`main`**. Keep `eqrdocs.zinitek.com` attached to the docs project only, never to the SPA project `eqr-zinitek`.

Local preview: from repo root, `npm run docs:dev` or `npm run docs:preview` after `npm run docs:build`.

---

### Supabase

**Configuration File:** `supabase/config.toml`

**Projects:**
- **Production:** `wgynakhoppqkrutnslmv` — API `https://wgynakhoppqkrutnslmv.supabase.co`
- **Current live preview app:** still uses the production project above
- **Approved target preview backend:** a new persistent dataless branch for `preview.eqr-zinitek.pages.dev` (not yet cut over; see `preview-persistent-branch.md`)
- **Ephemeral PR branches:** Created automatically when `supabase/**` changes on a PR (schema validation only)
- **Retired persistent preview branch:** `olsdirkvvfegvclbpgrg` — decommission after #1033 cutover (see `preview-architecture-migration.md`)

#### Auth Site URL (current live vs target)

Current live preview uses the **same** Supabase project as production, so
production Auth `site_url` and redirect URIs should include:

- `https://preview.eqr-zinitek.pages.dev/**`
- `https://eqr.zinitek.com/**`
- Local dev URLs (`http://localhost:8080/**`, etc.)

The approved target is different: once the persistent preview branch cutover in
`preview-persistent-branch.md` lands, branch Auth should carry
`site_url=https://preview.eqr-zinitek.pages.dev` and the preview-specific redirect
allowlist, while production Auth remains unchanged.

---

## Deployment Timeline

When you open or update a PR (Preview deployment):

| Time | Event |
|------|-------|
| 0:00 | Push to feature branch or PR synchronize |
| 0:01 | GitHub Actions CI starts |
| 0:01 | Cloudflare Pages receives the push, starts a Preview build |
| ~2:00 | Cloudflare Pages Preview deployment ready (per-deployment URL on the check; `preview.eqr-zinitek.pages.dev` is **not** touched by PR builds) |
| ~3:00 | CI complete |

When you merge to git **`preview`**:

| Time | Event |
|------|-------|
| 0:00 | Push/merge to `preview` |
| 0:01 | CI on `preview` |
| 0:01 | Cloudflare Pages Preview build for branch `preview` |
| ~2:00 | `https://preview.eqr-zinitek.pages.dev` points at the new Preview deployment |

When you merge a promote to **`main`**:

| Time | Event |
|------|-------|
| 0:00 | Push to `main` |
| 0:01 | CI + Production Release Readiness workflows |
| ~2:00 | Cloudflare Pages production build live on `eqr.zinitek.com`; Production Release Readiness finishes Supabase migrations, drift check, and Edge Functions |

---

## Runner Configuration

ZNTEQR uses a hybrid runner strategy for optimal performance and security.

**Current Configuration:** Self-hosted (Windows)

**Toggle Method:**
```powershell
# Switch to self-hosted
pwsh -File dev/switch-runner-type.ps1 -RunnerType self-hosted

# Switch to GitHub-hosted
pwsh -File dev/switch-runner-type.ps1 -RunnerType github-hosted
```

**Runner Assignment:**

| Job Type | Runner | Reason |
|----------|--------|--------|
| Lint, Test, Build | Self-hosted | Faster with local resources |
| Security Scan | GitHub-hosted | Isolation for security scans |
| Coverage Report | GitHub-hosted | Simple, doesn't need local resources |

**Benefits of Self-hosted:**
- 30-50% faster builds
- No queue time
- Persistent cache
- No GitHub Actions minutes consumed

See [Deployment Guide - Self-Hosted Runner Setup](./deployment.md#self-hosted-runner-setup) for detailed configuration.

---

## Secrets Required

### GitHub Repository Secrets

| Secret | Purpose | Where to Obtain |
|--------|---------|-----------------|
| `VITE_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Supabase Dashboard → Settings → API |
| `SUPABASE_ACCESS_TOKEN` | Management API auth | Supabase Dashboard → Account → Access Tokens |
| `PREVIEW_DATABASE_URL` | Preview DB connection for schema export | Supabase Dashboard → Preview Project → Settings → Database → Connection string (URI) |
| `CODECOV_TOKEN` | Coverage reporting | Codecov dashboard |
| `GITHUB_TOKEN` | Auto-provided by GitHub | N/A |

### Cloudflare Pages Environment Variables

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL (per environment) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key (per environment) |

---

## Troubleshooting

### OAuth redirects to wrong URL (preview)

**Symptom:** Google OAuth redirects to a per-deployment `*.eqr-zinitek.pages.dev` URL instead of `https://preview.eqr-zinitek.pages.dev`

**Checks:**
1. Confirm the latest Cloudflare Pages deployment for git branch **`preview`** succeeded and the `preview` branch alias serves it.
2. Confirm the Cloudflare Pages Preview env matches the currently active design:
   - **Today:** `VITE_SUPABASE_URL=https://wgynakhoppqkrutnslmv.supabase.co`
   - **After the approved cutover:** the persistent preview branch URL from `preview-persistent-branch.md`
3. Confirm Supabase Auth redirect URIs include `https://preview.eqr-zinitek.pages.dev/**` on the backend currently serving preview:
   - **Today:** production project `wgynakhoppqkrutnslmv`
   - **After the approved cutover:** the persistent preview branch Auth config

### CI failing on self-hosted runner

**Check:**
1. Runner service is running: `Get-Service -Name "actions.runner.*"`
2. Disk space: Should have > 10GB free
3. Node.js: Install **Node 24.x LTS** (must satisfy `engines.node` in root `package.json`).

### Version tag not created

**Check:**
1. The push was to `main` branch
2. `package.json` was modified in the commit
3. Version follows semver format (x.y.z)
4. Tag doesn't already exist

### Build succeeds but app shows old version

**Check:**
1. Cloudflare Pages deployment completed (GitHub **Cloudflare Pages** check or the Pages dashboard)
2. Browser cache cleared
3. `VITE_APP_VERSION` was set during build (check CI logs)

---

## Related Documentation

- [Deployment Guide](./deployment.md) - Detailed deployment and hosting information
- [Supabase Branch Secrets](./supabase-branch-secrets.md) - Edge Function secrets per branch
- [Migrations Guide](./migrations.md) - Database migration workflow
- [Local Supabase Development](./local-supabase-development.md) - Local development setup

---

## Pipeline Files Reference

| File | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | Continuous integration (lint, test, build, security) |
| `.github/workflows/production-release-readiness.yml` | Production Supabase migrations, strict drift check, Edge Functions deploy |
| `.github/workflows/deploy.yml` | **REMOVED** with Vercel — Cloudflare Pages reports its own check |
| `.github/workflows/preview-domain-alias.yml` | **REMOVED (#1282)** — do not restore; `preview.eqr-zinitek.pages.dev` tracks git `preview` via normal Cloudflare Pages deploys |
| `.github/workflows/version-tag.yml` | Auto-create git tags on version bump |
| `.github/workflows/deployment-status.yml` | Log GitHub deployment status events |
| `.github/workflows/export-schema.yml` | Export database schema from production to `supabase/schema.sql` |
| `.github/runner-config.yml` | Runner type configuration |
| `public/_redirects`, `public/_headers` | Cloudflare Pages routing and headers (replaced `vercel.json`) |
| `supabase/config.toml` | Supabase CLI configuration |
| `dev/switch-runner-type.ps1` | Toggle self-hosted/GitHub-hosted runners |
| `dev/test-ci.mjs` | CI test runner with coverage validation |
