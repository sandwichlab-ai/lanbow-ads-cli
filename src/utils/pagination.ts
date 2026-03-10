import type { PaginatedResponse } from '../types/common.js';

export function extractPaginationInfo(paging?: PaginatedResponse<unknown>['paging']): {
  hasNext: boolean;
  hasPrev: boolean;
  nextCursor?: string;
  prevCursor?: string;
} {
  return {
    hasNext: Boolean(paging?.next),
    hasPrev: Boolean(paging?.previous),
    nextCursor: paging?.cursors?.after,
    prevCursor: paging?.cursors?.before,
  };
}

export function printPaginationHint(paging?: PaginatedResponse<unknown>['paging']): void {
  const info = extractPaginationInfo(paging);
  if (info.hasNext && info.nextCursor) {
    console.error(`\nMore results available. Use --after ${info.nextCursor}`);
  }
}

export async function fetchAllPages<T>(
  fetchPage: (cursor?: string) => Promise<PaginatedResponse<T>>,
  maxPages = 10,
): Promise<T[]> {
  const allData: T[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < maxPages; page += 1) {
    const result = await fetchPage(cursor);
    allData.push(...result.data);

    if (!result.paging?.next || !result.paging.cursors?.after) {
      break;
    }
    cursor = result.paging.cursors.after;
  }

  return allData;
}
