import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Notice } from '../ui';

function readVoucher(source: CanvasImageSource, width: number, height: number): string | null {
  if (!width || !height) return null;
  const scale = Math.min(1, 1600 / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('当前浏览器无法读取图片，请手工输入领取码。');
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  const decoded = jsQR(pixels.data, pixels.width, pixels.height);
  if (!decoded) return null;
  if (!/^[A-Za-z0-9_-]{43}$/u.test(decoded.data)) throw new Error('二维码不是有效格式的领取凭证，请使用原领取码或订单编号。');
  return decoded.data;
}

export function VoucherScanner({ disabled, onCode }: { disabled: boolean; onCode: (code: string) => void }) {
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const frame = useRef<number | null>(null);
  const generation = useRef(0);
  function stopCamera(): void {
    generation.current++;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    stream.current?.getTracks().forEach(track => track.stop()); stream.current = null;
    if (video.current) video.current.srcObject = null;
  }
  useEffect(() => () => { stopCamera(); }, []);
  useEffect(() => {
    if (disabled) { stopCamera(); setCameraOpen(false); setReading(false); }
  }, [disabled]);
  async function openCamera(): Promise<void> {
    stopCamera(); const attempt = generation.current;
    setError(''); setReading(false); setCameraOpen(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('当前浏览器没有可用相机，请上传二维码图片或手工输入。');
      const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      if (attempt !== generation.current) { media.getTracks().forEach(track => track.stop()); return; }
      stream.current = media;
      const player = video.current;
      if (!player) { stopCamera(); return; }
      player.srcObject = media; await player.play();
      if (attempt !== generation.current) return;
      const scan = () => {
        if (attempt !== generation.current) return;
        try {
          const code = readVoucher(player, player.videoWidth, player.videoHeight);
          if (code) { stopCamera(); setCameraOpen(false); onCode(code); return; }
          frame.current = requestAnimationFrame(scan);
        } catch (cause) { stopCamera(); setCameraOpen(false); setError(cause instanceof Error ? cause.message : '相机识别失败，请手工输入。'); }
      };
      frame.current = requestAnimationFrame(scan);
    } catch (cause) {
      if (attempt !== generation.current) return;
      stopCamera(); setCameraOpen(false);
      setError(cause instanceof Error && cause.message.includes('当前浏览器') ? cause.message : '无法开启相机或相机权限被拒绝，请上传二维码图片或手工输入。');
    }
  }
  async function upload(file: File): Promise<void> {
    stopCamera(); setCameraOpen(false); setError(''); setReading(true);
    const attempt = generation.current;
    const url = URL.createObjectURL(file);
    try {
      const image = new Image(); image.src = url; await image.decode();
      if (attempt !== generation.current) return;
      const code = readVoucher(image, image.naturalWidth, image.naturalHeight);
      if (!code) throw new Error('未识别到领取凭证二维码，请换用清晰完整的图片或手工输入。');
      onCode(code);
    } catch (cause) {
      if (attempt === generation.current) setError(cause instanceof Error && cause.message.includes('领取') ? cause.message : '图片无法解码，请换用图片或手工输入领取码。');
    } finally { URL.revokeObjectURL(url); if (attempt === generation.current) setReading(false); }
  }
  return <div className="voucher-scanner"><p>扫码和手工输入均只查询记录，核销仍需核对本人后再次确认。</p><button type="button" disabled={disabled || reading} onClick={() => void openCamera()}>开启相机扫描领取码</button><label>上传领取凭证二维码图片<input type="file" accept="image/*" disabled={disabled || reading} onChange={e => { const file = e.currentTarget.files?.[0]; e.currentTarget.value = ''; if (file) void upload(file); }} /></label>{reading && <Notice>正在识别图片……</Notice>}{cameraOpen && <div><video ref={video} autoPlay playsInline muted aria-label="领取凭证扫码相机" /><button type="button" onClick={() => { stopCamera(); setCameraOpen(false); }}>关闭相机</button></div>}{error && <Notice error>{error}</Notice>}</div>;
}
