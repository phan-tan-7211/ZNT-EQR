# Changelog

<!-- markdownlint-disable MD024 -->

All notable changes to ZNTEQR by ZNT LLC will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Entries through 3.28.0 are more verbose than the current policy. Newer notes are short customer-facing outcomes. Editorial rules live in `.cursor/rules/changelog.mdc`.

## [Unreleased]

## [3.40.3] - 2026-10-10

### Fixed

- **Bulk edit grid** - The equipment bulk-edit grid now shows equipment thumbnails with hover preview and the status color, and pages through every item (25 per page) instead of stopping at the first page.
- **Equipment sorting** - Sorting by Team no longer fails, and items with the same value no longer repeat or go missing between pages.

## [3.40.2] - 2026-10-06

### Fixed

- **Mobile inventory forms** - Inventory item and compatible-equipment dialogs now fit narrow phone screens without clipping fields or action buttons.

## [3.40.1] - 2026-10-03

### Fixed

- **Mobile image uploads** - Image processing now avoids concurrent canvas work, retries without a worker when needed, and ignores duplicate selections to prevent preview-generation failures on phones.

## [3.40.0] - 2026-09-29

### Added

- **More custom team permissions** - Organization owners can let team roles delete equipment, delete work orders, edit their team, manage team members, and delete their team.

### Fixed

- **Team management** - Team managers can now edit their team and manage its members as the app already showed; actions that were not permitted no longer report success without saving.
- **Inventory item delete** - The delete action is shown only to owners and admins, and item images are no longer removed when the item itself could not be deleted.

## [3.39.1] - 2026-09-29

### Fixed

- **Bug reports** - In-app bug reports are filed in the current ZNTEQR repository and assigned to the current maintainer.

## [3.39.0] - 2026-09-29

### Added

- **Custom team permissions** - Organization owners can choose which team roles may create and edit equipment from the permission matrix; changes are recorded in the audit log.

### Changed

- **Equipment editing** - Team technicians can edit equipment on their teams by default, matching bulk editing.

### Security

- **Server-side permission checks** - Equipment and work order changes are now enforced by the database for each role, not only by the app. Historical work orders are limited to owners and admins.

## [3.38.1] - 2026-09-29

### Security

- **Function access** - Internal equipment group helper functions can no longer be called directly through the API.

## [3.38.0] - 2026-09-29

### Added

- **Permission matrix** - Organization owners and admins can review what each organization and team role is allowed to do.
- **Access request history search** - Platform administrators can search, filter by status and page through the full access request history.

### Fixed

- **Google sign-in** - Signing in with Google always shows the account chooser, so users can switch accounts after signing out.
- **Pending access message** - Personal email domains are no longer described as claimed while an access request is pending.

## [3.37.1] - 2026-09-29

### Fixed

- **Cookie consent banner** - Dashboard pages no longer fall into the error screen when the cookie consent banner reloads during development.

## [3.37.0] - 2026-09-28

### Added

- **Facility map sketch tools** - Trim/extend and break/offset tools make it faster to clean up and adjust floor-plan sketches.

### Changed

- **Sidebar layout** - The main navigation sidebar now uses the standard full-height layout.

## [3.36.0] - 2026-09-28

### Added

- **Access approval** - Platform administrators can review self-registration requests, assign organization access, and see pending-request counts and decision history.

### Changed

- **Rejected requests** - Users can see the rejection reason and reviewer, and explicitly resubmit instead of sending another request automatically on sign-in.

## [3.35.1] - 2026-09-28

### Changed

- **Cloudflare Pages release path** — Frontend delivery now uses Cloudflare Pages, with Vercel deployment and redirect dependencies retired.

## [3.35.0] - 2026-09-27

### Security

- Replaced organization-based cross-tenant administrator authority with a private, audited Platform Admin registry and guarded grant/revoke operations.
- Restricted Google Workspace OAuth to existing organizations with active owner/admin authorization, including callback-time and domain-ownership revalidation.

### Added

- Added atomic Platform Admin organization provisioning with a pending initial OWNER invitation and no implicit organization membership.

## [3.34.22] - 2026-09-19

### Fixed

- Localized bundled ZNTEQR PM template names, descriptions, and section labels across the template catalog, detail view, assignment menu, and PDF section headings for Vietnamese and Korean while keeping organization-authored templates unchanged.

## [3.34.21] - 2026-09-19

