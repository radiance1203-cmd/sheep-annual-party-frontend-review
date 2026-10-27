import { expect, it } from 'vitest';
import { permitsGameplayKey } from '../src/game/keyboard';
import { HeldDirections } from '../src/game/keyboard';
it('keeps menu/dialog and repeated keys out of gameplay', () => {
  for (const tag of ['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT', 'SUMMARY']) expect(permitsGameplayKey(tag, false, false)).toBe(false);
  expect(permitsGameplayKey('DIV', true, false)).toBe(false);
  expect(permitsGameplayKey('BODY', false, true)).toBe(false);
  expect(permitsGameplayKey('BODY', false, false)).toBe(true);
});
it('keeps held movement through bark, combines arrows, and releases only the released key', () => {
  const held = new HeldDirections();
  held.press('ArrowRight'); held.press(' ');
  expect(held.vector()).toEqual({ x: 1000, y: 0 });
  held.press('ArrowUp');
  expect(held.vector()).toEqual({ x: 1000, y: -1000 });
  held.release('ArrowUp');
  expect(held.vector()).toEqual({ x: 1000, y: 0 });
  held.clear(); expect(held.vector()).toEqual({ x: 0, y: 0 });
});
