import { describe, expect, it, vi } from 'vitest';

import {
  extractPaginationInfo,
  fetchAllPages,
  printPaginationHint,
} from '../../src/utils/pagination.js';

describe('pagination utils', () => {
  it('extracts cursor and next/prev flags', () => {
    const info = extractPaginationInfo({
      cursors: { before: 'b', after: 'a' },
      next: 'https://next',
      previous: 'https://prev',
    });

    expect(info).toEqual({
      hasNext: true,
      hasPrev: true,
      nextCursor: 'a',
      prevCursor: 'b',
    });
  });

  it('prints pagination hint to stderr when next page exists', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    printPaginationHint({
      cursors: { after: 'cursor_2' },
      next: 'https://next',
    });

    expect(spy).toHaveBeenCalledWith('\nMore results available. Use --after cursor_2');
    spy.mockRestore();
  });

  it('fetches all pages until next cursor disappears', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({
        data: [{ id: 1 }],
        paging: { cursors: { after: 'c1' }, next: 'https://next' },
      })
      .mockResolvedValueOnce({
        data: [{ id: 2 }],
      });

    const result = await fetchAllPages(fetchPage);

    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    expect(fetchPage).toHaveBeenNthCalledWith(1, undefined);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 'c1');
  });

  it('stops at maxPages safety limit', async () => {
    const fetchPage = vi.fn().mockResolvedValue({
      data: [{ id: 'x' }],
      paging: { cursors: { after: 'next' }, next: 'https://next' },
    });

    await fetchAllPages(fetchPage, 3);
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });
});
