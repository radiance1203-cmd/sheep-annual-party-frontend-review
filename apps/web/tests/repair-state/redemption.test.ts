import { describe, expect, test } from 'vitest';
import { ApiError } from '../../src/api';
import { isDefinitiveRedemptionRejection, pendingRedemptionKey } from '../../src/repair-state/redemption';

describe('redemption persistence boundary', () => {
  test.each(['OUT_OF_STOCK', 'INSUFFICIENT_POINTS', 'CLAIMS_FROZEN', 'CLAIM_WINDOW_CLOSED', 'PERSON_LIMIT_REACHED'] as const)('%s is definitive only when nonretryable', code => {
    expect(isDefinitiveRedemptionRejection(new ApiError({ code, message: code, retryable: false }))).toBe(true);
    expect(isDefinitiveRedemptionRejection(new ApiError({ code, message: code, retryable: true }))).toBe(false);
  });
  test.each(['UNAUTHENTICATED', 'FORBIDDEN', 'IDEMPOTENCY_CONFLICT', 'NOT_FOUND', 'COMMIT_STATUS_UNKNOWN', 'SERVER_BUSY'] as const)('%s preserves the original request even if nonretryable', code => {
    expect(isDefinitiveRedemptionRejection(new ApiError({ code, message: code, retryable: false }))).toBe(false);
  });
  test('network errors and unknown values preserve original request', () => {
    expect(isDefinitiveRedemptionRejection(new TypeError('Failed to fetch'))).toBe(false);
    expect(isDefinitiveRedemptionRejection(null)).toBe(false);
  });
  test('event and participant both scope persistence', () => {
    expect(new Set([pendingRedemptionKey('eventA', 'personA'), pendingRedemptionKey('eventA', 'personB'), pendingRedemptionKey('eventB', 'personA')]).size).toBe(3);
  });
});
