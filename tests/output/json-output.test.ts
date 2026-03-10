import { describe, expect, it, vi } from 'vitest';

import { outputJson } from '../../src/output/json-output.js';

describe('outputJson', () => {
  it('prints pretty json to stdout', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    outputJson({ id: '1', nested: { ok: true } });

    expect(spy).toHaveBeenCalledWith('{\n  "id": "1",\n  "nested": {\n    "ok": true\n  }\n}');
    spy.mockRestore();
  });
});
