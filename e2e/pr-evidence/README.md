# PR visual evidence (Playwright)

Use these Playwright specs when screenshots or a demo video would help review a UI change. Cursor product/runtime PRs follow `.cursor/rules/pr-visual-evidence.mdc`; ChatGPT i18n-only PRs do not require visual artifacts. The capture tools use the local dev stack (`http://localhost:8080`) and can upload artifacts for display in the PR.

## When to add a spec

| Change type | Evidence spec |
|-------------|------------------|
| UI route, form, dialog, dashboard flow | Add `e2e/pr-evidence/<feature>.spec.ts` to capture the changed flow |
| Edge-only / no UI | No Playwright spec needed |
| Workflow-only (`.cursor/**`, `AGENTS.md`) | No Playwright spec needed |

If you choose to capture evidence and no feature spec exists, `smoke-dashboard.spec.ts` is a starting pattern; write a focused spec for the changed flow.

## Authoring a feature spec

1. Copy the pattern from `smoke-dashboard.spec.ts`.
2. Use `evidenceScreenshot(page, '01-step-label')` at each meaningful state (before, during, after). Pass `{ target: locator }` when a specific control must be fully framed in the PNG.
3. Add short `evidencePause` calls so demo video playback is readable.
4. Prefer Alex Apex (`gotoDashboard` fixture) unless RBAC requires another persona.
5. Keep specs deterministic — use seeded data from `supabase/seeds/`.
6. **Google Workspace flows** (`@real-auth`): quick-login personas cannot connect Google Workspace. Tag the spec `@real-auth`, capture Google sign-in with `npm run e2e:google-auth:capture`, then run capture with `E2E_REAL_AUTH_STORAGE_STATE` set. See `docs/ops/playwright-real-auth-integrations.md`.

Example skeleton:

```typescript
import { test, expect } from '../user/fixtures/znteqr-test';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

test.describe('my feature @pr-evidence', () => {
  test('demonstrates the change', async ({ gotoDashboard, page }) => {
    await gotoDashboard('/dashboard/my-route');
    const saveButton = page.getByRole('button', { name: /save/i });
    await evidenceScreenshot(page, '01-before', { target: saveButton });
    // ... interact ...
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '02-after', { target: saveButton });
    await expect(page.getByText(/expected outcome/i)).toBeVisible();
  });
});
```

## Frame quality (capture-time)

`evidenceScreenshot()` always asserts **no horizontal viewport overflow**. Pass `{ target: locator }` to scroll the control into frame and assert it is **fully visible** (not clipped by header, FAB, or sheet chrome) before the PNG is written. Helpers live in `shared/evidence-frame-helpers.ts`.

## Visual review (post-capture, mandatory before publish)

After `-CaptureOnly`, capture writes `tmp/pr-evidence/{flow}/visual-review-checklist.md`. The agent must **open each PNG** (Read tool or local viewer) and confirm:

- Target control/state is fully in frame with comfortable padding
- No horizontal scroll traps; mobile stacking is intentional
- Primary actions are reachable (not hidden behind fixed chrome)

Then record approval:

```powershell
.\dev\pr-evidence\Complete-PrEvidenceVisualReview.ps1 -Flow "<flow>" -Notes "<what you verified>"
```

Upload/publish (`Invoke-PrEvidence.ps1` without `-CaptureOnly`) is blocked until `visual-review.json` has `approved: true`. Re-capture clears stale approval.

## Capture and publish

```powershell
# Capture (stack must be up — dev-start.bat or run-user-regression preflight)
.\dev\pr-evidence\Invoke-PrEvidence.ps1 `
  -Flow "my-feature-slug" `
  -Spec "e2e/pr-evidence/my-feature.spec.ts" `
  -CaptureOnly

# Mandatory visual review — open each PNG in tmp/pr-evidence/{flow}/screenshots/
# and walk visual-review-checklist.md before upload/publish.
.\dev\pr-evidence\Complete-PrEvidenceVisualReview.ps1 `
  -Flow "my-feature-slug" `
  -Notes "Verified framing, no horizontal scroll, mobile stacking OK"

# Upload markdown (blocked until visual review is recorded)
.\dev\pr-evidence\Invoke-PrEvidence.ps1 `
  -Flow "my-feature-slug" `
  -Spec "e2e/pr-evidence/my-feature.spec.ts"

# After gh pr create, upload and post the evidence comment
.\dev\pr-evidence\Invoke-PrEvidence.ps1 `
  -Flow "my-feature-slug" `
  -Spec "e2e/pr-evidence/my-feature.spec.ts" `
  -PrNumber 1234 `
  -Publish
```

Artifacts land under `tmp/pr-evidence/{flow}/` (gitignored). Screenshot URLs use the preview Supabase `landing-page-images` bucket under `pr-evidence/{branch}/`. Demo video URLs are GitHub `user-attachments` links for inline playback.

## Help Center demo methodology (`docs-demo-helpers.ts`)

Issue #1161 standardizes eqrdocs.zinitek.com walkthrough videos on desktop **and** mobile:

1. **`settleForDemo`** — after navigation or a major state change, wait for spinners to clear, then hold the fully loaded view ~1s before the next step.
2. **`focusAndClick` / `focusAndFill` / `focusControl`** — scroll the target control fully into view, assert frame quality via `evidence-frame-helpers.ts` (no horizontal overflow, control not clipped), play a dim/blur spotlight that converges on the control, hold ~0.5s, un-dim, then act.
3. **`evidenceScreenshot(page, label, { target })`** — after a demo step, capture with the same frame-quality gate; pass `target` when a specific control must be fully visible in the PNG.

Specs under `e2e/pr-evidence/docs-*.spec.ts` import these helpers. Every control that is clicked must be **fully visible** before the focus animation starts — scroll first when the page is long.

**Post-capture:** walk `visual-review-checklist.md` and run `Complete-PrEvidenceVisualReview.ps1` before publishing docs-media or PR evidence (see **Visual review** above).

```typescript
import { focusAndClick, settleForDemo } from './shared/docs-demo-helpers';

await settleForDemo(page);
await focusAndClick(page, page.getByRole('button', { name: /invite member/i }));
```

## Documentation media (`docs-media`)

When updating eqrdocs.zinitek.com articles, also publish capture artifacts to the public **`docs-media`** bucket (stable paths for docs, not branch-scoped PR paths):

```powershell
.\dev\docs-media\Publish-DocsMedia.ps1 `
  -ManifestPath tmp\pr-evidence\location-maps-desktop\manifest.json `
  -Collection location-maps `
  -Variant desktop `
  -MarkdownOut tmp\docs-media\location-maps\desktop.md
```

See `docs/public/support/README.md` and `dev/docs-media/Publish-DocsMedia.ps1`.

See `dev/pr-evidence/README.md` for full operator docs.
