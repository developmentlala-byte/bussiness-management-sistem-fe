import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { apiGet } from "../services/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useApiFetch = (
  key: string[] | number[],
  url: string,
  params?: any | undefined,
  enabled?: boolean,
) => {
  // console.log("🚀 ~ useApiFetch ~ enabled:", enabled);
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

  return useQuery({
    queryKey,
    queryFn: () => apiGet(url, params),
    enabled: isEnabled,
    // Tambahkan staleTime untuk mengurangi refetch yang tidak perlu
    staleTime: 30000, // 30 detik - cache data selama 30 detik
    // Tambahkan refetchOnWindowFocus: false untuk mengurangi refetch otomatis
    refetchOnWindowFocus: false,
    // Tambahkan retry logic untuk menghindari loop pada error
    retry: (failureCount, error) => {
      // Jangan retry jika error adalah CORS atau 401/403
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return false;
      }
      // Maksimal 2 retry untuk error lainnya
      return failureCount < 2;
    },
    // Tambahkan retryDelay untuk menghindari spam request
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
