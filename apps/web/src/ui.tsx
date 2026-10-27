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
  const [binding, setBinding] = useState({ identity });
  // A distinct binding also distinguishes A → B → A. Hide the old snapshot in
  // this render, before effects run or a response from an earlier A can arrive.
  if (binding.identity !== identity) setBinding({ identity });
  const [snapshot, setSnapshot] = useState<{ binding: typeof binding; data: T | undefined; error: string; errorCode?: string }>();
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    let request = 0;
    let inFlight = false;
    const fetchData = () => {
      // A slow read must be allowed to finish. Explicit refresh creates a new
      // effect/generation; interval ticks only skip the current in-flight read.
      if (inFlight) return;
      inFlight = true;
      const sequence = ++request;
      void load().then(data => {
        if (active && sequence === request) setSnapshot({ binding, data, error: '' });
      }).catch(cause => {
        if (active && sequence === request) setSnapshot(previous => ({ binding, data: cause instanceof ApiError && cause.code === 'UNAUTHENTICATED' ? undefined : previous?.binding === binding ? previous.data : undefined, error: message(cause), ...(cause instanceof ApiError ? { errorCode: cause.code } : {}) }));
      }).finally(() => {
        if (active && sequence === request) inFlight = false;
      });
    };
    fetchData();
    const timer = refreshSeconds ? window.setInterval(fetchData, refreshSeconds * 1000) : undefined;
    return () => { active = false; if (timer) clearInterval(timer); };
    // identity expresses the entire remote resource identity; callers keep reads side-effect free.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [binding, revision, refreshSeconds]);
  const current = snapshot?.binding === binding && binding.identity === identity ? snapshot : undefined;
  return { data: current?.data, error: current?.error ?? '', errorCode: current?.errorCode, refresh: () => setRevision(value => value + 1) };
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
  return <GiftImage key={assetKey ?? 'unconfigured'} assetKey={assetKey} label={label} />;
}
function GiftImage({ assetKey, label }: { assetKey: string | null; label: string }) {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'failed'>('loading');
  const [attempt, setAttempt] = useState(0);
  const asset = useResource(async () => {
    if (!assetKey) return null;
    const response = await fetch('/assets/asset-manifest.v1.json');
    if (!response.ok) throw new Error('礼品资源清单暂时无法读取');
    const manifest = z.object({ assets: z.array(z.object({ asset_id: z.string(), runtime_path: z.string().nullish() })) }).parse(await response.json());
    return manifest.assets.find(item => item.asset_id === assetKey)?.runtime_path ?? null;
  }, assetKey ?? 'no-image');
  if (!assetKey) return <div className="gift-art"><small>实物图待配置</small></div>;
  if (asset.error || asset.data === null || imageState === 'failed') return <div className="gift-art" role="status"><p>{asset.data === null ? '礼品图片未在资源清单中登记' : '礼品图片加载失败'}</p><button onClick={() => { setImageState('loading'); setAttempt(value => value + 1); asset.refresh(); }}>重试礼品图片</button></div>;
  return <>{imageState === 'loading' && <div className="gift-art" role="status"><small>正在加载礼品图片……</small></div>}{asset.data && <img key={attempt} className="gift-photo" src={attempt ? `${asset.data}${asset.data.includes('?') ? '&' : '?'}image_retry=${attempt}` : asset.data} alt={label} hidden={imageState !== 'loaded'} onLoad={e => { const image = e.currentTarget; void image.decode().then(() => { if (image.isConnected) setImageState('loaded'); }).catch(() => { if (image.isConnected) setImageState('failed'); }); }} onError={() => setImageState('failed')} />}</>;
}
export function Field({ label, name, type = 'text', required = true, value }: { label: string; name: string; type?: string; required?: boolean; value?: string | number }) {
  return <label>{label}<input name={name} type={type} required={required} defaultValue={value} /></label>;
}
export const formString = (data: FormData, name: string): string => String(data.get(name) ?? '').trim();
export function navigate(path: string): void { window.location.hash = path; }
