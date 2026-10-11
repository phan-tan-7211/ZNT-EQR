import { describe, expect, it } from 'vitest';
import { extractToolingErrorCode, toolingErrorMessage } from '@/features/tooling/utils/toolingErrors';

const t = (key: string) => `t:${key}`;

describe('extractToolingErrorCode', () => {
  it('reads the code from a PostgrestError-like object message', () => {
    const error = { message: 'TOOLING_ALREADY_ISSUED', code: '23505', details: null, hint: null };
    expect(extractToolingErrorCode(error)).toBe('TOOLING_ALREADY_ISSUED');
  });

  it('finds the code inside a longer message', () => {
    expect(extractToolingErrorCode({ message: 'ERROR: TOOLING_LIFE_LIMIT_REACHED (P0001)' })).toBe('TOOLING_LIFE_LIMIT_REACHED');
  });

  it('reads the code from a plain string and from an Error instance', () => {
    expect(extractToolingErrorCode('TOOLING_NOT_APPROVED')).toBe('TOOLING_NOT_APPROVED');
    expect(extractToolingErrorCode(new Error('TOOLING_DISPOSITION_REQUIRED'))).toBe('TOOLING_DISPOSITION_REQUIRED');
  });

  it('returns null for unknown TOOLING_ codes and unrelated errors', () => {
    expect(extractToolingErrorCode({ message: 'TOOLING_SOMETHING_NEW' })).toBeNull();
    expect(extractToolingErrorCode({ message: 'network down' })).toBeNull();
    expect(extractToolingErrorCode(null)).toBeNull();
    expect(extractToolingErrorCode(undefined)).toBeNull();
    expect(extractToolingErrorCode(42)).toBeNull();
  });
});

describe('toolingErrorMessage', () => {
  it('maps known codes to tooling.errors keys', () => {
    expect(toolingErrorMessage({ message: 'TOOLING_ALREADY_ISSUED', code: '23505' }, t)).toBe('t:tooling.errors.TOOLING_ALREADY_ISSUED');
    expect(toolingErrorMessage('TOOLING_INCOMPATIBLE_CONTEXT', t)).toBe('t:tooling.errors.TOOLING_INCOMPATIBLE_CONTEXT');
  });

  it('maps Postgres unique violations without a tooling code to duplicateCode', () => {
    expect(toolingErrorMessage({ message: 'duplicate key value violates unique constraint', code: '23505' }, t)).toBe(
      't:tooling.errors.duplicateCode',
    );
  });

  it('maps insufficient_privilege to the permission message', () => {
    expect(toolingErrorMessage({ message: 'permission denied for table', code: '42501' }, t)).toBe(
      't:tooling.errors.TOOLING_PERMISSION_DENIED',
    );
  });

  it('falls back to the generic message for unknown errors', () => {
    expect(toolingErrorMessage({ message: 'boom', code: 'XX000' }, t)).toBe('t:tooling.errors.generic');
    expect(toolingErrorMessage(new Error('boom'), t)).toBe('t:tooling.errors.generic');
    expect(toolingErrorMessage(undefined, t)).toBe('t:tooling.errors.generic');
  });
});
