import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useResource } from '../../src/ui';

const requests: { identity: string; resolve: (value: string) => void }[] = [];
function Harness() {
  const [identity, setIdentity] = useState('A');
  const polling = new URLSearchParams(window.location.search).has('poll');
  const resource = useResource(() => new Promise<string>(resolve => {
    requests.push({ identity, resolve });
    const requestNumber = requests.length;
    if (polling) setTimeout(() => resolve(`${identity}:${requestNumber}`), 350);
  }), identity, polling ? 0.2 : 0);
  Object.assign(window, { repairResource: { select: setIdentity, requests, refresh: resource.refresh } });
  return <><div role="status">{resource.data ?? 'loading'}</div><div role="alert">{resource.error}</div></>;
}
const host = document.getElementById('root');
if (!host) throw new Error('Missing fixture host');
createRoot(host).render(<Harness />);
