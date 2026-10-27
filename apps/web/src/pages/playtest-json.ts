import Ajv2020 from 'ajv/dist/2020.js';
import { RULES } from '@sheep/game-core';
import { apiDocument } from '@sheep/contracts';
import type { Schema } from '../api';
import { key } from '../api';
import type { practiceProcess } from './operations-model';

const ajv = new Ajv2020({ strict: false, allErrors: true });
ajv.addFormat('date-time', { type: 'string', validate: value => { try { return new Date(value).toISOString() === value; } catch { return false; } } });
ajv.addFormat('uuid', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu);
ajv.addSchema(apiDocument, 'contract');
const createSchema = ajv.compile<Schema<'PlaytestRunCreateRequest'>>({ $ref: 'contract#/components/schemas/PlaytestRunCreateRequest' });
const processSchema = ajv.compile<Schema<'PlaytestProcess'>>({ $ref: 'contract#/components/schemas/PlaytestProcess' });
type Metadata = Omit<ReturnType<typeof practiceProcess>, keyof Schema<'PlaytestProcess'>>;
const metadataKeys = ['game_id', 'build', 'started_at', 'ended_at', 'seed', 'entry_label', 'browser_label'];
const metadataSchema = ajv.compile<Metadata>({ type: 'object', additionalProperties: false, properties: Object.fromEntries(metadataKeys.map(field => [field, { $ref: `contract#/components/schemas/PlaytestRunCreateRequest/properties/${field}` }])), required: metadataKeys });
function parseObject(raw: string): Record<string, unknown> {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('请填写一个完整 JSON 记录对象。');
  return value as Record<string, unknown>;
}
export function parsePlaytestJSON(raw: string): Schema<'PlaytestRunCreateRequest'> {
  const value = { ...parseObject(raw), idempotency_key: key() };
  if (!createSchema(value)) throw new Error(`试玩记录未通过契约校验：${ajv.errorsText(createSchema.errors, { separator: '；' })}`);
  if (value.seed !== RULES.common.official_logic_seed_by_game[value.game_id]) throw new Error('试玩 seed 必须匹配本版冻结游戏初值。');
  return value;
}
export function parsePracticeJSON(raw: string): ReturnType<typeof practiceProcess> {
  const value = parseObject(raw);
  const metadata = Object.fromEntries(metadataKeys.map(field => [field, value[field]]));
  const { end_tick, end_reason, inputs } = value;
  const process = { end_tick, end_reason, inputs };
  if (Object.keys(value).some(field => ![...metadataKeys, 'end_tick', 'end_reason', 'inputs'].includes(field)) || !metadataSchema(metadata) || !processSchema(process)) throw new Error('练习过程格式不符，需完整自然终局、实际时轴和原始输入，不能包含分数字段。');
  return { ...metadata, ...process };
}
