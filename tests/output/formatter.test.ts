import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/output/json-output.js', () => ({
  outputJson: vi.fn(),
}));

vi.mock('../../src/output/table.js', () => ({
  outputTable: vi.fn(),
}));

import { createFormatter } from '../../src/output/formatter.js';
import { outputJson } from '../../src/output/json-output.js';
import { outputTable } from '../../src/output/table.js';

describe('createFormatter', () => {
  it('dispatches to outputJson for json format', () => {
    const formatter = createFormatter({ format: 'json' });
    formatter.output([{ id: 1 }]);

    expect(outputJson).toHaveBeenCalledWith([{ id: 1 }]);
    expect(outputTable).not.toHaveBeenCalled();
  });

  it('dispatches to outputTable for table format', () => {
    const formatter = createFormatter({ format: 'table' });
    formatter.output([{ id: 1 }], { title: 'Rows' });

    expect(outputTable).toHaveBeenCalledWith([{ id: 1 }], { title: 'Rows' });
  });
});
