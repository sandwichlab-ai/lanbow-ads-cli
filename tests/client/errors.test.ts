import { describe, expect, it } from 'vitest';

import {
  AuthRequiredError,
  CLIError,
  GraphAPIError,
  NetworkError,
  RateLimitError,
  classifyError,
  formatErrorForDisplay,
} from '../../src/client/errors.js';

describe('client/errors', () => {
  it('classifies 4/32/613 as RateLimitError', () => {
    for (const code of [4, 32, 613]) {
      const err = classifyError(
        { message: 'Rate limit', type: 'OAuthException', code },
        400,
      );
      expect(err).toBeInstanceOf(RateLimitError);
    }
  });

  it('classifies auth error codes as AuthRequiredError', () => {
    for (const code of [190, 102, 200, 10]) {
      const err = classifyError(
        { message: 'Auth issue', type: 'OAuthException', code },
        400,
      );
      expect(err).toBeInstanceOf(AuthRequiredError);
    }
  });

  it('classifies HTTP 401/403 as AuthRequiredError', () => {
    const err401 = classifyError(
      { message: 'Unauthorized', type: 'OAuthException', code: 999 },
      401,
    );
    const err403 = classifyError(
      { message: 'Forbidden', type: 'OAuthException', code: 999 },
      403,
    );

    expect(err401).toBeInstanceOf(AuthRequiredError);
    expect(err403).toBeInstanceOf(AuthRequiredError);
  });

  it('falls back to GraphAPIError for other codes', () => {
    const err = classifyError(
      {
        message: 'Unknown API error',
        type: 'OAuthException',
        code: 12345,
        error_subcode: 77,
        fbtrace_id: 'trace_1',
      },
      400,
    );

    expect(err).toBeInstanceOf(GraphAPIError);
    expect(err).not.toBeInstanceOf(AuthRequiredError);
    expect(err).not.toBeInstanceOf(RateLimitError);
  });

  it('preserves user-facing error details on GraphAPIError', () => {
    const err = classifyError(
      {
        message: 'Invalid parameter',
        type: 'OAuthException',
        code: 100,
        error_user_title: 'Video Thumbnail Required',
        error_user_msg: 'Specify image_hash or image_url in video_data.',
      },
      400,
    );

    expect(err).toBeInstanceOf(GraphAPIError);
    expect((err as GraphAPIError).userTitle).toBe('Video Thumbnail Required');
    expect((err as GraphAPIError).userMessage).toBe('Specify image_hash or image_url in video_data.');
  });

  it('formats display messages by error type', () => {
    expect(formatErrorForDisplay(new AuthRequiredError('token expired', 190))).toMatch(
      /Run: lanbow-ads auth login/,
    );
    expect(formatErrorForDisplay(new RateLimitError('too many calls', 4))).toMatch(
      /Please wait and try again/,
    );
    expect(
      formatErrorForDisplay(new GraphAPIError('bad request', 100, undefined, 'OAuthException')),
    ).toMatch(/API Error \(code 100\): bad request/);
    expect(
      formatErrorForDisplay(
        new GraphAPIError(
          'invalid parameter',
          100,
          undefined,
          'OAuthException',
          undefined,
          'Video Thumbnail Required',
          'Specify image_hash or image_url in video_data.',
        ),
      ),
    ).toMatch(/Video Thumbnail Required: Specify image_hash or image_url in video_data\./);
    expect(formatErrorForDisplay(new NetworkError('timeout'))).toMatch(/Network error: timeout/);
  });

  it('keeps CLIError exitCode', () => {
    const err = new CLIError('oops', 2);
    expect(err.exitCode).toBe(2);
  });
});
