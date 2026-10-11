import { describe, expect, it } from 'vitest';
import {
  formatToolingNumber,
  toolingIssueBlockers,
  toolingLifePercent,
  toolingLifeTone,
  toolingRemainingLife,
} from '@/features/tooling/utils/toolingLife';

describe('toolingLifePercent', () => {
  it('returns null when there is no positive life limit', () => {
    expect(toolingLifePercent({ cumulative_usage: 10, life_limit: null })).toBeNull();
    expect(toolingLifePercent({ cumulative_usage: 10, life_limit: 0 })).toBeNull();
    expect(toolingLifePercent({ cumulative_usage: 10, life_limit: -5 })).toBeNull();
  });

  it('rounds to one decimal place', () => {
    expect(toolingLifePercent({ cumulative_usage: 1, life_limit: 3 })).toBe(33.3);
    expect(toolingLifePercent({ cumulative_usage: 2, life_limit: 3 })).toBe(66.7);
    expect(toolingLifePercent({ cumulative_usage: 0, life_limit: 1000 })).toBe(0);
  });

  it('can exceed 100 when usage is past the limit', () => {
    expect(toolingLifePercent({ cumulative_usage: 1500, life_limit: 1000 })).toBe(150);
  });

  it('coerces numeric strings returned by PostgREST numeric columns', () => {
    expect(
      toolingLifePercent({ cumulative_usage: '250' as unknown as number, life_limit: '1000' as unknown as number }),
    ).toBe(25);
  });
});

describe('toolingRemainingLife', () => {
  it('returns null without a life limit', () => {
    expect(toolingRemainingLife({ cumulative_usage: 5, life_limit: null })).toBeNull();
  });

  it('returns limit minus usage, including negative values past the limit', () => {
    expect(toolingRemainingLife({ cumulative_usage: 400, life_limit: 1000 })).toBe(600);
    expect(toolingRemainingLife({ cumulative_usage: 1200, life_limit: 1000 })).toBe(-200);
    expect(toolingRemainingLife({ cumulative_usage: 0, life_limit: 0 })).toBe(0);
  });
});

describe('toolingLifeTone', () => {
  it('is none when neither limit is configured', () => {
    expect(toolingLifeTone({ cumulative_usage: 99, life_limit: null, warning_limit: null })).toBe('none');
  });

  it('is ok below the warning limit', () => {
    expect(toolingLifeTone({ cumulative_usage: 10, life_limit: 100, warning_limit: 80 })).toBe('ok');
    expect(toolingLifeTone({ cumulative_usage: 10, life_limit: 100, warning_limit: null })).toBe('ok');
    expect(toolingLifeTone({ cumulative_usage: 10, life_limit: null, warning_limit: 80 })).toBe('ok');
  });

  it('is warning at or above the warning limit', () => {
    expect(toolingLifeTone({ cumulative_usage: 80, life_limit: 100, warning_limit: 80 })).toBe('warning');
    expect(toolingLifeTone({ cumulative_usage: 95, life_limit: null, warning_limit: 80 })).toBe('warning');
  });

  it('is limit at or above the life limit, taking precedence over warning', () => {
    expect(toolingLifeTone({ cumulative_usage: 100, life_limit: 100, warning_limit: 80 })).toBe('limit');
    expect(toolingLifeTone({ cumulative_usage: 120, life_limit: 100, warning_limit: null })).toBe('limit');
  });
});

describe('toolingIssueBlockers', () => {
  const ready = {
    is_issued: false,
    approval_status: 'approved' as const,
    usability_state: 'available' as const,
    condition: 'good' as const,
    life_limit_reached: false,
    inspection_overdue: false,
  };

  it('returns no blockers for an issuable tool', () => {
    expect(toolingIssueBlockers(ready)).toEqual([]);
  });

  it('reports each blocker individually', () => {
    expect(toolingIssueBlockers({ ...ready, is_issued: true })).toEqual(['issued']);
    expect(toolingIssueBlockers({ ...ready, approval_status: 'pending' })).toEqual(['not_approved']);
    expect(toolingIssueBlockers({ ...ready, usability_state: 'quarantined' })).toEqual(['not_usable']);
    expect(toolingIssueBlockers({ ...ready, condition: 'damaged' })).toEqual(['damaged']);
    expect(toolingIssueBlockers({ ...ready, life_limit_reached: true })).toEqual(['life_limit']);
    expect(toolingIssueBlockers({ ...ready, inspection_overdue: true })).toEqual(['inspection_overdue']);
  });

  it('does not block worn tools', () => {
    expect(toolingIssueBlockers({ ...ready, condition: 'worn' })).toEqual([]);
  });

  it('returns all blockers in a stable order', () => {
    expect(
      toolingIssueBlockers({
        is_issued: true,
        approval_status: 'pending',
        usability_state: 'retired',
        condition: 'damaged',
        life_limit_reached: true,
        inspection_overdue: true,
      }),
    ).toEqual(['issued', 'not_approved', 'not_usable', 'damaged', 'life_limit', 'inspection_overdue']);
  });
});

describe('formatToolingNumber', () => {
  it('returns an em dash for null, undefined and NaN', () => {
    expect(formatToolingNumber(null)).toBe('—');
    expect(formatToolingNumber(undefined)).toBe('—');
    expect(formatToolingNumber(Number.NaN)).toBe('—');
  });

  it('formats with locale grouping', () => {
    expect(formatToolingNumber(1234567, 'en-US')).toBe('1,234,567');
    expect(formatToolingNumber(0, 'en-US')).toBe('0');
    expect(formatToolingNumber(1234.5, 'de-DE')).toBe('1.234,5');
  });
});
