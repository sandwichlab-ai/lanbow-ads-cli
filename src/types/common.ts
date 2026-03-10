export type OutputFormat = 'table' | 'json';

export interface GlobalOptions {
  json?: boolean;
  format?: OutputFormat;
  verbose?: boolean;
  account?: string;
  accessToken?: string;
}

export interface PaginationOptions {
  limit?: number;
  after?: string;
  before?: string;
  all?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  paging?: {
    cursors?: { before?: string; after?: string };
    next?: string;
    previous?: string;
  };
}
