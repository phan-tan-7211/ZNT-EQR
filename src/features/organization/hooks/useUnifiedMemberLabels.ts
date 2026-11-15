import { useI18n } from '@/i18n';

/** Localized role, status and generated-name labels shared by the members desktop table and mobile list. */
export function useUnifiedMemberLabels() {
  const { t } = useI18n();
  const roleLabel = (role: string) => role === 'owner' || role === 'admin' || role === 'member'
    ? t(`organizationMembers.${role}`) : role;
  const statusLabel = (status: string) => status === 'active' ? t('organizationMembers.active')
    : status === 'pending_invite' ? t('organizationMembers.pendingInvite') : t('organizationMembers.pendingGoogle');
  const displayNameLabels = {
    pendingInvite: t('organizationMembers.pendingInvite'),
    pendingGoogle: t('organizationMembers.pendingGoogleName'),
    unknown: t('organizationMembers.unknownName'),
  };
  return { roleLabel, statusLabel, displayNameLabels };
}
