---
title: Tooling management
description: Manage jigs, fixtures, molds and dies in ZNTEQR - compatibility, issue and return, tool life, inspection and drawing revisions.
---

# Tooling management

The **Tooling** page manages production and inspection tooling: jigs, fixtures, molds, dies, checking fixtures and general tools. Open it from **Fleet → Tooling** in the sidebar.

Each tool is an equipment record in the **TL** equipment group. It keeps the same management code (for example `EQ-TL-000001`), QR code, photos and work orders as any other equipment. Tooling adds compatibility, issue and return, tool life and inspection on top.

::: info
ZNTEQR supports IATF 16949 tooling-management practices. Using the module does not by itself certify compliance.
:::

## Register a tool

Owners and admins can register tools.

1. Open **Tooling** and select **Register tool**.
2. Choose **New TL asset** to create a new equipment record, or **Enroll existing TL equipment** to turn an existing TL asset into a tool.
3. Fill in the type, ownership, storage location, responsible person and drawing information.
4. Set the usage unit (cycles, shots, strokes or pieces) and, if known, the warning limit, life limit, maintenance interval and inspection interval.
5. Turn off **Requires machine** for hand-operated tools.

A new tool starts as **Pending approval**. An owner or admin must select **Approve for use** on the Overview tab before it can be issued.

## Products, operations and compatibility

Use the **Products**, **Operations** and **Designs** tabs on the Tooling page to maintain the catalogs.

On a tool's **Compatibility** tab, add rules that link the tool to a product, optionally an operation, and one or more machines. Choose **No machine (manual)** for hand-operated tooling.

- New rules start as **Pending**. An owner or admin approves, rejects or deactivates each rule.
- A rule says where the tool **may** be used. It never assigns the tool to a machine.

## Issue and return

Scan the tool's QR code. On the equipment page, select **Issue / Return** in the tooling banner, or open the tool's **Issue / Return** tab.

- **Issue tool** records who received it, optional product / operation / machine context, location and condition.
- When you enter production context, ZNTEQR checks it against approved, active compatibility rules.
- A tool can only be issued once at a time.
- A tool cannot be issued when it is not approved, not available, damaged, past its life limit or overdue for inspection.
- **Return tool** records condition, location and optional usage. A tool returned as **Damaged** is quarantined automatically.

## Tool life

The **Usage & Tool Life** tab shows cumulative usage, remaining life and usage since the last maintenance.

- Record usage at any time, or enter it when returning the tool.
- When usage reaches the warning limit, owners, admins and the responsible person get a notification.
- When usage reaches the life limit, the tool cannot be issued again until an owner or admin records a **disposition**: extend the life limit or retire the tool.
- Usage corrections need an owner or admin and a reason. Lifetime usage is never reset by maintenance.

## Maintenance, repair and inspection

The **PM / Repair / Inspection** tab lists the tool's work orders and inspections.

- Create repair or PM work orders with **Create work order**. They are ordinary work orders on the tool's equipment record.
- Owners and admins can send a tool to repair, mark it pending inspection, block it or retire it.
- **Record inspection** stores the result. Ticking **Maintenance completed** resets only the since-maintenance counter.
- Only an owner or admin can tick **Approve return to service**, and only with a passing result. This is the only way back to **Available** after quarantine or repair.

## Drawing revisions

The **Documents & Revision** tab keeps the tool's drawing revision register. Owners and admins select **Release new revision**, enter the revision and a change description, and the previous revision becomes **Superseded**.

## Reports, import and labels

From the Tooling page you can:

- Export the tool register or the customer-owned tooling report to CSV, Excel or PDF.
- Export a single tool's full history from its page.
- Import tools, products and operations from an Excel or CSV template.
- Print QR labels for several tools at once.

## History and audit

The **History / Audit** tab lists every tooling event. The same events are recorded in the organization audit log (owners and admins).

See [Roles and permissions](/guides/permissions#tooling-management) for who can do what.
