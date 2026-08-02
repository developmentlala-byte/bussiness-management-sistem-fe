const APP_BASE_URL =
  process.env.NEXT_PUBLIC_API_STORAGE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api\/?$/, "") ??
  "https://consumer-smother-theft.ngrok-free.dev";

/**
 * Resolves a backend path to a full URL.
 * Standardizes how we handle storage paths across the app.
 */
export const resolvePhotoUrl = (path?: string | null): string | null => {
  if (!path) return null;

  // Sudah full URL
  if (path.startsWith("http")) return path;

  // Pastikan diawali slash
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  return `${APP_BASE_URL}${cleanPath}`;
};
