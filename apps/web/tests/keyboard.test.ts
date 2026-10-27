import { expect, it } from 'vitest';
import { permitsGameplayKey } from '../src/game/keyboard';
it('keeps menu/dialog and repeated keys out of gameplay', () => {
  for (const tag of ['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT', 'SUMMARY']) expect(permitsGameplayKey(tag, false, false)).toBe(false);
  expect(permitsGameplayKey('DIV', true, false)).toBe(false);
  expect(permitsGameplayKey('BODY', false, true)).toBe(false);
  expect(permitsGameplayKey('BODY', false, false)).toBe(true);
});
