export interface GraphAPIErrorPayload {
  message: string;
  type: string;
  code: number;
  error_subcode?: number;
  fbtrace_id?: string;
  error_user_title?: string;
  error_user_msg?: string;
}

export interface RateLimitInfo {
  call_count: number;
  total_cputime: number;
  total_time: number;
}

export type HttpMethod = 'GET' | 'POST' | 'DELETE';
