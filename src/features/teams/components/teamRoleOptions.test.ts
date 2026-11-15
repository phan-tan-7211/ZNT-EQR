import { describe, expect, it } from 'vitest';
import { getTeamRoleOptions } from './teamRoleOptions';

const t = (key: string) => `t:${key}`;

describe('getTeamRoleOptions', () => {
  it('lists the assignable team roles in order with their labels', () => {
    for (const variant of ['add', 'change'] as const) {
      const options = getTeamRoleOptions(t, variant);
      expect(options.map((option) => option.value)).toEqual(['manager', 'technician', 'requestor', 'viewer']);
      expect(options.map((option) => option.label)).toEqual([
        't:teamsDetail.roles.manager',
        't:teamsDetail.roles.technician',
        't:teamsDetail.roles.requestor',
        't:teamsDetail.roles.viewer',
      ]);
    }
  });

  it('uses the add-member descriptions for requestor and viewer when adding a member', () => {
    expect(getTeamRoleOptions(t, 'add').map((option) => option.description)).toEqual([
      't:teamsDetail.roleDescriptions.manager',
      't:teamsDetail.roleDescriptions.technician',
      't:teamsDetail.roleDescriptions.requestorAdd',
      't:teamsDetail.roleDescriptions.viewerAdd',
    ]);
  });

  it('uses the role-change descriptions when changing a member role', () => {
    expect(getTeamRoleOptions(t, 'change').map((option) => option.description)).toEqual([
      't:teamsDetail.roleDescriptions.manager',
      't:teamsDetail.roleDescriptions.technician',
      't:teamsDetail.roleDescriptions.requestor',
      't:teamsDetail.roleDescriptions.viewer',
    ]);
  });
});
