export function permitsGameplayKey(tag: string, dialog: boolean, repeat: boolean): boolean {
  return !dialog && !repeat && !['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT', 'SUMMARY', 'OPTION'].includes(tag.toUpperCase());
}
