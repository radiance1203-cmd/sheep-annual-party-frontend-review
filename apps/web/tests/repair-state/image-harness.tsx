import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AssetImage } from '../../src/ui';
function Harness() {
  const [key, setKey] = useState<string | null>(null);
  Object.assign(window, { repairImage: { select: setKey } });
  return <AssetImage assetKey={key} label="夹具礼品图片" />;
}
const host = document.getElementById('root');
if (!host) throw new Error('Missing fixture host');
createRoot(host).render(<Harness />);
