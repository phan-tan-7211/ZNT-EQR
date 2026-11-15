
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Card,
  CardContent,
  Avatar,
  AvatarImage,
  AvatarFallback,
} from '@/features/teams/components/teamManagementDialogUi';
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTeamMembers } from '@/features/teams/hooks/useTeamManagement';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useToast } from '@/hooks/use-toast';
import { TeamWithMembers } from '@/features/teams/services/teamService';
import { TeamRoleSelect } from '@/features/teams/components/TeamRoleSelect';
import { getTeamRoleOptions } from '@/features/teams/components/teamRoleOptions';

import { useI18n } from '@/i18n';

interface AddTeamMemberDialogProps {
  open: boolean;
  onClose: () => void;
  team: TeamWithMembers;
}

const AddTeamMemberDialog: React.FC<AddTeamMemberDialogProps> = ({ 
  open, 
  onClose, 
  team 
}) => {
  const { t } = useI18n();
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<'manager' | 'technician' | 'requestor' | 'viewer'>('technician');
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  
  const { availableUsers, addMember } = useTeamMembers(team?.id, currentOrganization?.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser) {
      toast({
        title: t('teamsDetail.error'),
        description: t('teamsDetail.selectUserError'),
        variant: "destructive"
      });
      return;
    }

    try {
      await addMember.mutateAsync({
        teamId: team.id,
        userId: selectedUser,
        role: selectedRole,
      });
      
      setSelectedUser('');
      setSelectedRole('technician');
      onClose();
    } catch {
      // Error is handled by the mutation
    }
  };

  const roleOptions = getTeamRoleOptions(t, 'add');

  const isLoading = availableUsers.isLoading;
  const users = availableUsers.data || [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('teamsDetail.addMemberTitle')}</DialogTitle>
          <DialogDescription>
            {t('teamsDetail.addMemberDescription', { name: team.name })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user">{t('teamsDetail.selectUserLabel')}</Label>
                {isLoading ? (
                  <div className="text-sm text-muted-foreground">{t('teamsDetail.loadingUsers')}</div>
                ) : users.length === 0 ? (
                  <div className="text-sm text-muted-foreground">{t('teamsDetail.noUsers')}</div>
                ) : (
                  <Select value={selectedUser} onValueChange={setSelectedUser} required>
                    <SelectTrigger>
                      <SelectValue placeholder={t('teamsDetail.selectUser')} />
                    </SelectTrigger>
                    <SelectContent>
                      <ScrollArea className="h-48">
                        {users.map((user) => (
                          <SelectItem key={user.user_id} value={user.user_id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                {(user.profiles as { avatar_url?: string | null })?.avatar_url && (
                                  <AvatarImage src={(user.profiles as { avatar_url?: string | null }).avatar_url!} alt={user.profiles?.name || t('teamsDetail.user')} />
                                )}
                                <AvatarFallback className="text-xs">
                                  {(user.profiles?.name || 'U').split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{user.profiles?.name || t('teamsDetail.unknown')}</div>
                                <div className="text-sm text-muted-foreground">{user.profiles?.email}</div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                )}
              </div>

              <TeamRoleSelect
                label={t('teamsDetail.teamRoleLabel')}
                value={selectedRole}
                onValueChange={(value) =>
                  setSelectedRole(value as 'manager' | 'technician' | 'requestor' | 'viewer')
                }
                options={roleOptions}
                required
              />
            </CardContent>
          </Card>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('teamsDetail.cancel')}
            </Button>
            <Button 
              type="submit" 
              disabled={!selectedUser || addMember.isPending}
            >
              {addMember.isPending ? t('teamsDetail.adding') : t('teamsDetail.addMember')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTeamMemberDialog;
