import type { AnyNaturalConclusion } from '@sheep/game-core';
import { BUILD } from '@sheep/game-core';
import type { Schema } from '../api';
export function formatCents(value: string | number | null): string {
  if (value === null) return '成本未知';
  if (typeof value === 'number' && !Number.isSafeInteger(value) || !/^(0|[1-9][0-9]{0,29})$/u.test(String(value))) throw new Error('金额必须是非负整数分。');
  const cents = BigInt(value);
  return `${(cents / 100n).toLocaleString('zh-CN')}.${String(cents % 100n).padStart(2, '0')} 元`;
}
export type PracticeMetadata = Pick<Schema<'PlaytestRunCreateRequest'>, 'started_at' | 'ended_at' | 'seed' | 'entry_label' | 'browser_label'>;
export function practiceProcess(conclusion: AnyNaturalConclusion | null, inputs: readonly Schema<'GameInput'>[], metadata?: PracticeMetadata): { game_id: Schema<'GameId'>; build: Schema<'BuildBinding'> } & Schema<'PlaytestProcess'> & PracticeMetadata {
  if (!conclusion) throw new Error('只有自然终局才能下载完整过程。');
  if (!metadata) throw new Error('缺少本局实际开始、结束和浏览器记录，不能反推时轴。');
  return { game_id: conclusion.game_id, build: { ...BUILD }, end_tick: conclusion.end_tick, end_reason: conclusion.end_reason, inputs: structuredClone([...inputs]), ...metadata };
}
