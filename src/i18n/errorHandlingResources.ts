import type { Language } from '@/i18n/I18nProvider';
import { resolvePreferredLanguage } from '@/i18n/languageStorage';

export const errorHandlingResources = {
  en: {
    unexpected: 'An unexpected error occurred',
    retryOrSupport: 'Please try again or contact support if the problem persists.',
    networkAction: 'Check your internet connection and try again.',
    permissionAction: 'Contact your administrator for access permissions.',
    validationAction: 'Please check your input and correct any errors.',
    serverAction: 'Our servers are experiencing issues. Please try again in a few minutes.',
    operationFailed: 'Operation Failed',
    contextFailed: '{{context}} Failed',
  },
  vi: {
    unexpected: 'Đã xảy ra lỗi không mong muốn',
    retryOrSupport: 'Vui lòng thử lại hoặc liên hệ bộ phận hỗ trợ nếu sự cố vẫn tiếp diễn.',
    networkAction: 'Kiểm tra kết nối Internet rồi thử lại.',
    permissionAction: 'Liên hệ quản trị viên để được cấp quyền truy cập.',
    validationAction: 'Kiểm tra lại dữ liệu nhập và sửa các lỗi rồi thử lại.',
    serverAction: 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau vài phút.',
    operationFailed: 'Thao tác thất bại',
    contextFailed: '{{context}} thất bại',
  },
  ko: {
    unexpected: '예기치 않은 오류가 발생했습니다',
    retryOrSupport: '다시 시도하거나 문제가 계속되면 지원팀에 문의하세요.',
    networkAction: '인터넷 연결을 확인한 후 다시 시도하세요.',
    permissionAction: '접근 권한은 관리자에게 문의하세요.',
    validationAction: '입력 내용을 확인하고 오류를 수정한 후 다시 시도하세요.',
    serverAction: '서버에 문제가 발생했습니다. 몇 분 후 다시 시도하세요.',
    operationFailed: '작업 실패',
    contextFailed: '{{context}} 실패',
  },
} as const;

export function resolveErrorHandlingLanguage(): Language {
  return resolvePreferredLanguage();
}

export function getErrorHandlingCopy(language = resolveErrorHandlingLanguage()) {
  return errorHandlingResources[language];
}

export function formatErrorHandlingCopy(template: string, context: string) {
  return template.replace('{{context}}', context);
}
