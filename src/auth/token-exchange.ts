import type { TokenInfo } from '../types/auth.js';

const GRAPH_API_VERSION = 'v24.0';
const GRAPH_API_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export async function exchangeForLongLivedToken(
  shortLivedToken: string,
  appId: string,
  appSecret: string,
): Promise<TokenInfo> {
  const url = new URL(`${GRAPH_API_BASE_URL}/oauth/access_token`);
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', appId);
  url.searchParams.set('client_secret', appSecret);
  url.searchParams.set('fb_exchange_token', shortLivedToken);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  let json: {
    access_token?: string;
    expires_in?: number;
    error?: { message?: string };
  };
  try {
    json = (await response.json()) as typeof json;
  } catch {
    throw new Error(`Token exchange failed: HTTP ${response.status}`);
  }

  if (json.error) {
    throw new Error(json.error.message ?? `Token exchange failed: HTTP ${response.status}`);
  }
  if (!response.ok) {
    throw new Error(`Token exchange failed: HTTP ${response.status}`);
  }
  if (!json.access_token) {
    throw new Error('Token exchange failed: access_token missing in response');
  }

  return {
    accessToken: json.access_token,
    expiresIn: json.expires_in,
    createdAt: Date.now(),
  };
}