### Fixed

- Localized the remaining shared multi-select actions and operator checklist add-field buttons so Vietnamese, English, and Korean UI no longer mix languages in daily check-in administration.

## [3.34.20] - 2026-09-19

### Fixed

- Moved long-dialog scrolling into an inset content region for the daily checklist editor and standardized dialog scrollbar spacing so scroll thumbs no longer hug or clip rounded modal edges.

## [3.34.19] - 2026-09-19

### Added

- Built-in operator check-in starters now clone their template name, fields, sections, help text, and checklist items in the admin's active Vietnamese, English, or Korean language; cloned templates remain fixed organization data afterward.

## [3.34.18] - 2026-09-19

### Fixed

- Standardized dialogs, alert dialogs, and sheets to stay within the viewport without accidental horizontal scrollbars; widened the equipment parts picker for long inventory names.

## [3.34.17] - 2026-09-19

### Fixed

- Prevented prerendered marketing text from flashing during authenticated navigation by keeping internal transitions in React Router and showing a branded loading state while persisted auth sessions resolve.

## [3.34.16] - 2026-09-19

### Added

- Added the existing Vietnamese/English/Korean language switcher to the authenticated equipment QR result page.

## [3.34.15] - 2026-09-19

### Fixed

- Aligned two Supabase migration filenames with the versions already recorded in production migration history, clearing schema-drift checks without replaying production DDL.

## [3.34.14] - 2026-09-19

### Fixed

- Kept the scanned-equipment ZNTEQR brand link on the current app origin instead of sending local or custom-domain users to the legacy production site.

## [3.34.13] - 2026-09-18

### Fixed

- Fixed authenticated equipment QR work-order creation so PM templates load in the scanned organization without crashing outside the dashboard shell.

## [3.34.12] - 2026-09-17

### Fixed

- Stabilized equipment column drag-and-drop so the drag handle and ghost do not block column menu actions.


## [3.34.11] - 2026-09-16

### Added

- Added direct part linking and new-part creation from an equipment's Parts tab.


## [3.34.10] - 2026-09-15

### Changed

- Public account creation is now invite-only in production so employees cannot create unrelated organizations.


## [3.34.9] - 2026-09-15

### Added

- Invited employees can create their own email/password account on mobile and join the inviting organization without creating a separate workspace.


## [3.34.8] - 2026-09-15

### Changed

- Public release notes now follow the selected Vietnamese, English, or Korean language.

## [3.34.7] - 2026-09-15

### Added

- Localized the complete Privacy Policy body for Vietnamese and Korean.

## [3.34.6] - 2026-09-15

### Added

- Added Vietnamese, English, and Korean language switching across the remaining public legal and feature pages.

## [3.34.5] - 2026-09-15

### Changed

- Centralized production deployment configuration in GitHub, removed hard-coded Vercel target IDs from release tooling, and removed 1Password from the Vercel production release path.

## [3.34.4] - 2026-09-15

### Changed

- Completed the ZNTEQR deep-cleanup follow-up by renaming remaining active internal runtime identifiers and moving the Help Center welcome article to the canonical `welcome-to-znteqr` slug while preserving the legacy URL with a permanent redirect.

## [3.34.3] - 2026-09-15

### Changed

- **ZNTEQR brand consistency** — Customers, assistive technologies, and public documentation now consistently identify the equipment platform as ZNTEQR.

## [3.34.2] - 2026-09-15

### Changed

- **Localized shared error handling** — Generic error titles, fallback messages, and recovery guidance now follow the selected Vietnamese, English, or Korean language.


## [3.34.1] - 2026-09-15

### Changed

- **VI/EN/KO localization completion** — Remaining user-facing work-order, PM, note, image, loading, accessibility, cookie-consent, and equipment feedback now follows the selected Vietnamese, English, or Korean language without changing stored business data.


## [3.34.0] - 2026-09-14

### Changed

- **ZNTEQR brand consistency** — Product copy, documentation, tests, PWA notifications, SEO metadata, and internal source identifiers now use the ZNTEQR brand. Existing equipqr.app URLs and persisted browser keys remain compatible.

## [3.33.0] - 2026-09-13

### Changed

- **Member roster localization** — Placeholder names for pending invitations, Google Workspace claims, and unknown members now display in Vietnamese, English, and Korean.

