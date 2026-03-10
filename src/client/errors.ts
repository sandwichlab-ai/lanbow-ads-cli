import type { GraphAPIErrorPayload } from '../types/api.js';

export class CLIError extends Error {
  readonly exitCode: number;

  constructor(message: string, exitCode = 1, options?: ErrorOptions) {
    super(message, options);
    this.name = 'CLIError';
    this.exitCode = exitCode;
  }
}

export class GraphAPIError extends CLIError {
  readonly code: number;
  readonly subcode?: number;
  readonly type: string;
  readonly fbtraceId?: string;
  readonly userTitle?: string;
  readonly userMessage?: string;

  constructor(
    message: string,
    code: number,
    subcode?: number,
    type = 'OAuthException',
    fbtraceId?: string,
    userTitle?: string,
    userMessage?: string,
  ) {
    super(message, 1);
    this.name = 'GraphAPIError';
    this.code = code;
    this.subcode = subcode;
    this.type = type;
    this.fbtraceId = fbtraceId;
    this.userTitle = userTitle;
    this.userMessage = userMessage;
  }
}

export class AuthRequiredError extends GraphAPIError {
  constructor(message: string, code: number, subcode?: number) {
    super(message, code, subcode);
    this.name = 'AuthRequiredError';
  }
}

export class RateLimitError extends GraphAPIError {
  constructor(message: string, code: number) {
    super(message, code);
    this.name = 'RateLimitError';
  }
}

export class NetworkError extends CLIError {
  constructor(message: string, cause?: Error) {
    super(message, 1, cause ? { cause } : undefined);
    this.name = 'NetworkError';
  }
}

export function getRootCause(error: unknown): unknown {
  let current = error;
  while (current instanceof Error && current.cause) {
    current = current.cause;
  }
  return current;
}

export function classifyError(error: GraphAPIErrorPayload, httpStatus: number): GraphAPIError {
  const {
    message,
    type,
    code,
    error_subcode: subcode,
    fbtrace_id: fbtraceId,
    error_user_title: userTitle,
    error_user_msg: userMessage,
  } = error;

  if (code === 4 || code === 32 || code === 613) {
    return new RateLimitError(message, code);
  }

  if (code === 190 || code === 102 || code === 200 || code === 10) {
    return new AuthRequiredError(message, code, subcode);
  }

  if (httpStatus === 401 || httpStatus === 403) {
    return new AuthRequiredError(message, code, subcode);
  }

  return new GraphAPIError(message, code, subcode, type, fbtraceId, userTitle, userMessage);
}

export function formatErrorForDisplay(error: Error): string {
  const cause = getRootCause(error);
  const target = cause instanceof Error ? cause : error;

  if (target instanceof AuthRequiredError) {
    return `Authentication required: ${target.message}\nRun: lanbow-ads auth login`;
  }
  if (target instanceof RateLimitError) {
    return `Rate limited: ${target.message}\nPlease wait and try again.`;
  }
  if (target instanceof GraphAPIError) {
    let text = `API Error (code ${target.code}): ${target.message}`;
    if (target.userTitle || target.userMessage) {
      const detail = [target.userTitle, target.userMessage].filter(Boolean).join(': ');
      text += `\n${detail}`;
    }
    return text;
  }
  if (target instanceof NetworkError) {
    return `Network error: ${target.message}`;
  }
  return `Error: ${target.message}`;
}
