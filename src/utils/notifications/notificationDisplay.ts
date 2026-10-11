// fallow-ignore-file code-duplication
// Duplication rationale: Display utils mirror page-level notification rendering
import type { Notification } from '@/features/work-orders/hooks/useWorkOrderData';

export {
  navigateForNotification,
  notificationHasNavigableAction,
  resolveNotificationDestination,
} from '@/utils/notifications/notificationDestination';

/** Emoji icon for notification types (bell dropdown and notifications page). */
export function getNotificationEmoji(type: string): string {
  switch (type) {
    case 'work_order_submitted':
      return '📝';
    case 'work_order_accepted':
      return '✅';
    case 'work_order_assigned':
      return '👤';
    case 'work_order_in_progress':
      return '⚡';
    case 'work_order_on_hold':
      return '⏸️';
    case 'work_order_completed':
      return '🎉';
    case 'work_order_cancelled':
      return '❌';
    case 'ownership_transfer_request':
      return '🔄';
    case 'ownership_transfer_accepted':
      return '👑';
    case 'ownership_transfer_rejected':
    case 'workspace_merge_rejected':
      return '🚫';
    case 'ownership_transfer_cancelled':
      return '↩️';
    case 'workspace_merge_request':
      return '🧩';
    case 'workspace_merge_accepted':
      return '✅';
    case 'member_removed':
      return '👋';
    case 'member_added':
      return '➕';
    case 'member_role_changed':
      return '🛡️';
    case 'team_member_added':
      return '👥';
    case 'team_member_role_changed':
      return '🔐';
    case 'audit_export':
      return '📤';
    case 'export_ready':
      return '📊';
    case 'tooling_life_warning':
      return '⚠️';
    case 'tooling_life_limit':
      return '🛑';
    case 'tooling_quarantined':
      return '🚧';
    default:
      return '📢';
  }
}

/** Human-readable label for notification filter badges on the notifications page. */
export function getNotificationTypeLabel(type: string): string {
  switch (type) {
    case 'work_order_submitted':
      return 'Submitted';
    case 'work_order_accepted':
      return 'Accepted';
    case 'work_order_assigned':
      return 'Assigned';
    case 'work_order_in_progress':
      return 'In Progress';
    case 'work_order_on_hold':
      return 'On Hold';
    case 'work_order_completed':
      return 'Completed';
    case 'work_order_cancelled':
      return 'Cancelled';
    case 'ownership_transfer_request':
      return 'Transfer Request';
    case 'ownership_transfer_accepted':
      return 'Transfer Accepted';
    case 'ownership_transfer_rejected':
      return 'Transfer Declined';
    case 'ownership_transfer_cancelled':
      return 'Transfer Cancelled';
    case 'workspace_merge_request':
      return 'Merge Request';
    case 'workspace_merge_accepted':
      return 'Merge Accepted';
    case 'workspace_merge_rejected':
      return 'Merge Declined';
    case 'member_removed':
      return 'Member Removed';
    case 'member_added':
      return 'Member Added';
    case 'member_role_changed':
      return 'Org Role Changed';
    case 'team_member_added':
      return 'Team Member Added';
    case 'team_member_role_changed':
      return 'Team Role Changed';
    case 'audit_export':
      return 'Audit Export';
    case 'export_ready':
      return 'Export Ready';
    case 'tooling_life_warning':
      return 'Tool Life Warning';
    case 'tooling_life_limit':
      return 'Tool Life Limit';
    case 'tooling_quarantined':
      return 'Tool Quarantined';
    default:
      return 'General';
  }
}

type Translate = (key: string, params?: Record<string, string | number>) => string;

type LocalizableNotification = Pick<Notification, 'type' | 'title' | 'message' | 'data'>;

/** Tooling alert types → `toolingInsights.notifications.<copy>.{title,message}`. */
const TOOLING_NOTIFICATION_COPY: ReadonlyMap<string, 'lifeWarning' | 'lifeLimit' | 'quarantined'> = new Map([
  ['tooling_life_warning', 'lifeWarning'],
  ['tooling_life_limit', 'lifeLimit'],
  ['tooling_quarantined', 'quarantined'],
]);

const TOOLING_USAGE_UNITS = new Set(['cycles', 'shots', 'strokes', 'pieces']);

function dataText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function dataNumber(value: unknown, language: string): string {
  const numeric = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  return Number.isFinite(numeric) ? new Intl.NumberFormat(language).format(numeric) : '—';
}

/**
 * Notification title/message for display. The database writes English text;
 * for tooling alerts in other languages the copy is rebuilt from the
 * structured `data` payload. Falls back to the stored text whenever the
 * payload or a translation is missing.
 */
export function localizeNotificationContent(
  notification: LocalizableNotification,
  t: Translate,
  language: string,
): { title: string; message: string } {
  const stored = { title: notification.title, message: notification.message };
  const copy = TOOLING_NOTIFICATION_COPY.get(notification.type);
  if (!copy || language === 'en') return stored;

  const name = dataText(notification.data.tool_name);
  if (!name) return stored;

  const unitValue = dataText(notification.data.usage_unit);
  const unitKey = unitValue && TOOLING_USAGE_UNITS.has(unitValue) ? `tooling.units.${unitValue}` : null;
  const translatedUnit = unitKey ? t(unitKey) : null;
  const params = {
    name,
    code: dataText(notification.data.management_code) ?? '—',
    usage: dataNumber(notification.data.cumulative_usage, language),
    warning: dataNumber(notification.data.warning_limit, language),
    limit: dataNumber(notification.data.life_limit, language),
    unit: translatedUnit && translatedUnit !== unitKey ? translatedUnit : (unitValue ?? ''),
  };

  const titleKey = `toolingInsights.notifications.${copy}.title`;
  const messageKey = `toolingInsights.notifications.${copy}.message`;
  const title = t(titleKey, params);
  const message = t(messageKey, params);
  if (title === titleKey || message === messageKey) return stored;
  return { title, message };
}

