import { colorize, type ColorName } from '../output/colors.js';

export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

function levelColor(level: string): ColorName {
  switch (level) {
    case 'DEBUG':
      return 'dim';
    case 'INFO':
      return 'cyan';
    case 'WARN':
      return 'yellow';
    case 'ERROR':
      return 'red';
    default:
      return 'reset';
  }
}

export function createLogger(verbose = false): Logger {
  const log = (level: string, message: string, ...args: unknown[]) => {
    const prefix = colorize(`[${level}]`, levelColor(level));
    console.error(`${prefix} ${message}`, ...args);
  };

  return {
    debug(message, ...args) {
      if (verbose) {
        log('DEBUG', message, ...args);
      }
    },
    info(message, ...args) {
      log('INFO', message, ...args);
    },
    warn(message, ...args) {
      log('WARN', message, ...args);
    },
    error(message, ...args) {
      log('ERROR', message, ...args);
    },
  };
}
