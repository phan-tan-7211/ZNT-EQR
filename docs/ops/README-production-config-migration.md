# Production config migration checklist

> **Superseded (2026-09-28):** Vercel is retired. The frontend now deploys through the Cloudflare Pages Git integration, and Production Release Readiness only needs the Supabase values below. The `VERCEL_TEAM_ID`, `VERCEL_PROJECT_ID`, and `VERCEL_TOKEN` entries from the original checklist are no longer read and can be deleted from the GitHub `production` environment. Current reference: [`production-config.md`](./production-config.md) and [`git-and-deploy.md`](./git-and-deploy.md).

This short checklist accompanied the move away from 1Password in the production release path.

Configure GitHub Environment `production` with:

Variables:
- `SUPABASE_PROJECT_REF`

Secrets:
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`

Then confirm `Production Release Readiness` passes configuration validation, Supabase migration/drift checks, and Edge Function deployment, and that the GitHub **Cloudflare Pages** check for the same `main` commit is green.

The removed `dev/sync-vercel-from-1password.ps1` must not be restored. Frontend `VITE_*` variables belong in the Cloudflare Pages project, and Supabase runtime secrets belong in Supabase.
