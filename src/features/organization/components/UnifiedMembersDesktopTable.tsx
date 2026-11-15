import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  UnifiedMemberPartsConsumerControl,
  UnifiedMemberPartsManagerControl,
  UnifiedMemberQuickBooksControl,
} from '@/features/organization/components/UnifiedMemberPermissionRows';
import { PartsConsumerMarkIcon } from '@/components/icons/PartsConsumerMarkIcon';
import { PartsManagerMarkIcon } from '@/components/icons/PartsManagerMarkIcon';
import { QuickBooksMarkIcon } from '@/components/icons/QuickBooksMarkIcon';
import { UnifiedMemberAvatar } from '@/features/organization/components/UnifiedMemberAvatar';
import { UnifiedMemberRoleControl } from '@/features/organization/components/UnifiedMemberRoleControl';
import { UnifiedMemberRowActions } from '@/features/organization/components/UnifiedMemberRowActions';
import type { UnifiedMembersListViewProps } from '@/features/organization/components/unifiedMembersListViewProps';
import {
  getUnifiedMemberStatusBadgeVariant,
  getStatusIcon,
  getUnifiedMemberDisplayName,
  useUnifiedMemberLabels,
} from '@/features/organization/utils/unifiedMemberPresentation';
import { useFormatTimestamp } from '@/hooks/useFormatTimestamp';
import { useI18n } from '@/i18n';

const thClass = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground';

export function UnifiedMembersDesktopTable({
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
  const { t } = useI18n();
  const { formatDate } = useFormatTimestamp();
  const { statusLabel, displayNameLabels } = useUnifiedMemberLabels();
  const { isOwner, quickBooksEnabled, canManagePartsManagers, canManagePartsConsumers } =
    permissionContext;
  const showQuickBooksColumn = isOwner && quickBooksEnabled;
  const showPartsManagerColumn = canManagePartsManagers;
  const showPartsConsumerColumn = canManagePartsConsumers;

  return (
    <div className="hidden sm:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className={thClass}>{t('organizationMembers.member')}</TableHead>
            <TableHead className={thClass}>{t('organizationMembers.email')}</TableHead>
            <TableHead className={thClass}>{t('organizationMembers.role')}</TableHead>
            <TableHead className={thClass}>{t('organizationMembers.status')}</TableHead>
            {showQuickBooksColumn && (
              <TableHead className={thClass}>
                <Tooltip>
                  <TooltipTrigger className="cursor-help inline-flex items-center gap-1.5 uppercase">
                    <QuickBooksMarkIcon />
                    {t('organizationMembers.quickBooks')}
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{t('organizationMembers.quickBooksHelp')}</p>
                  </TooltipContent>
                </Tooltip>
              </TableHead>
            )}
            {showPartsManagerColumn && (
              <TableHead className={thClass}>
                <Tooltip>
                  <TooltipTrigger className="cursor-help inline-flex items-center gap-1.5 uppercase">
                    <PartsManagerMarkIcon />
                    {t('organizationMembers.partsManager')}
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{t('organizationMembers.managerHelp')}</p>
                  </TooltipContent>
                </Tooltip>
              </TableHead>
            )}
            {showPartsConsumerColumn && (
              <TableHead className={thClass}>
                <Tooltip>
                  <TooltipTrigger className="cursor-help inline-flex items-center gap-1.5 uppercase">
                    <PartsConsumerMarkIcon />
                    {t('organizationMembers.partsConsumer')}
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{t('organizationMembers.consumerHelp')}</p>
                  </TooltipContent>
                </Tooltip>
              </TableHead>
            )}
            {canManageMembers && <TableHead className={`${thClass} text-right`}>{t('organizationMembers.actions')}</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {unifiedMembers.map((member) => (
            <TableRow key={member.id}>
              <TableCell className="py-3">
                <div className="flex items-center gap-3">
                  <UnifiedMemberAvatar member={member} />
                  <div>
                    <div className="text-sm font-medium">{getUnifiedMemberDisplayName(member, displayNameLabels)}</div>
                    {member.joinedDate && (
                      <div className="text-xs text-muted-foreground">
                        {t('organizationMembers.joined', { date: formatDate(member.joinedDate) })}
                      </div>
                    )}
                    {member.invitedDate && (
                      <div className="text-xs text-muted-foreground">
                        {t(member.type === 'gws_claim' ? 'organizationMembers.added' : 'organizationMembers.invited', { date: formatDate(member.invitedDate) })}
                      </div>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell className="py-3 font-mono text-sm">{member.email}</TableCell>
              <TableCell className="py-3">
                <UnifiedMemberRoleControl
                  member={member}
                  canManageMembers={canManageMembers}
                  onRoleChange={onRoleChange}
                  layout="desktop"
                />
              </TableCell>
              <TableCell className="py-3">
                {member.status === 'pending_gws' ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant={getUnifiedMemberStatusBadgeVariant(member.status)} className="capitalize cursor-help">
                        <div className="flex items-center gap-1">
                          {getStatusIcon(member.status)}
                          {statusLabel(member.status)}
                        </div>
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{t('organizationMembers.googlePendingHelp')}</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Badge variant={getUnifiedMemberStatusBadgeVariant(member.status)} className="capitalize">
                    <div className="flex items-center gap-1">
                      {getStatusIcon(member.status)}
                      {statusLabel(member.status)}
                    </div>
                  </Badge>
                )}
              </TableCell>
              {showQuickBooksColumn && (
                <TableCell className="py-3">
                  <UnifiedMemberQuickBooksControl
                    member={member}
                    context={permissionContext}
                    quickBooksPending={quickBooksPending}
                    onQuickBooksToggle={onQuickBooksToggle}
                    layout="desktop"
                  />
                </TableCell>
              )}
              {showPartsManagerColumn && (
                <TableCell className="py-3">
                  <UnifiedMemberPartsManagerControl
                    member={member}
                    context={permissionContext}
                    isPartsManager={member.userId ? partsManagerUserIds.has(member.userId) : false}
                    partsManagerPending={partsManagerPending}
                    onPartsManagerToggle={onPartsManagerToggle}
                    layout="desktop"
                  />
                </TableCell>
              )}
              {showPartsConsumerColumn && (
                <TableCell className="py-3">
                  <UnifiedMemberPartsConsumerControl
                    member={member}
                    context={permissionContext}
                    isPartsConsumer={member.userId ? partsConsumerUserIds.has(member.userId) : false}
                    partsConsumerPending={partsConsumerPending}
                    onPartsConsumerToggle={onPartsConsumerToggle}
                    layout="desktop"
                  />
                </TableCell>
              )}
              {canManageMembers && (
                <TableCell className="py-3 text-right">
                  <UnifiedMemberRowActions
                    member={member}
                    canManageMembers={canManageMembers}
                    {...rowActionProps}
                  />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
