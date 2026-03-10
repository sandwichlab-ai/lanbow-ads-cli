import type { OutputFormat } from '../types/common.js';
import { outputJson } from './json-output.js';
import { outputTable } from './table.js';

interface FormatterConfig {
  format: OutputFormat;
}

export interface OutputOptions<T = unknown> {
  columns?: string[];
  title?: string;
  transform?: (item: T) => Record<string, unknown>;
}

export interface OutputFormatter {
  output<T>(data: T | T[], options?: OutputOptions<T>): void;
}

export function createFormatter(config: FormatterConfig): OutputFormatter {
  return {
    output<T>(data: T | T[], options?: OutputOptions<T>): void {
      if (config.format === 'json') {
        outputJson(data);
      } else {
        outputTable(data, options);
      }
    },
  };
}
