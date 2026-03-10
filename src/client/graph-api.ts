import { classifyError, NetworkError } from './errors.js';
import type { RateLimitInfo } from '../types/api.js';
import type { HttpMethod } from '../types/api.js';
import type { PaginatedResponse } from '../types/common.js';
import type { Logger } from '../utils/logger.js';
import type { GraphAPIErrorPayload } from '../types/api.js';

export const GRAPH_API_VERSION = 'v24.0';
export const GRAPH_API_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;
export const GRAPH_VIDEO_BASE_URL = `https://graph-video.facebook.com/${GRAPH_API_VERSION}`;
const USER_AGENT = 'lanbow-ads/1.0';
const REQUEST_TIMEOUT_MS = 30_000;

export interface GraphAPIClientConfig {
  accessToken: string;
  baseUrl?: string;
  timeout?: number;
  onRateLimit?: (info: RateLimitInfo) => void;
  logger?: Logger;
}

export interface GraphAPIClient {
  getList<T>(endpoint: string, params?: Record<string, unknown>): Promise<PaginatedResponse<T>>;
  getObject<T>(endpoint: string, params?: Record<string, unknown>): Promise<T>;
  post<T>(endpoint: string, params?: Record<string, unknown>): Promise<T>;
  postFormData<T>(endpoint: string, formData: FormData): Promise<T>;
  delete<T>(endpoint: string, params?: Record<string, unknown>): Promise<T>;
}

function serializeParams(params: Record<string, unknown>): URLSearchParams {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }
    if (typeof value === 'object') {
      searchParams.set(key, JSON.stringify(value));
    } else {
      searchParams.set(key, String(value));
    }
  }
  return searchParams;
}

export function createGraphAPIClient(config: GraphAPIClientConfig): GraphAPIClient {
  function parseRateLimitHeaders(headers: Headers): void {
    const appUsage = headers.get('x-app-usage');
    if (appUsage && config.onRateLimit) {
      try {
        config.onRateLimit(JSON.parse(appUsage) as RateLimitInfo);
      } catch {
        // ignore malformed header
      }
    }

    const bizUsage = headers.get('x-business-use-case-usage');
    const adUsage = headers.get('x-ad-account-usage');
    if (bizUsage) {
      config.logger?.debug('x-business-use-case-usage:', bizUsage);
    }
    if (adUsage) {
      config.logger?.debug('x-ad-account-usage:', adUsage);
    }
  }

  async function executeRequest<T>(url: URL, fetchOptions: RequestInit): Promise<T> {
    let response: Response;
    try {
      response = await fetch(url.toString(), fetchOptions);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        throw new NetworkError('Request timed out');
      }

      const err = error instanceof Error ? error : new Error(String(error));
      throw new NetworkError(`Network request failed: ${err.message}`, err);
    }

    parseRateLimitHeaders(response.headers);

    const json = (await response.json()) as Record<string, unknown>;

    if (json.error && typeof json.error === 'object') {
      throw classifyError(json.error as GraphAPIErrorPayload, response.status);
    }

    return json as T;
  }

  async function request<T>(method: HttpMethod, endpoint: string, params: Record<string, unknown> = {}): Promise<T> {
    const allParams: Record<string, unknown> = {
      ...params,
      access_token: config.accessToken,
    };

    const base = config.baseUrl ?? GRAPH_API_BASE_URL;
    const url = new URL(`${base}/${endpoint}`);

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(config.timeout ?? REQUEST_TIMEOUT_MS),
    };

    if (method === 'POST') {
      const body = serializeParams(allParams);
      fetchOptions.body = body.toString();
      (fetchOptions.headers as Record<string, string>)['Content-Type'] = 'application/x-www-form-urlencoded';
    } else {
      url.search = serializeParams(allParams).toString();
    }

    return executeRequest<T>(url, fetchOptions);
  }

  return {
    async getList<T>(endpoint: string, params?: Record<string, unknown>): Promise<PaginatedResponse<T>> {
      return request<PaginatedResponse<T>>('GET', endpoint, params);
    },

    async getObject<T>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
      return request<T>('GET', endpoint, params);
    },

    async post<T>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
      return request<T>('POST', endpoint, params);
    },

    async postFormData<T>(endpoint: string, formData: FormData): Promise<T> {
      const base = config.baseUrl ?? GRAPH_API_BASE_URL;
      const url = new URL(`${base}/${endpoint}`);
      url.searchParams.set('access_token', config.accessToken);

      return executeRequest<T>(url, {
        method: 'POST',
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'application/json',
        },
        body: formData,
        signal: AbortSignal.timeout(config.timeout ?? REQUEST_TIMEOUT_MS),
      });
    },

    async delete<T>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
      return request<T>('DELETE', endpoint, params);
    },
  };
}
