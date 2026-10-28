export function permitsGameplayKey(tag: string, dialog: boolean, repeat: boolean): boolean {
  return !dialog && !repeat && !['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT', 'SUMMARY', 'OPTION'].includes(tag.toUpperCase());
}

const arrows = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);
export class HeldDirections {
  private readonly pressed = new Set<string>();
  press(key: string): boolean { if (!arrows.has(key)) return false; this.pressed.add(key); return true; }
  release(key: string): boolean { return this.pressed.delete(key); }
  clear(): void { this.pressed.clear(); }
  vector(): { x: number; y: number } {
    return { x: (Number(this.pressed.has('ArrowRight')) - Number(this.pressed.has('ArrowLeft'))) * 1000, y: (Number(this.pressed.has('ArrowDown')) - Number(this.pressed.has('ArrowUp'))) * 1000 };
  }
}
