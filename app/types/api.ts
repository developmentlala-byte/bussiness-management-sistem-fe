// Base response untuk properti yang selalu ada
export interface BaseApiResponse {
  status: boolean;
  message: string;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  meta?: any;
}

// 1. Interface untuk Table / List (Ini kode asli Anda)
export interface PaginatedApiResponse<T> extends BaseApiResponse {
  data: {
    data: {
      current_page: number;
      data: T[];
      total: number;
      per_page: number;
      meta?: any;
      last_page: number;
    };
  };
}

// 2. Interface baru untuk Dashboard Stats / Single Object
export interface SingleApiResponse<T> extends BaseApiResponse {
  data: T;
}
