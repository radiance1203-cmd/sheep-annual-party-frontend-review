import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { VoucherScanner } from '../../src/repair-state/VoucherScanner';
const received: string[] = [];
function Harness() {
  const [disabled, setDisabled] = useState(false);
  const [shown, setShown] = useState(true);
  const [count, setCount] = useState(0);
  Object.assign(window, { repairCamera: { disable: setDisabled, unmount: () => setShown(false), received } });
  return <>{shown && <VoucherScanner disabled={disabled} onCode={code => { received.push(code); setCount(received.length); }} />}<div role="status">识别次数 {count}</div></>;
}
const host = document.getElementById('root'); if (!host) throw new Error('Missing fixture host');
createRoot(host).render(<Harness />);
