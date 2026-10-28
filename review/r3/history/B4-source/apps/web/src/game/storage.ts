import type { Schema } from '../api';

export interface RunRecord {
  version: 1;
  start: Schema<'StartRequest'>;
  session: Schema<'Session'> | null;
  inputs: Schema<'GameInput'>[];
  processedTick: number;
  logDigest?: string;
  sealed: Schema<'FinishRequest'> | null;
  abandon?: Schema<'AbandonRequest'>;
}
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('sheep-onsite-v2.1', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('records');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('本地日志存储不可用，尚未使用正式机会。'));
  });
}
export async function putRecord<T>(id: string, value: T): Promise<void> {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('records', 'readwrite');
    tx.objectStore('records').put(value, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(new Error('日志写入失败，请保留当前页面。'));
    tx.onabort = () => reject(new Error('日志写入中止，请保留当前页面。'));
  });
  db.close();
}
export async function getRecord<T>(id: string): Promise<T | undefined> {
  const db = await open();
  const value = await new Promise<T | undefined>((resolve, reject) => {
    const request = db.transaction('records', 'readonly').objectStore('records').get(id);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(new Error('日志无法读取，请联系现场工作人员复核。'));
  });
  db.close();
  return value;
}
export async function preflightStorage(): Promise<void> {
  const probe = crypto.randomUUID();
  await putRecord('preflight', probe);
  if (await getRecord('preflight') !== probe) throw new Error('本地日志预检失败，尚未使用机会。');
}
