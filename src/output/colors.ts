export type ColorName = 'red' | 'green' | 'yellow' | 'cyan' | 'dim' | 'bold' | 'reset';

const ANSI_CODES: Record<ColorName, [string, string]> = {
  red: ['\x1b[31m', '\x1b[39m'],
  green: ['\x1b[32m', '\x1b[39m'],
  yellow: ['\x1b[33m', '\x1b[39m'],
  cyan: ['\x1b[36m', '\x1b[39m'],
  dim: ['\x1b[2m', '\x1b[22m'],
  bold: ['\x1b[1m', '\x1b[22m'],
  reset: ['\x1b[0m', '\x1b[0m'],
};

export function supportsColor(): boolean {
  if (process.env.NO_COLOR) {
    return false;
  }
  if (process.env.FORCE_COLOR) {
    return true;
  }
  return process.stdout.isTTY === true;
}

export function colorize(text: string, color: ColorName): string {
  if (!supportsColor()) {
    return text;
  }
  const [open, close] = ANSI_CODES[color];
  return `${open}${text}${close}`;
}
