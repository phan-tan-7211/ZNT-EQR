import type { TeamRole } from '@/types/permissions';

type Translate = (key: string) => string;

/** Team roles a member can be given from the team member dialogs (owner is never assignable there). */
export type AssignableTeamRole = Exclude<TeamRole, 'owner'>;

export type TeamRoleOption = {
  value: AssignableTeamRole;
  label: string;
  description: string;
};

/**
 * Which role descriptions to show: `add` when adding a member to a team,
 * `change` when changing the role of an existing member.
 */
export type TeamRoleOptionsVariant = 'add' | 'change';

export function getTeamRoleOptions(t: Translate, variant: TeamRoleOptionsVariant): TeamRoleOption[] {
  const isAdd = variant === 'add';
  return [
    { value: 'manager', label: t('teamsDetail.roles.manager'), description: t('teamsDetail.roleDescriptions.manager') },
    { value: 'technician', label: t('teamsDetail.roles.technician'), description: t('teamsDetail.roleDescriptions.technician') },
    {
      value: 'requestor',
      label: t('teamsDetail.roles.requestor'),
      description: t(isAdd ? 'teamsDetail.roleDescriptions.requestorAdd' : 'teamsDetail.roleDescriptions.requestor'),
    },
    {
      value: 'viewer',
      label: t('teamsDetail.roles.viewer'),
      description: t(isAdd ? 'teamsDetail.roleDescriptions.viewerAdd' : 'teamsDetail.roleDescriptions.viewer'),
    },
  ];
}
