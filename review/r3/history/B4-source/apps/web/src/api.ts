import createClient from 'openapi-fetch';
import type { components, paths } from '@sheep/contracts';
import { ServerClock } from './game/timeline';

export type Schema<K extends keyof components['schemas']> = components['schemas'][K];
export const clock = new ServerClock();
let csrf = '';
export function setCsrf(value: string): void { csrf = value; }
export class ApiError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  constructor(error: Schema<'ErrorEnvelope'>['error']) { super(error.message); this.code = error.code; this.retryable = error.retryable; }
}
// Cookie and CSRF transport are installed centrally; all bodies and response types
// still derive directly from the generated path operations.
type TransportPaths = { [P in keyof paths]: { [M in keyof paths[P]]: paths[P][M] extends { parameters: infer Parameters } ? Omit<paths[P][M], 'parameters'> & { parameters: Omit<Parameters, 'header'> } : paths[P][M] } };
export const api = createClient<TransportPaths>({
  credentials: 'same-origin',
  fetch: async (request: Request) => {
    const sent = performance.now();
    request.headers.set('X-CSRF-Token', csrf);
    const response = await fetch(request, { cache: 'no-store' });
    const received = performance.now();
    const raw: unknown = await response.clone().json().catch(() => null);
    if (typeof raw === 'object' && raw !== null && 'server_now' in raw && typeof raw.server_now === 'string') clock.sample(Date.parse(raw.server_now), sent, received);
    return response;
  },
});
export function unwrap<T>(result: { data?: T; error?: Schema<'ErrorEnvelope'> }): T {
  if (result.error) throw new ApiError(result.error.error);
  if (result.data === undefined) throw new Error('服务器未返回完整数据，请恢复原请求。');
  return result.data;
}
export function message(error: unknown): string { return error instanceof Error ? error.message : '连接中断，请恢复原请求。'; }
export function secret(): string {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}
export function key(): string { return crypto.randomUUID(); }
export const gameNames = { stack: '羊羊叠高高', runner: '羊羊跨栏', herd: '赶羊入圈' } as const;
export const phaseNames = { CHECK_IN: '签到与练习', PLAYING: '正式挑战中', DRAINING: '正在收尾核验', REDEEMING: '礼品兑换开放', CLOSED: '活动已结束' } as const;
export function formatTime(value: string | null): string { return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '尚未公布'; }
