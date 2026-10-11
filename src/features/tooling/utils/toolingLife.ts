import type { ToolingOverview } from '@/features/tooling/types';

export type ToolingLifeTone = 'ok' | 'warning' | 'limit' | 'none';

/** Percentage of hard life consumed (0-100+, null when no life limit). */
export function toolingLifePercent(tool: Pick<ToolingOverview, 'cumulative_usage' | 'life_limit'>): number | null {
  if (!tool.life_limit || tool.life_limit <= 0) return null;
  return Math.round((Number(tool.cumulative_usage) / Number(tool.life_limit)) * 1000) / 10;
}

export function toolingRemainingLife(tool: Pick<ToolingOverview, 'cumulative_usage' | 'life_limit'>): number | null {
  if (tool.life_limit == null) return null;
  return Number(tool.life_limit) - Number(tool.cumulative_usage);
}

export function toolingLifeTone(
  tool: Pick<ToolingOverview, 'cumulative_usage' | 'life_limit' | 'warning_limit'>,
): ToolingLifeTone {
  const usage = Number(tool.cumulative_usage);
  if (tool.life_limit != null && usage >= Number(tool.life_limit)) return 'limit';
  if (tool.warning_limit != null && usage >= Number(tool.warning_limit)) return 'warning';
  if (tool.life_limit == null && tool.warning_limit == null) return 'none';
  return 'ok';
}

/**
 * Why a tool cannot be issued right now, mirroring the checks in
 * `issue_tooling` (the database remains the source of truth).
 */
export type ToolingIssueBlocker =
  | 'issued'
  | 'not_approved'
  | 'not_usable'
  | 'damaged'
  | 'life_limit'
  | 'inspection_overdue';

export function toolingIssueBlockers(
  tool: Pick<
    ToolingOverview,
    | 'is_issued'
    | 'approval_status'
    | 'usability_state'
    | 'condition'
    | 'life_limit_reached'
    | 'inspection_overdue'
  >,
): ToolingIssueBlocker[] {
  const blockers: ToolingIssueBlocker[] = [];
  if (tool.is_issued) blockers.push('issued');
  if (tool.approval_status !== 'approved') blockers.push('not_approved');
  if (tool.usability_state !== 'available') blockers.push('not_usable');
  if (tool.condition === 'damaged') blockers.push('damaged');
  if (tool.life_limit_reached) blockers.push('life_limit');
  if (tool.inspection_overdue) blockers.push('inspection_overdue');
  return blockers;
}

export function formatToolingNumber(value: number | null | undefined, locale?: string): string {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return new Intl.NumberFormat(locale).format(Number(value));
}
