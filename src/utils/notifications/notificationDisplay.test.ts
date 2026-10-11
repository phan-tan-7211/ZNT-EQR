import { describe, expect, it } from 'vitest';
import { toolingInsightsResources } from '@/i18n/toolingInsightsResources';
import { toolingResources } from '@/i18n/toolingResources';
import {
  getNotificationEmoji,
  getNotificationTypeLabel,
  localizeNotificationContent,
  navigateForNotification,
  notificationHasNavigableAction,
  resolveNotificationDestination,
} from '@/utils/notifications/notificationDisplay';

describe('notificationDisplay destination re-exports', () => {
  it('keeps destination helpers available from the display module', () => {
    expect(typeof resolveNotificationDestination).toBe('function');
    expect(typeof notificationHasNavigableAction).toBe('function');
    expect(typeof navigateForNotification).toBe('function');
  });
});

describe('notificationDisplay labels', () => {
  it('labels export_ready instead of falling back to General', () => {
    expect(getNotificationTypeLabel('export_ready')).toBe('Export Ready');
    expect(getNotificationEmoji('export_ready')).toBe('📊');
  });
});

describe('notificationDisplay tooling alerts', () => {
  it.each([
    ['tooling_life_warning', 'Tool Life Warning', '⚠️'],
    ['tooling_life_limit', 'Tool Life Limit', '🛑'],
    ['tooling_quarantined', 'Tool Quarantined', '🚧'],
  ])('labels %s', (type, label, emoji) => {
    expect(getNotificationTypeLabel(type)).toBe(label);
    expect(getNotificationEmoji(type)).toBe(emoji);
  });
});

type Params = Record<string, string | number>;

/** Minimal t() over the vi tooling resources (namespaces registered in I18nProvider). */
function viTranslate(key: string, params?: Params): string {
  const tree = { ...toolingResources.vi, ...toolingInsightsResources.vi };
  const value = key
    .split('.')
    .reduce<unknown>((node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined), tree);
  if (typeof value !== 'string') return key;
  return value.replace(/{{\s*(\w+)\s*}}/g, (_match, token: string) => String(params?.[token] ?? `{{${token}}}`));
}

describe('localizeNotificationContent', () => {
  const lifeLimit = {
    type: 'tooling_life_limit',
    title: 'Tool life limit reached',
    message: 'Weld jig (TL-1) reached its life limit (1000 / 1000 cycles).',
    data: {
      tooling_id: 'tool-1',
      tool_name: 'Weld jig',
      management_code: 'TL-1',
      cumulative_usage: 1000,
      warning_limit: 800,
      life_limit: 1000,
      usage_unit: 'cycles',
    },
  };

  it('keeps the stored English text for English and for non-tooling types', () => {
    expect(localizeNotificationContent(lifeLimit, viTranslate, 'en')).toEqual({
      title: lifeLimit.title,
      message: lifeLimit.message,
    });
    const general = { type: 'general', title: 'Hello', message: 'World', data: {} };
    expect(localizeNotificationContent(general, viTranslate, 'vi')).toEqual({ title: 'Hello', message: 'World' });
  });

  it('rebuilds tooling alerts from data in Vietnamese with a localized unit', () => {
    const result = localizeNotificationContent(lifeLimit, viTranslate, 'vi');
    expect(result.title).toBe('Dụng cụ đạt giới hạn tuổi thọ');
    expect(result.message).toContain('Weld jig (TL-1)');
    expect(result.message).toContain('chu kỳ');
    expect(result.message).not.toContain('{{');
  });

  it('localizes the quarantine alert without usage figures', () => {
    const result = localizeNotificationContent(
      { ...lifeLimit, type: 'tooling_quarantined', title: 'Tool quarantined', message: 'stored' },
      viTranslate,
      'vi',
    );
    expect(result).toEqual({
      title: 'Dụng cụ bị cách ly',
      message: 'Weld jig (TL-1) đã bị cách ly và không thể cấp phát cho đến khi được kiểm tra và đưa trở lại sử dụng.',
    });
  });

  it('falls back to the stored text when the payload or translation is missing', () => {
    const noName = { ...lifeLimit, data: { tooling_id: 'tool-1' } };
    expect(localizeNotificationContent(noName, viTranslate, 'vi').title).toBe(lifeLimit.title);

    const untranslated = (key: string) => key;
    expect(localizeNotificationContent(lifeLimit, untranslated, 'ko')).toEqual({
      title: lifeLimit.title,
      message: lifeLimit.message,
    });
  });
});
