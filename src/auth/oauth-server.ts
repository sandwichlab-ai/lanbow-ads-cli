import http from 'node:http';
import { AddressInfo } from 'node:net';

const GRAPH_API_VERSION = 'v24.0';
const OAUTH_SCOPE = [
  'ads_management',
  'ads_read',
  'business_management',
  'instagram_basic',
  'public_profile',
  'pages_show_list',
  'pages_read_engagement',
].join(',');
const DEFAULT_REDIRECT_PORT = 8080;
const CALLBACK_TIMEOUT_MS = 180_000;

export interface OAuthServerResult {
  accessToken: string;
  expiresIn?: number;
  userId?: string;
}

export function buildOAuthUrl(appId: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: OAUTH_SCOPE,
    response_type: 'token',
  });

  return `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth?${params.toString()}`;
}

async function findAvailablePort(startPort: number): Promise<number> {
  for (let port = startPort; port < startPort + 20; port += 1) {
    const available = await new Promise<boolean>((resolve) => {
      const tester = http.createServer();
      tester.once('error', () => resolve(false));
      tester.once('listening', () => {
        tester.close(() => resolve(true));
      });
      tester.listen(port, '127.0.0.1');
    });

    if (available) {
      return port;
    }
  }

  throw new Error('No available callback port found near 8080');
}

function callbackHtml(): string {
  return `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Meta Ads Auth</title></head>
  <body>
    <h1>Completing authentication...</h1>
    <script>
      (function() {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const token = params.get('access_token');
        if (!token) {
          document.body.innerHTML = '<h1>Authentication Failed</h1><p>' + (params.get('error_description') || 'Unknown error') + '</p>';
          return;
        }

        fetch('/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_token: token,
            expires_in: params.get('expires_in'),
            user_id: params.get('user_id')
          })
        }).then(function() {
          document.body.innerHTML = '<h1>Authentication Successful</h1><p>You can close this window.</p>';
        }).catch(function(err) {
          document.body.innerHTML = '<h1>Authentication Failed</h1><p>' + String(err) + '</p>';
        });
      })();
    </script>
  </body>
</html>`;
}

export async function startOAuthServer(options?: {
  port?: number;
  timeout?: number;
}): Promise<{
  url: string;
  waitForCallback: () => Promise<OAuthServerResult>;
  close: () => void;
}> {
  const tokenContainer: { value?: OAuthServerResult } = {};
  const timeoutMs = options?.timeout ?? CALLBACK_TIMEOUT_MS;

  const port = options?.port ? await findAvailablePort(options.port) : await findAvailablePort(DEFAULT_REDIRECT_PORT);

  let resolveWait: ((value: OAuthServerResult) => void) | undefined;
  let rejectWait: ((reason?: unknown) => void) | undefined;

  const waitPromise = new Promise<OAuthServerResult>((resolve, reject) => {
    resolveWait = resolve;
    rejectWait = reject;
  });

  const server = http.createServer((req, res) => {
    if (!req.url) {
      res.statusCode = 400;
      res.end('Missing URL');
      return;
    }

    const pathname = req.url.split('?')[0];

    if (req.method === 'GET' && pathname === '/callback') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(callbackHtml());
      return;
    }

    if (req.method === 'POST' && pathname === '/token') {
      const chunks: Buffer[] = [];
      req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      req.on('end', () => {
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString('utf-8')) as {
            access_token: string;
            expires_in?: string;
            user_id?: string;
          };

          const token: OAuthServerResult = {
            accessToken: body.access_token,
            expiresIn: body.expires_in ? parseInt(body.expires_in, 10) : undefined,
            userId: body.user_id,
          };
          tokenContainer.value = token;
          resolveWait?.(token);

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end('{"ok":true}');
        } catch (error) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(`{"ok":false,"error":${JSON.stringify(String(error))}}`);
        }
      });
      return;
    }

    res.statusCode = 404;
    res.end('Not Found');
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(port, '127.0.0.1', () => resolve());
    server.once('error', reject);
  });

  const timeout = setTimeout(() => {
    rejectWait?.(new Error('OAuth callback timed out'));
    server.close();
  }, timeoutMs);

  const address = server.address() as AddressInfo;
  const url = `http://127.0.0.1:${address.port}/callback`;

  return {
    url,
    waitForCallback: async () => {
      if (tokenContainer.value) {
        return tokenContainer.value;
      }
      return waitPromise;
    },
    close: () => {
      clearTimeout(timeout);
      server.close();
    },
  };
}
