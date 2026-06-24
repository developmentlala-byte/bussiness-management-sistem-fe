"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  X,
  ArrowCounterClockwise,
  CircleNotch,
  ArrowClockwise,
} from "@phosphor-icons/react";
import Image from "next/image";

interface AttendanceSelfieModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  actionLabel: string;
  isUploading?: boolean;
  statusMessage?: string | null;
  onClose: () => void;
  onCapture: (file: File, previewUrl: string) => void;
}

export const AttendanceSelfieModal = ({
  isOpen,
  title,
  description,
  actionLabel,
  isUploading = false,
  statusMessage,
  onClose,
  onCapture,
}: AttendanceSelfieModalProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  // Ref untuk track apakah komponen masih mounted / modal masih open
  const isMountedRef = useRef(false);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraLoading, setIsCameraLoading] = useState(false);

  // --- HELPER: Stop semua track & release stream ---
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // --- HELPER: Revoke object URL preview ---
  const revokePreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  // --- CORE: Start kamera dengan fallback ---
  const startCamera = useCallback(async () => {
    // Jangan jalankan kalau modal sudah ditutup
    if (!isMountedRef.current) return;

    // Stop stream lama dulu sebelum minta yang baru
    stopStream();

    setCameraError(null);
    setIsCameraLoading(true);

    try {
      let stream: MediaStream;

      try {
        // Prioritas 1: kamera depan (ideal untuk mobile)
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (initialError: any) {
        // Prioritas 2: fallback ke kamera default (laptop/PC)
        if (
          initialError.name === "NotFoundError" ||
          initialError.name === "OverconstrainedError"
        ) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } else {
          throw initialError;
        }
      }

      // Guard: kalau modal sudah ditutup saat await, langsung buang stream
      if (!isMountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) {
        // Harusnya tidak terjadi, tapi guard saja
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      video.srcObject = stream;

      // KEY FIX: tunggu loadedmetadata sebelum play()
      // Ini yang mencegah layar hitam / kamera tidak keload
      await new Promise<void>((resolve) => {
        if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
          // Sudah siap, langsung resolve
          resolve();
        } else {
          const onMeta = () => {
            video.removeEventListener("loadedmetadata", onMeta);
            resolve();
          };
          video.addEventListener("loadedmetadata", onMeta);

          // Safety timeout 4 detik — kalau event tidak pernah fire
          setTimeout(() => {
            video.removeEventListener("loadedmetadata", onMeta);
            resolve();
          }, 4000);
        }
      });

      if (!isMountedRef.current) return;

      await video.play();
    } catch (error: any) {
      console.error("Camera error:", error);

      if (!isMountedRef.current) return;

      if (error.name === "NotAllowedError") {
        setCameraError(
          "Akses kamera ditolak. Mohon izinkan kamera melalui pengaturan browser Anda.",
        );
      } else if (error.name === "NotFoundError") {
        setCameraError("Tidak ada kamera yang terdeteksi di perangkat ini.");
      } else if (error.name === "AbortError") {
        setCameraError("Akses kamera dibatalkan. Silakan coba lagi.");
      } else {
        setCameraError(
          "Kamera sedang digunakan oleh aplikasi lain atau tidak tersedia.",
        );
      }
    } finally {
      if (isMountedRef.current) {
        setIsCameraLoading(false);
      }
    }
  }, [stopStream]);

  // --- EFFECT: Buka / tutup kamera sesuai state isOpen ---
  useEffect(() => {
    if (!isOpen) {
      isMountedRef.current = false;
      stopStream();
      revokePreview();
      // Reset state saat modal ditutup
      setPreviewUrl(null);
      setCameraError(null);
      setIsCameraLoading(false);
      return;
    }

    isMountedRef.current = true;
    void startCamera();

    return () => {
      isMountedRef.current = false;
      stopStream();
    };
  }, [isOpen, startCamera, stopStream, revokePreview]);

  // --- ACTION: Ambil foto dari video frame ---
  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    // Guard: pastikan video benar-benar sudah ada frame-nya
    if (
      video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA ||
      video.videoWidth === 0
    ) {
      console.warn("Video belum siap untuk di-capture.");
      return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;

        revokePreview();

        const nextPreviewUrl = URL.createObjectURL(blob);
        previewUrlRef.current = nextPreviewUrl;
        setPreviewUrl(nextPreviewUrl);

        const file = new File([blob], `attendance-selfie-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });

        onCapture(file, nextPreviewUrl);
      },
      "image/jpeg",
      0.9,
    );
  };

  // --- ACTION: Ambil ulang — reset preview, restart kamera ---
  const handleRetake = () => {
    revokePreview();
    setPreviewUrl(null);
    setCameraError(null);
    // Re-start kamera karena stream mungkin sudah mati
    void startCamera();
  };

  // --- ACTION: Tutup modal ---
  const handleClose = () => {
    setPreviewUrl(null);
    setCameraError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      <div className="relative w-full max-w-3xl overflow-hidden rounded-[24px] sm:rounded-[28px] border border-border bg-surface shadow-2xl flex flex-col max-h-[90svh]">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border/60 bg-linear-to-r from-accent/15 via-accent/8 to-transparent px-5 py-4 sm:px-6 sm:py-5">
          <div>
            <p className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-[0.28em] text-accent">
              Attendance Camera
            </p>
            <h3 className="mt-1 text-lg sm:text-xl font-black text-foreground">
              {title}
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-muted">{description}</p>
          </div>

          <button
            onClick={handleClose}
            className="rounded-full border border-border bg-background/70 p-2 text-muted transition-colors hover:text-foreground active:scale-95"
          >
            <X weight="bold" className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-hide">
          <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
            {/* Viewport Kamera */}
            <div className="relative overflow-hidden rounded-[20px] sm:rounded-[24px] border border-border bg-black aspect-[4/3] lg:aspect-auto">
              {previewUrl ? (
                <Image
                  src={previewUrl}
                  alt="Preview selfie"
                  width={1280}
                  height={720}
                  unoptimized
                  style={{
                    transform: "scaleX(-1)",
                    WebkitTransform: "scaleX(-1)",
                  }}
                  className="h-full w-full object-cover lg:h-105"
                />
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    transform: "scaleX(-1)",
                    WebkitTransform: "scaleX(-1)",
                  }}
                  className="h-full w-full object-cover lg:h-105"
                />
              )}

              {/* Overlay: Uploading */}
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/45">
                  <div className="flex items-center gap-2 rounded-full bg-background/90 px-4 py-2 text-sm font-bold text-foreground shadow-lg">
                    <CircleNotch className="h-4 w-4 animate-spin" />
                    Menyimpan...
                  </div>
                </div>
              )}

              {/* Overlay: Camera loading */}
              {isCameraLoading && !cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <div className="flex flex-col items-center gap-2 text-white">
                    <CircleNotch className="h-6 w-6 animate-spin" />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Membuka kamera...
                    </span>
                  </div>
                </div>
              )}

              {/* Overlay: Error dengan tombol retry */}
              {cameraError && (
                <div className="absolute inset-0 flex items-end justify-center p-4">
                  <div className="w-full rounded-xl border border-red-500/20 bg-red-500/90 backdrop-blur-md px-4 py-3 text-center shadow-lg space-y-2">
                    <p className="text-xs sm:text-sm font-medium text-white">
                      {cameraError}
                    </p>
                    <button
                      onClick={() => void startCamera()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white/20 hover:bg-white/30 px-3 py-1.5 text-xs font-bold text-white transition-colors"
                    >
                      <ArrowClockwise weight="bold" className="h-3.5 w-3.5" />
                      Coba Lagi
                    </button>
                  </div>
                </div>
              )}

              {/* Badge: Kamera aktif */}
              {!previewUrl && !cameraError && !isCameraLoading && (
                <div className="absolute left-4 top-4 rounded-full bg-black/45 backdrop-blur-sm px-3 py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white/90">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block mr-2 animate-pulse" />
                  Kamera aktif
                </div>
              )}

              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Panel Aksi */}
            <div className="flex flex-col justify-between gap-4 rounded-[20px] sm:rounded-[24px] border border-border/70 bg-background/50 p-4 sm:p-5 h-fit lg:h-full">
              <div className="space-y-3">
                <div className="rounded-xl sm:rounded-2xl border border-border bg-surface px-4 py-3">
                  <p className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-[0.24em] text-muted">
                    Status
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {isCameraLoading
                      ? "Membuka kamera..."
                      : cameraError
                        ? "Kamera tidak tersedia"
                        : previewUrl
                          ? "Foto berhasil diambil"
                          : "Siap mengambil selfie"}
                  </p>
                  {statusMessage && (
                    <p className="mt-1 text-xs font-medium text-muted">
                      {statusMessage}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleCapture}
                  disabled={
                    isUploading ||
                    !!cameraError ||
                    isCameraLoading ||
                    !!previewUrl
                  }
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl sm:rounded-2xl bg-accent px-4 py-3.5 text-xs sm:text-sm font-bold text-accent-foreground transition-opacity hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Camera weight="bold" className="h-4 w-4 shrink-0" />
                  {actionLabel}
                </button>

                {previewUrl && (
                  <button
                    onClick={handleRetake}
                    disabled={isUploading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl sm:rounded-2xl border border-border px-4 py-3 text-xs sm:text-sm font-bold text-foreground transition-colors hover:bg-surface-secondary active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ArrowCounterClockwise
                      weight="bold"
                      className="h-4 w-4 shrink-0"
                    />
                    Ambil Ulang
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
