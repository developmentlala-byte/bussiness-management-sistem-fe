"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryKey,
} from "@tanstack/react-query";
import { useMemo } from "react";
// Sesuaikan path import api method Anda jika berbeda
import { apiGet, apiPost, apiPut, apiDelete } from "../services/api";

// ==========================================
// 1. GET HOOK (FETCH)
// ==========================================
export const useApiFetch = <TData = unknown>(
  key: string[] | number[],
  url: string,
  params?: Record<string, unknown> | undefined,
  enabled?: boolean,
  options?: {
    refetchInterval?: number;
    refetchOnWindowFocus?: boolean;
    staleTime?: number;
  },
) => {
  // Stabilkan queryKey - React Query menggunakan deep comparison
  // Tapi kita perlu memastikan params tidak berubah reference setiap render
  const queryKey = useMemo(() => {
    if (Array.isArray(key)) {
      // Jika key sudah berupa array lengkap (seperti di table), gunakan langsung
      return key;
    }
    // Jika key adalah string, gabungkan dengan params
    // React Query akan melakukan deep comparison pada params
    return [key, params];
  }, [key, params]);

  // Tentukan enabled state - hanya fetch jika url dan key ada, dan enabled tidak false
  const isEnabled = useMemo(() => {
    // Jika enabled dikirim (true/false), pakai nilai itu.
    // Jika tidak dikirim (undefined), pakai validasi url & key.
    return typeof enabled !== "undefined" ? enabled : !!(url && key);
  }, [enabled, url, key]);

  return useQuery<TData>({
    queryKey,
    queryFn: () => apiGet(url, params),
    enabled: isEnabled,
    // Tambahkan staleTime untuk mengurangi refetch yang tidak perlu
    staleTime: options?.staleTime ?? 30000, // 30 detik - cache data selama 30 detik
    // Tambahkan refetchOnWindowFocus: true untuk refresh ketika tab aktif kembali
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? true,
    refetchInterval: options?.refetchInterval,
    // Tambahkan retry logic untuk menghindari loop pada error
    retry: (failureCount: number, error: unknown) => {
      // Type assertion yang lebih aman daripada menggunakan 'any'
      const err = error as { response?: { status?: number } };

      // Jangan retry jika error adalah CORS atau 401/403
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        return false;
      }
      // Maksimal 2 retry untuk error lainnya
      return failureCount < 2;
    },
    // Tambahkan retryDelay untuk menghindari spam request
    retryDelay: (attemptIndex: number) =>
      Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// ==========================================
// TYPES UNTUK MUTATION HOOKS
// ==========================================
// Mendukung url berupa string biasa ATAU fungsi yang menerima data dan me-return string
type UrlType<TVariables> = string | ((data: TVariables) => string);

// Kita buat signature function sendiri secara eksplisit untuk menghindari
// perubahan tipe internal bawaan Tanstack Query yang sering berubah di tiap versi
interface CustomMutationOptions<
  TData = unknown,
  TVariables = unknown,
  TContext = unknown,
> {
  invalidate?: QueryKey[];
  onSuccess?: (
    data: TData,
    variables: TVariables,
    context: TContext | undefined,
  ) => Promise<unknown> | void;
  onError?: (
    error: Error,
    variables: TVariables,
    context: TContext | undefined,
  ) => Promise<unknown> | void;
}

// ==========================================
// 2. POST HOOK
// ==========================================
export const usePost = <
  TData = unknown,
  TVariables = unknown,
  TContext = unknown,
>(
  url: UrlType<TVariables>,
  options: CustomMutationOptions<TData, TVariables, TContext> = {},
) => {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables, TContext>({
    mutationFn: (data: TVariables) => {
      const finalUrl = typeof url === "function" ? url(data) : url;
      // Always send the payload, even when URL is a function
      return apiPost(finalUrl, data);
    },
    onSuccess: (data, variables, context) => {
      if (Array.isArray(options.invalidate)) {
        options.invalidate.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key, exact: false });
        });
      }

      if (typeof options.onSuccess === "function") {
        options.onSuccess(data, variables, context);
      }
    },
    onError: options.onError,
  });
};

// ==========================================
// 3. PUT HOOK
// ==========================================
export const usePut = <
  TData = unknown,
  TVariables = unknown,
  TContext = unknown,
>(
  url: UrlType<TVariables>,
  options: CustomMutationOptions<TData, TVariables, TContext> = {},
) => {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables, TContext>({
    mutationFn: (data: TVariables) => {
      const finalUrl = typeof url === "function" ? url(data) : url;
      return apiPut(finalUrl, data);
    },
    onSuccess: (data, variables, context) => {
      if (Array.isArray(options.invalidate)) {
        options.invalidate.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key, exact: false });
        });
      }

      if (typeof options.onSuccess === "function") {
        options.onSuccess(data, variables, context);
      }
    },
    onError: options.onError,
  });
};

// ==========================================
// 4. REMOVE/DELETE HOOK
// ==========================================
export const useRemove = <
  TData = unknown,
  TVariables = unknown,
  TContext = unknown,
>(
  url: UrlType<TVariables>,
  options: CustomMutationOptions<TData, TVariables, TContext> = {},
) => {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables, TContext>({
    mutationFn: (data: TVariables) => {
      const finalUrl = typeof url === "function" ? url(data) : url;
      return apiDelete(finalUrl);
    },
    onSuccess: (data, variables, context) => {
      if (Array.isArray(options.invalidate)) {
        options.invalidate.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key, exact: false });
        });
      }

      if (typeof options.onSuccess === "function") {
        options.onSuccess(data, variables, context);
      }
    },
    onError: options.onError,
  });
};
