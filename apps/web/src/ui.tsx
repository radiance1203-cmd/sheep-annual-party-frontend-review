import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ApiError, clock, message } from './api';
import qrcode from 'qrcode-generator';
import { z } from 'zod';

export function Notice({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return <div className={`notice ${error ? 'error' : ''}`} role={error ? 'alert' : 'status'}>{children}</div>;
}
export function Panel({ title, children }: { title?: string; children: ReactNode }) {
  return <section className="panel">{title && <h2 className="panel-title">{title}</h2>}{children}</section>;
}
export function useResource<T>(load: () => Promise<T>, identity: string, refreshSeconds = 0) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    const fetchData = () => { void load().then(value => { if (active) { setData(value); setError(''); } }).catch(cause => { if (active) { setError(message(cause)); if (cause instanceof ApiError && cause.code === 'UNAUTHENTICATED') setData(undefined); } }); };
    fetchData();
    const timer = refreshSeconds ? window.setInterval(fetchData, refreshSeconds * 1000) : undefined;
    return () => { active = false; if (timer) clearInterval(timer); };
    // identity expresses the entire remote resource identity; callers keep reads side-effect free.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity, revision, refreshSeconds]);
  return { data, error, refresh: () => setRevision(value => value + 1) };
}
export function useMutation() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  async function run(action: () => Promise<void>): Promise<void> {
    if (pending) return;
    setPending(true); setError(''); setSuccess('');
    try { await action(); setSuccess('服务器已确认操作。'); } catch (cause) { setError(message(cause)); } finally { setPending(false); }
  }
  return { pending, error, success, run };
}
export function MutationStatus({ state }: { state: ReturnType<typeof useMutation> }) {
  return <>{state.pending && <Notice>正在提交，请保留页面。结果不明时使用原请求重试。</Notice>}{state.error && <Notice error>{state.error}</Notice>}{state.success && <Notice>{state.success}</Notice>}</>;
}
export function JsonDetails({ value }: { value: unknown }) { return <details><summary>查看服务器记录</summary><pre>{JSON.stringify(value, null, 2)}</pre></details>; }
export function QrCode({ value, label }: { value: string; label: string }) {
  const qr = qrcode(0, 'M'); qr.addData(value); qr.make();
  return <img className="qr-code" src={qr.createDataURL(4, 16)} alt={label} width={200} height={200} />;
}
export function Countdown({ deadline }: { deadline: string }) {
  const [now, setNow] = useState(() => clock.now(performance.now()));
  useEffect(() => { const timer = setInterval(() => setNow(clock.now(performance.now())), 1000); return () => clearInterval(timer); }, []);
  const seconds = Math.max(0, Math.ceil((Date.parse(deadline) - now) / 1000));
  return <strong>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</strong>;
}
export function AssetImage({ assetKey, label }: { assetKey: string | null; label: string }) {
  const asset = useResource(async () => {
    if (!assetKey) return null;
    const response = await fetch('/assets/asset-manifest.v1.json');
    const manifest = z.object({ assets: z.array(z.object({ asset_id: z.string(), runtime_path: z.string().nullish() })) }).parse(await response.json());
    return manifest.assets.find(item => item.asset_id === assetKey)?.runtime_path ?? null;
  }, assetKey ?? 'no-image');
  return asset.data ? <img className="gift-photo" src={asset.data} alt={label} /> : <div className="gift-art"><small>实物图待配置</small></div>;
}
export function Field({ label, name, type = 'text', required = true, value }: { label: string; name: string; type?: string; required?: boolean; value?: string | number }) {
  return <label>{label}<input name={name} type={type} required={required} defaultValue={value} /></label>;
}
export const formString = (data: FormData, name: string): string => String(data.get(name) ?? '').trim();
export function navigate(path: string): void { window.location.hash = path; }