- **Equipment localization follow-up** — Remaining equipment form hints, bulk-edit controls, loading text, media labels, and note confirmation now display in Vietnamese, English, and Korean.

- **Work Orders mobile list localization** — Mobile search, filters, sorting, work-order cards, and auto-assignment prompts now display in Vietnamese, English, and Korean.

- **Work Orders list localization** — Work Orders browsing now supports Vietnamese, English, and Korean across desktop search, filters, sorting, active filter labels, empty states, and list/calendar view controls. (#4)

## [3.32.1] - 2026-09-12

### Changed

- **Equipment localization** — Equipment workflows now support Vietnamese, English, and Korean across lists, details, forms, QR scanning, PM, media, parts, filters, sorting, working hours, and equipment groups.

## [3.32.0] - 2026-09-06

### Added

- **Work order calendar (#1530)** — Desktop planners can switch Work Orders to a month, week, or day calendar, drag due dates, and set optional due times.
- **Work order list pages (#1534)** — The Work Orders list now pages on the server so large organizations no longer load every work order at once.
- **PM template groups (#1536)** — ZNTEQR and organization sections on PM Templates can collapse. ZNTEQR starts closed when the organization already has a custom template.

### Changed

- **Work order list toolbar** — The desktop list no longer shows a filtered/total count beside search; paging still shows how many work orders are in view.

### Fixed

- **Calendar panel close (#1533)** — The work-order side panel X now dismisses the panel.
- **Calendar create leftover** — Cancelling a new work order from a calendar slot no longer leaves a ghost event on the grid.

## [3.31.0] - 2026-09-02

### Changed

- **Dependency and security refresh** — Production now ships with the latest vetted dependency maintenance from the preview train.

## [3.30.0] - 2026-08-29

### Added

- **Public releases page (#1460)** — The Legal footer version link now opens a public `/releases` page with build-time release notes from the ZNTEQR changelog.

### Changed

- **Work order next steps stay on the phone** — Field technicians can act from the page without opening quick actions, and managers can revert locked work orders or reach customer contacts on phone-width layouts.
- **QR download menu** — Equipment, work order, and Quick Form QR dialogs now offer PNG or JPG downloads from a single menu, with How to use collapsed by default.

### Fixed

- **PM checklist section headers stay scannable on work orders (#1482)** — Multi-section PM checklists now show clear section headers with progress and flagged counts.
- **Dashboard hard loads keep the app shell visible (#1472)** — Reloading or directly opening dashboard routes now preserves the sidebar and header while content skeletons load.
- **Mobile overdue invoice badges keep work-order numbers visible (#1480)** — Phone-width work order details now wrap overdue invoice badges instead of clipping invoice or work-order numbers.
- **Mobile work-order quick actions stop covering details (#1479)** — Phone-width work order details now leave PM, Timeline, and Events & Times readable and tappable above the mobile nav.
- **Work order create errors stay honest** — Creating a work order now accepts blank descriptions and surfaces the real failure message instead of a generic toast.
- **Completed work order edit locks stay honest (#1483)** — Completed work orders now show clear lock messaging for notes, PM general notes, and description edits.
- **Accepted work orders honor existing assignees when starting work (#1481)** — Status Management now enables Start Work from the saved assignee instead of forcing a second picker step.
- **Mobile Start work follows unassigned state (#1481)** — Next step, Change status, and Work order actions now keep Start work visible but disabled with assignee guidance when no assignee is set.
- **Viewer and requestor PM controls stay hidden on work orders (#1495)** — Viewer and requestor team roles no longer see PM management controls on work order details.
- **Team member removal confirm works on team details** — Owners and team managers now get a real confirmation dialog before removing a teammate.
- **Completed work order revert actions are clearly labeled (#1484)** — Completed work orders now separate `Reopen work order` from `Revert PM`, explain each action, and require confirmation.
- **Work order delete stays in the overflow menu (#1485)** — Desktop details keep Export as the primary header action and move delete into the overflow menu, while mobile leaves delete last and low-emphasis.
- **Organization settings page alias (#1469)** — Opening `/dashboard/organization/settings` now renders the Settings form and organization tabs instead of a blank main panel.
- **Starter PM template titles stay readable** — ZNTEQR starter cards now keep template names readable even when both ZNTEQR and Protected badges are present.
- **Fleet Map Team HQ marker stays interactive (#1461)** — Clicking a team headquarters marker now keeps the map mounted and opens the team popup.
