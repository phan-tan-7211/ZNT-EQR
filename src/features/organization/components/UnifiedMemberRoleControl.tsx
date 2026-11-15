import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { UnifiedMembersListViewProps } from '@/features/organization/components/unifiedMembersListViewProps';
import type { UnifiedMember } from '@/features/organization/utils/buildUnifiedMembers';
import { useUnifiedMemberLabels } from '@/features/organization/hooks/useUnifiedMemberLabels';
import { getRoleBadgeVariant } from '@/utils/badgeVariants';
import { useI18n } from '@/i18n';

type UnifiedMemberRoleControlProps = Pick<UnifiedMembersListViewProps, 'canManageMembers' | 'onRoleChange'> & {
  member: UnifiedMember;
  layout: 'desktop' | 'mobile';
};

const layoutClassNames = {
  desktop: { trigger: 'w-24 h-8', badge: 'capitalize' },
  mobile: { trigger: 'w-24 h-7 text-xs', badge: 'capitalize text-xs' },
} as const;

/** Role select for editable members, read-only role badge for everyone else. */
export function UnifiedMemberRoleControl({
  member,
  canManageMembers,
  onRoleChange,
  layout,
}: UnifiedMemberRoleControlProps) {
  const { t } = useI18n();
  const { roleLabel } = useUnifiedMemberLabels();
  const classNames = layoutClassNames[layout];

  return canManageMembers && member.organizationRole !== 'owner' && member.type === 'member' ? (
    <Select
      value={roleLabel(member.organizationRole)}
      onValueChange={(value) => onRoleChange(member.id, value as 'admin' | 'member')}
    >
      <SelectTrigger className={classNames.trigger}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="admin">{t('organizationMembers.admin')}</SelectItem>
        <SelectItem value="member">{t('organizationMembers.member')}</SelectItem>
      </SelectContent>
    </Select>
  ) : (
    <Badge variant={getRoleBadgeVariant(member.organizationRole)} className={classNames.badge}>
      {roleLabel(member.organizationRole)}
    </Badge>
  );
}
