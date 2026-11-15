import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '@/i18n';
import { useUnifiedMemberLabels } from './useUnifiedMemberLabels';

const labels = {
  pendingInvite: 'Chờ chấp nhận lời mời',
  pendingGoogle: 'Chờ đăng ký qua Google Workspace',
  unknown: 'Chưa rõ',
};

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
