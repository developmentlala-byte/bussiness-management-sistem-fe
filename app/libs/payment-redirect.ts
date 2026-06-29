"use client";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function resolvePaymentAppBaseUrl(): string {
  const envBaseUrl = process.env.NEXT_PUBLIC_PAYMENT_APP_BASE_URL?.trim();

  if (envBaseUrl) {
    return trimTrailingSlash(envBaseUrl);
  }
  return "";
}

export function buildBookingPaymentRedirectPayload(
  referencePlaceholder = "{referenceId}",
): {
  return_url?: string;
  cancel_url?: string;
} {
  const baseUrl = resolvePaymentAppBaseUrl();

  if (!baseUrl) {
    return {};
  }

  return {
    return_url: `${baseUrl}/payment/${referencePlaceholder}/notice`,
    cancel_url: `${baseUrl}/payment/${referencePlaceholder}/cancel`,
  };
}
