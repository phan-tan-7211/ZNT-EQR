import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { UnifiedMember } from '@/features/organization/utils/buildUnifiedMembers';
import { I18nProvider } from '@/i18n';
import { getUnifiedMemberDisplayName, useUnifiedMemberLabels } from './unifiedMemberPresentation';

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

describe('useUnifiedMemberLabels', () => {
  it('maps known roles and statuses to English labels and passes unknown roles through', () => {
    const { result } = renderHook(() => useUnifiedMemberLabels());

    expect(result.current.roleLabel('owner')).toBe('Owner');
    expect(result.current.roleLabel('admin')).toBe('Admin');
    expect(result.current.roleLabel('member')).toBe('Member');
    expect(result.current.roleLabel('auditor')).toBe('auditor');
    expect(result.current.statusLabel('active')).toBe('Active');
    expect(result.current.statusLabel('pending_invite')).toBe('Pending Invite');
    expect(result.current.statusLabel('pending_gws')).toBe('Awaiting Sign-up');
    expect(result.current.displayNameLabels).toEqual({
      pendingInvite: 'Pending Invite',
      pendingGoogle: 'Pending (Google Workspace)',
      unknown: 'Unknown',
    });
  });

  it('follows the active language', () => {
    window.localStorage.setItem('znteqr-language', 'vi');
    try {
      const { result } = renderHook(() => useUnifiedMemberLabels(), { wrapper: I18nProvider });

      expect(result.current.roleLabel('admin')).toBe('Quản trị viên');
      expect(result.current.statusLabel('pending_gws')).toBe('Chờ đăng ký');
      expect(result.current.displayNameLabels).toEqual(labels);
    } finally {
      window.localStorage.removeItem('znteqr-language');
    }
  });
});
