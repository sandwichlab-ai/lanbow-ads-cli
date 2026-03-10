import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { exchangeForLongLivedToken } from '../../src/auth/token-exchange.js';

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

describe('token-exchange', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-02T00:00:00.000Z'));
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.useRealTimers();
  });

  it('calls oauth/access_token and maps response to TokenInfo', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        access_token: 'long_token',
        token_type: 'bearer',
        expires_in: 5_184_000,
      }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await exchangeForLongLivedToken('short_token', 'app_1', 'secret_1');

    const [url] = fetchMock.mock.calls[0] as [string];
    const parsed = new URL(url);

    expect(parsed.pathname).toBe('/v24.0/oauth/access_token');
    expect(parsed.searchParams.get('grant_type')).toBe('fb_exchange_token');
    expect(parsed.searchParams.get('client_id')).toBe('app_1');
    expect(parsed.searchParams.get('client_secret')).toBe('secret_1');
    expect(parsed.searchParams.get('fb_exchange_token')).toBe('short_token');

    expect(result.accessToken).toBe('long_token');
    expect(result.expiresIn).toBe(5_184_000);
    expect(result.createdAt).toBe(new Date('2026-03-02T00:00:00.000Z').getTime());
  });

  it('throws when network request fails', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      exchangeForLongLivedToken('short_token', 'app_1', 'secret_1'),
    ).rejects.toThrow(/network down/i);
  });

  it('surfaces Meta error details from non-2xx responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          error: {
            message: 'Invalid OAuth access token - Cannot parse access token',
          },
        },
        { status: 400 },
      ),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      exchangeForLongLivedToken('short_token', 'app_1', 'secret_1'),
    ).rejects.toThrow('Invalid OAuth access token - Cannot parse access token');
  });

  it('falls back to HTTP status when a non-2xx response is not JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('oops', { status: 503 }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      exchangeForLongLivedToken('short_token', 'app_1', 'secret_1'),
    ).rejects.toThrow('Token exchange failed: HTTP 503');
  });
});
