import { Badge } from '@/components/ui/badge';
import { UnifiedMemberPermissionRows } from '@/features/organization/components/UnifiedMemberPermissionRows';
import { UnifiedMemberAvatar } from '@/features/organization/components/UnifiedMemberAvatar';
import { UnifiedMemberRoleControl } from '@/features/organization/components/UnifiedMemberRoleControl';
import { UnifiedMemberRowActions } from '@/features/organization/components/UnifiedMemberRowActions';
import type { UnifiedMembersListViewProps } from '@/features/organization/components/unifiedMembersListViewProps';
import {
  getUnifiedMemberStatusBadgeVariant,
  getStatusIcon,
  getUnifiedMemberDisplayName,
} from '@/features/organization/utils/unifiedMemberPresentation';
import { useUnifiedMemberLabels } from '@/features/organization/hooks/useUnifiedMemberLabels';

export function UnifiedMembersMobileList({
  unifiedMembers,
  canManageMembers,
  permissionContext,
  partsManagerUserIds,
  partsConsumerUserIds,
  quickBooksPending,
  partsManagerPending,
  partsConsumerPending,
  onRoleChange,
  onQuickBooksToggle,
  onPartsManagerToggle,
  onPartsConsumerToggle,
  ...rowActionProps
}: UnifiedMembersListViewProps) {
  const { statusLabel, displayNameLabels } = useUnifiedMemberLabels();
  return (
    <div className="sm:hidden space-y-3">
      {unifiedMembers.map((member) => (
        <div key={member.id} className="rounded-lg border p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <UnifiedMemberAvatar member={member} />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{getUnifiedMemberDisplayName(member, displayNameLabels)}</p>
                <p className="text-xs text-muted-foreground truncate">{member.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant={getUnifiedMemberStatusBadgeVariant(member.status)} className="capitalize text-xs">
                <div className="flex items-center gap-1">
                  {getStatusIcon(member.status)}
                  {statusLabel(member.status)}
                </div>
              </Badge>
              <UnifiedMemberRowActions
                member={member}
                canManageMembers={canManageMembers}
                {...rowActionProps}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <UnifiedMemberRoleControl
              member={member}
              canManageMembers={canManageMembers}
              onRoleChange={onRoleChange}
              layout="mobile"
            />
          </div>
          <UnifiedMemberPermissionRows
            member={member}
            context={permissionContext}
            isPartsManager={member.userId ? partsManagerUserIds.has(member.userId) : false}
            isPartsConsumer={member.userId ? partsConsumerUserIds.has(member.userId) : false}
            quickBooksPending={quickBooksPending}
            partsManagerPending={partsManagerPending}
            partsConsumerPending={partsConsumerPending}
            onQuickBooksToggle={onQuickBooksToggle}
            onPartsManagerToggle={onPartsManagerToggle}
            onPartsConsumerToggle={onPartsConsumerToggle}
            layout="mobile"
          />
        </div>
      ))}
    </div>
  );
}
