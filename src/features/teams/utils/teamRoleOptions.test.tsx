import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { I18nProvider, useI18n, type Language } from '@/i18n';
import { getTeamRoleOptions, type TeamRoleOptionsVariant } from './teamRoleOptions';

/** Resolves the options through the real provider and resources in `language`. */
const renderTeamRoleOptions = (language: Language, variant: TeamRoleOptionsVariant) => {
  window.localStorage.setItem('znteqr-language', language);
  const { result } = renderHook(() => getTeamRoleOptions(useI18n().t, variant), {
    wrapper: I18nProvider,
  });
  return result.current;
};

const copy: Record<
  Language,
  {
    labels: string[];
    manager: string;
    technician: string;
    requestor: string;
    requestorAdd: string;
    viewer: string;
    viewerAdd: string;
  }
> = {
  en: {
    labels: ['Manager', 'Technician', 'Requestor', 'Viewer'],
    manager: 'Can manage team members and assign work orders',
    technician: 'Can update work orders and record maintenance',
    requestor: 'Can create work orders and view assigned equipment',
    requestorAdd: 'Can create and submit work orders',
    viewer: 'Read-only access to team resources',
    viewerAdd: 'Can view work orders and equipment but not modify',
  },
  vi: {
    labels: ['Quản lý', 'Kỹ thuật viên', 'Người yêu cầu', 'Người xem'],
    manager: 'Có thể quản lý thành viên và phân công lệnh công việc',
    technician: 'Có thể cập nhật lệnh công việc và ghi nhận bảo trì',
    requestor: 'Có thể tạo lệnh công việc và xem thiết bị được phân công',
    requestorAdd: 'Có thể tạo và gửi lệnh công việc',
    viewer: 'Chỉ có quyền xem tài nguyên nhóm',
    viewerAdd: 'Có thể xem lệnh công việc và thiết bị nhưng không được sửa',
  },
  ko: {
    labels: ['관리자', '기술자', '요청자', '조회자'],
    manager: '구성원을 관리하고 작업 지시를 배정할 수 있습니다',
    technician: '작업 지시를 수정하고 유지보수 내역을 기록할 수 있습니다',
    requestor: '작업 지시를 생성하고 배정된 장비를 조회할 수 있습니다',
    requestorAdd: '작업 지시를 생성하고 제출할 수 있습니다',
    viewer: '팀 자료를 조회만 할 수 있습니다',
    viewerAdd: '작업 지시와 장비를 조회할 수 있으나 수정할 수 없습니다',
  },
};

const languages = ['en', 'vi', 'ko'] as const;

describe('getTeamRoleOptions', () => {
  it.each(languages)('lists the assignable team roles in order with their %s labels', (language) => {
    for (const variant of ['add', 'change'] as const) {
      const options = renderTeamRoleOptions(language, variant);
      expect(options.map((option) => option.value)).toEqual(['manager', 'technician', 'requestor', 'viewer']);
      expect(options.map((option) => option.label)).toEqual(copy[language].labels);
    }
  });

  it.each(languages)('uses the add-member descriptions for requestor and viewer when adding a member (%s)', (language) => {
    const { manager, technician, requestorAdd, viewerAdd } = copy[language];
    expect(renderTeamRoleOptions(language, 'add').map((option) => option.description)).toEqual([
      manager,
      technician,
      requestorAdd,
      viewerAdd,
    ]);
  });

  it.each(languages)('uses the role-change descriptions when changing a member role (%s)', (language) => {
    const { manager, technician, requestor, viewer } = copy[language];
    expect(renderTeamRoleOptions(language, 'change').map((option) => option.description)).toEqual([
      manager,
      technician,
      requestor,
      viewer,
    ]);
  });
});
