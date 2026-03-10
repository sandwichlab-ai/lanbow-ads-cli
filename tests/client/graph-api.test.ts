import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthRequiredError, NetworkError } from '../../src/client/errors.js';
import { createGraphAPIClient } from '../../src/client/graph-api.js';

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
}

describe('createGraphAPIClient', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('serializes GET params and appends access_token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ data: [], paging: { cursors: { after: 'x' } } }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = createGraphAPIClient({
      accessToken: 'token_123',
      baseUrl: 'https://example.test',
    });

    await client.getList('act_1/campaigns', {
      fields: 'id,name',
      effective_status: ['ACTIVE', 'PAUSED'],
      filtering: [{ field: 'objective', operator: 'IN', value: ['OUTCOME_TRAFFIC'] }],
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const parsed = new URL(url);

    expect(parsed.pathname).toBe('/act_1/campaigns');
    expect(parsed.searchParams.get('fields')).toBe('id,name');
    expect(parsed.searchParams.get('effective_status')).toBe('["ACTIVE","PAUSED"]');
    expect(parsed.searchParams.get('filtering')).toBe(
      '[{"field":"objective","operator":"IN","value":["OUTCOME_TRAFFIC"]}]',
    );
    expect(parsed.searchParams.get('access_token')).toBe('token_123');
    expect(init.method).toBe('GET');
  });

  it('serializes POST body as x-www-form-urlencoded', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 'cmp_1' }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = createGraphAPIClient({ accessToken: 'token_456', baseUrl: 'https://example.test' });

    await client.post('act_1/campaigns', {
      name: 'Test Campaign',
      special_ad_categories: [],
      filtering: [{ field: 'status', operator: 'IN', value: ['ACTIVE'] }],
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/act_1/campaigns');
    expect(init.method).toBe('POST');

    const body = String(init.body);
    expect(body).toContain('name=Test+Campaign');
    expect(body).toContain('special_ad_categories=%5B%5D');
    expect(body).toContain(
      'filtering=%5B%7B%22field%22%3A%22status%22%2C%22operator%22%3A%22IN%22%2C%22value%22%3A%5B%22ACTIVE%22%5D%7D%5D',
    );
    expect(body).toContain('access_token=token_456');
  });

  it('posts multipart form data with token in query string', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 'vid_1' }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = createGraphAPIClient({ accessToken: 'token_form', baseUrl: 'https://example.test' });
    const formData = new FormData();
    formData.set('source', new Blob(['video-bytes']), 'clip.mp4');
    formData.set('name', 'clip.mp4');

    await client.postFormData('act_1/advideos', formData);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const parsed = new URL(url);
    const headers = new Headers(init.headers);

    expect(parsed.pathname).toBe('/act_1/advideos');
    expect(parsed.searchParams.get('access_token')).toBe('token_form');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(formData);
    expect(headers.get('content-type')).toBeNull();
  });

  it('sends DELETE params in query string', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: true }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = createGraphAPIClient({ accessToken: 'token_del', baseUrl: 'https://example.test' });
    await client.delete('12345', { foo: 'bar' });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const parsed = new URL(url);

    expect(init.method).toBe('DELETE');
    expect(parsed.searchParams.get('foo')).toBe('bar');
    expect(parsed.searchParams.get('access_token')).toBe('token_del');
  });

  it('parses x-app-usage header and invokes callback', async () => {
    const onRateLimit = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        { data: [] },
        { headers: { 'x-app-usage': '{"call_count":12,"total_cputime":9,"total_time":8}' } },
      ),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = createGraphAPIClient({
      accessToken: 'token_rate',
      baseUrl: 'https://example.test',
      onRateLimit,
    });

    await client.getList('me/adaccounts');
    expect(onRateLimit).toHaveBeenCalledWith({ call_count: 12, total_cputime: 9, total_time: 8 });
  });

  it('throws AuthRequiredError on API auth error payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ error: { message: 'Invalid token', type: 'OAuthException', code: 190 } }, { status: 400 }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = createGraphAPIClient({ accessToken: 'bad', baseUrl: 'https://example.test' });

    await expect(client.getObject('123')).rejects.toBeInstanceOf(AuthRequiredError);
  });

  it('wraps timeout errors as NetworkError', async () => {
    const timeoutError = new DOMException('timed out', 'TimeoutError');
    const fetchMock = vi.fn().mockRejectedValue(timeoutError);
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = createGraphAPIClient({ accessToken: 'token', baseUrl: 'https://example.test' });

    await expect(client.getObject('123')).rejects.toBeInstanceOf(NetworkError);
    await expect(client.getObject('123')).rejects.toThrow(/Request timed out/);
  });

  it('wraps network failures as NetworkError with cause', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('socket hang up'));
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = createGraphAPIClient({ accessToken: 'token', baseUrl: 'https://example.test' });

    try {
      await client.getObject('123');
      throw new Error('expected rejection');
    } catch (error) {
      expect(error).toBeInstanceOf(NetworkError);
      expect((error as NetworkError).cause).toBeInstanceOf(Error);
    }
  });
});
