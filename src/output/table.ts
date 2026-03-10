import Table from 'cli-table3';

import { colorize } from './colors.js';

interface TableOptions<T> {
  columns?: string[];
  title?: string;
  transform?: (item: T) => Record<string, unknown>;
}

function formatHeader(key: string): string {
  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function colorizeStatus(status: string): string {
  const normalized = String(status).toUpperCase();
  switch (normalized) {
    case 'ACTIVE':
    case '1':
      return colorize(status, 'green');
    case 'PAUSED':
      return colorize(status, 'yellow');
    case 'ARCHIVED':
      return colorize(status, 'dim');
    case 'DISABLED':
    case '2':
      return colorize(status, 'red');
    default:
      return status;
  }
}

function formatCellValue(value: unknown, key?: string): string {
  if (value == null) {
    return '-';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  const str = String(value);
  if (key === 'status' || key === 'configured_status' || key === 'account_status') {
    return colorizeStatus(str);
  }
  return str;
}

function outputVerticalTable(item: Record<string, unknown>, title?: string): void {
  if (title) {
    console.log(colorize(`\n${title}`, 'bold'));
  }

  const table = new Table({
    style: { head: [], border: [] },
  });

  for (const [key, value] of Object.entries(item)) {
    if (value === undefined || value === null) {
      continue;
    }
    table.push({
      [colorize(formatHeader(key), 'cyan')]: formatCellValue(value, key),
    });
  }

  console.log(table.toString());
}

export function outputTable<T>(data: T | T[], options?: TableOptions<T>): void {
  const items = Array.isArray(data) ? data : [data];

  if (items.length === 0) {
    console.log('No results found.');
    return;
  }

  if (!Array.isArray(data)) {
    const item = options?.transform ? options.transform(data) : (data as Record<string, unknown>);
    outputVerticalTable(item, options?.title);
    return;
  }

  const transformed = options?.transform ? items.map(options.transform) : items;
  const columns = options?.columns ?? Object.keys(transformed[0] as Record<string, unknown>);

  const table = new Table({
    head: columns.map((col) => colorize(formatHeader(col), 'cyan')),
    style: { head: [], border: [] },
  });

  for (const item of transformed) {
    const row = columns.map((col) => formatCellValue((item as Record<string, unknown>)[col], col));
    table.push(row);
  }

  if (options?.title) {
    console.log(colorize(`\n${options.title}`, 'bold'));
  }
  console.log(table.toString());
  console.log(colorize(`\n${items.length} result(s)`, 'dim'));
}
