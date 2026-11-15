import { describe, expect, it } from 'vitest';
import type { UnifiedMember } from '@/features/organization/utils/buildUnifiedMembers';
import { getUnifiedMemberDisplayName } from './unifiedMemberPresentation';

const labels = {
  pendingInvite: 'Chờ chấp nhận lời mời',
  pendingGoogle: 'Chờ đăng ký qua Google Workspace',
  unknown: 'Chưa rõ',
};

const member = (type: UnifiedMember['type'], name: string): UnifiedMember => ({
  id: 'member-1',
  name,
  email: 'person@example.com',
  organizationRole: 'member',
  status: type === 'member' ? 'active' : type === 'invitation' ? 'pending_invite' : 'pending_gws',
  type,
});

describe('getUnifiedMemberDisplayName', () => {
  it('localizes generated names without overwriting real Google Workspace names', () => {
    expect(getUnifiedMemberDisplayName(member('invitation', 'Pending Invite'), labels)).toBe(labels.pendingInvite);
    expect(getUnifiedMemberDisplayName(member('gws_claim', 'Pending (Google Workspace)'), labels)).toBe(labels.pendingGoogle);
    expect(getUnifiedMemberDisplayName(member('gws_claim', 'An Nguyen'), labels)).toBe('An Nguyen');
    expect(getUnifiedMemberDisplayName(member('member', 'Unknown'), labels)).toBe(labels.unknown);
  });
});
