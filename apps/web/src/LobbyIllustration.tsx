import { useState } from 'react';
import { Notice } from './ui';

interface LobbyIllustrationProps {
  src: string | undefined;
  className: string;
  width: number;
  height: number;
  label: string;
  fetchPriority?: 'high' | 'auto';
  retryLabel?: string;
}

export function LobbyIllustration({ src, className, width, height, label, fetchPriority = 'auto', retryLabel }: LobbyIllustrationProps) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <Notice error><p>{label}插画加载失败，请重新加载。</p>{src && retryLabel && <button onClick={() => setFailed(false)}>{retryLabel}</button>}</Notice>;
  return <img className={className} src={src} width={width} height={height} alt="" fetchPriority={fetchPriority} onError={() => setFailed(true)} />;
}
