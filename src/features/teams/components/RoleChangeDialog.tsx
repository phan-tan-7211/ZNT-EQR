
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Button,
  Card,
  CardContent,
  Avatar,
  AvatarImage,
  AvatarFallback,
} from '@/features/teams/components/teamManagementDialogUi';
import { TeamWithMembers } from '@/features/teams/services/teamService';
import { useTeamMembers } from '@/features/teams/hooks/useTeamManagement';
import { useOrganization } from '@/contexts/OrganizationContext';
import { logger } from '@/utils/logger';
import { TeamRoleSelect } from '@/features/teams/components/TeamRoleSelect';
import { getTeamRoleOptions } from '@/features/teams/components/teamRoleOptions';

import { useI18n } from '@/i18n';

type TeamRole = 'manager' | 'technician' | 'requestor' | 'viewer';

type RoleChangeMember = (TeamWithMembers['members'][number] & {
  name?: string | null;
  email?: string | null;
}) | null;

interface RoleChangeDialogProps {
  open: boolean;
  onClose: () => void;
  member: RoleChangeMember;
  team: TeamWithMembers;
}

const RoleChangeDialog: React.FC<RoleChangeDialogProps> = ({ 
  open, 
  onClose, 
  member,
  team 
}) => {
  const { t } = useI18n();
  const { currentOrganization } = useOrganization();
  const { updateRole } = useTeamMembers(team.id, currentOrganization?.id);
  const memberUserId = member?.user_id;
  const memberRole = member?.role;
  const [selectedRole, setSelectedRole] = useState<TeamRole | ''>(
    (memberRole as TeamRole) ?? ''
  );

  useEffect(() => {
    if (!open) return;
    setSelectedRole((memberRole as TeamRole) ?? '');
  }, [open, memberUserId, memberRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!member || !selectedRole) return;

    try {
      await updateRole.mutateAsync({
        teamId: team.id,
        userId: member.user_id,
        role: selectedRole
      });
      onClose();
    } catch (error) {
      logger.error('Failed to update member role', error);
      toast.error(t('teamsDetail.roleUpdateError'));
    }
  };

  const roleOptions = getTeamRoleOptions(t, 'change');

  if (!member) return null;

  // Handle both nested and direct member data structures
  const memberName = member.profiles?.name || member.name || t('teamsDetail.unknown');
  const memberEmail = member.profiles?.email || member.email || t('teamsDetail.noEmail');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('teamsDetail.changeRoleTitle')}</DialogTitle>
          <DialogDescription>
            {t('teamsDetail.changeRoleDescription', { name: memberName })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardContent className="pt-4 space-y-4">
              {/* Member Info */}
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Avatar className="h-10 w-10">
                  {(member?.profiles as { avatar_url?: string | null })?.avatar_url && (
                    <AvatarImage src={(member?.profiles as { avatar_url?: string | null }).avatar_url!} alt={memberName} />
                  )}
                  <AvatarFallback>
                    {memberName.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{memberName}</p>
                  <p className="text-sm text-muted-foreground">{memberEmail}</p>
                </div>
              </div>

              <TeamRoleSelect
                label={t('teamsDetail.newRoleLabel')}
                value={selectedRole}
                onValueChange={(value) => {
                  const nextRole = roleOptions.find((option) => option.value === value)?.value;
                  if (nextRole) {
                    setSelectedRole(nextRole);
                  }
                }}
                options={roleOptions}
                required
              />

              {selectedRole !== member.role && (
                <div className="p-3 bg-info/10 border border-info/30 rounded-lg">
                  <p className="text-sm text-info">
                    <strong>{t('teamsDetail.roleChange')}</strong> {t(`teamsDetail.roles.${member.role}`)} → {t(`teamsDetail.roles.${selectedRole}`)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('teamsDetail.cancel')}
            </Button>
            <Button 
              type="submit"
              disabled={selectedRole === member.role || updateRole.isPending}
            >
              {updateRole.isPending ? t('teamsDetail.updating') : t('teamsDetail.updateRole')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RoleChangeDialog;

