export interface TokenInfo {
  accessToken: string;
  expiresIn?: number;
  userId?: string;
  createdAt: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  token?: TokenInfo;
  source: 'env' | 'file' | 'oauth' | 'none';
  expiresAt?: Date;
}

export interface OAuthConfig {
  appId: string;
  appSecret?: string;
  redirectUri: string;
  scope: string;
}
