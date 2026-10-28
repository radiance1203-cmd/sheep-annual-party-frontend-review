import { ApiError } from '../api';
import { getRecord, putRecord } from '../game/storage';

export async function durable<T>(name: string, body: T, action: (value: T) => Promise<unknown>): Promise<void> {
  const stored = await getRecord<T | null>(`admin:${name}`);
  const original = stored ?? body;
  await putRecord(`admin:${name}`, original);
  try { await action(original); await putRecord(`admin:${name}`, null); }
  catch (error) { if (error instanceof ApiError && !error.retryable && error.code !== 'COMMIT_STATUS_UNKNOWN') await putRecord(`admin:${name}`, null); throw error; }
}
