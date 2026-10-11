import type { useI18n } from '@/i18n';

type Translate = ReturnType<typeof useI18n>['t'];

const detailKeys: Record<string, string> = {
  'Click to respond to transfer request': 'transfer',
  'Click to respond to merge request': 'merge',
  'Click to view organization settings': 'settings',
  'Click to open workspace': 'workspace',
  'Click to view reports': 'reports',
  'Click to view audit log': 'audit',
  'Click to view team': 'team',
  'Click to view members': 'members',
  'Click to view work order': 'workOrder',
  'Click to view tool': 'tool',
  'Click to go to dashboard': 'dashboard',
};

export function localizeNotificationDetail(detail: string, t: Translate): string {
  const key = detailKeys[detail];
  return key ? t(`notificationExtras.${key}`) : detail;
}

export function localizeNotificationCompact(compact: string, t: Translate): string {
  if (compact === 'Respond →') return t('notificationExtras.respond');
  if (compact === 'View →') return t('notificationExtras.view');
  return compact;
}
