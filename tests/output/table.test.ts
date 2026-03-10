import { describe, expect, it, vi } from 'vitest';

import { outputTable } from '../../src/output/table.js';

describe('outputTable', () => {
  it('prints no-result message for empty arrays', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    outputTable([]);

    expect(spy).toHaveBeenCalledWith('No results found.');
    spy.mockRestore();
  });

  it('prints result count for list output', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    outputTable([{ id: '1', status: 'ACTIVE' }]);

    const calls = spy.mock.calls.map((c) => String(c[0]));
    expect(calls.some((c) => c.includes('1 result(s)'))).toBe(true);
    spy.mockRestore();
  });
});
