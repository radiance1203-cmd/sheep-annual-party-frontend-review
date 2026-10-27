import { ApiError } from '../api';

export function pendingRedemptionKey(eventId: string, participantId: string): string {
  return `pending-redemption:${eventId}:${participantId}`;
}

// service.redeem checks these after both idempotency lookups and before its
// INSERT, within a transaction. Other non-retryable errors are not evidence
// that this request never committed (e.g. auth or an idempotency conflict).
const rejectedBeforeCreation = new Set(['OUT_OF_STOCK', 'INSUFFICIENT_POINTS', 'CLAIMS_FROZEN', 'CLAIM_WINDOW_CLOSED', 'PERSON_LIMIT_REACHED']);
export function isDefinitiveRedemptionRejection(cause: unknown): boolean {
  return cause instanceof ApiError && !cause.retryable && rejectedBeforeCreation.has(cause.code);
}
