import { CheckCircle, Clock, CloudCog } from 'lucide-react';
import type { UnifiedMember } from '@/features/organization/utils/buildUnifiedMembers';
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

export function getUnifiedMemberDisplayName(
  member: UnifiedMember,
  labels: { pendingInvite: string; pendingGoogle: string; unknown: string },
) {
  if (member.type === 'invitation') return labels.pendingInvite;
  if (member.type === 'gws_claim' && member.name === 'Pending (Google Workspace)') return labels.pendingGoogle;
  if (member.type === 'member' && member.name === 'Unknown') return labels.unknown;
  return member.name;
}

export function getStatusIcon(status: UnifiedMember['status']) {
  switch (status) {
    case 'active':
      return <CheckCircle className="h-4 w-4 text-success" />;
    case 'pending_invite':
      return <Clock className="h-4 w-4 text-warning" />;
    case 'pending_gws':
      return <CloudCog className="h-4 w-4 text-info" />;
  }
}

export function getUnifiedMemberStatusBadgeVariant(status: UnifiedMember['status']) {
  switch (status) {
    case 'active':
      return 'default' as const;
    case 'pending_invite':
      return 'secondary' as const;
    case 'pending_gws':
      return 'outline' as const;
  }
}
