import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { I18nProvider, useI18n, type Language } from '@/i18n';
import {
  getWorkOrderListPriorityLabels,
  getWorkOrderListStatusLabels,
} from './workOrderI18nLabels';

/** Resolves the list labels through the real provider and resources in `language`. */
const renderListLabels = (language: Language) => {
  window.localStorage.setItem('znteqr-language', language);
  const { result } = renderHook(
    () => {
      const { t } = useI18n();
      return {
        status: getWorkOrderListStatusLabels(t),
        priority: getWorkOrderListPriorityLabels(t),
      };
    },
    { wrapper: I18nProvider },
  );
  return result.current;
};

const expectedStatusLabels: Record<Language, Record<string, string>> = {
  en: {
    submitted: 'Submitted',
    accepted: 'Accepted',
    assigned: 'Assigned',
    in_progress: 'In Progress',
    on_hold: 'On Hold',
    completed: 'Completed',
    cancelled: 'Cancelled',
  },
  vi: {
    submitted: 'Đã gửi',
    accepted: 'Đã chấp nhận',
    assigned: 'Đã giao',
    in_progress: 'Đang thực hiện',
    on_hold: 'Tạm dừng',
    completed: 'Hoàn thành',
    cancelled: 'Đã hủy',
  },
  ko: {
    submitted: '제출됨',
    accepted: '수락됨',
    assigned: '배정됨',
    in_progress: '진행 중',
    on_hold: '보류',
    completed: '완료',
    cancelled: '취소됨',
  },
};

const expectedPriorityLabels: Record<Language, Record<string, string>> = {
  en: { high: 'High', medium: 'Medium', low: 'Low' },
  vi: { high: 'Cao', medium: 'Trung bình', low: 'Thấp' },
  ko: { high: '높음', medium: '보통', low: '낮음' },
};

const languages = ['en', 'vi', 'ko'] as const;

describe('getWorkOrderListStatusLabels', () => {
  it.each(languages)('labels every work-order status with the %s list text', (language) => {
    expect(renderListLabels(language).status).toEqual(expectedStatusLabels[language]);
  });

  it('has no label for unknown statuses so callers can apply their own fallback', () => {
    expect(renderListLabels('en').status.mystery_status).toBeUndefined();
  });
});

describe('getWorkOrderListPriorityLabels', () => {
  it.each(languages)('labels every work-order priority with the %s list text', (language) => {
    expect(renderListLabels(language).priority).toEqual(expectedPriorityLabels[language]);
  });

  it('has no label for unknown priorities so callers can apply their own fallback', () => {
    expect(renderListLabels('en').priority.urgent).toBeUndefined();
  });
});
