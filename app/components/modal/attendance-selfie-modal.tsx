// attendance-selfie-modal.tsx — fixed cropping + cleaned up controls
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Camera,
  X,
  ArrowCounterClockwise,
  CircleNotch,
  ArrowClockwise,
  Check,
} from "@phosphor-icons/react";

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
  const isMountedRef = useRef(false);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  // Portal target only exists on the client — document.body isn't available
  // during SSR, so we delay rendering the portal until after mount.
  const [isClientMounted, setIsClientMounted] = useState(false);

  useEffect(() => {
    setIsClientMounted(true);
  }, []);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const revokePreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (!isMountedRef.current) return;
    stopStream();
    setCameraError(null);
    setIsCameraLoading(true);
    try {
      let stream: MediaStream;
      try {
        // `ideal` constraints let the browser pick the closest native ratio
        // instead of forcing a crop — actual fit is handled by object-contain
        // below, so we don't fight the device's real aspect ratio here.
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1080 },
            height: { ideal: 1440 },
          },
          audio: false,
        });
      } catch (e: any) {
        if (e.name === "NotFoundError" || e.name === "OverconstrainedError") {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } else throw e;
      }
      if (!isMountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      video.srcObject = stream;
      await new Promise<void>((resolve) => {
        if (video.readyState >= HTMLMediaElement.HAVE_METADATA)
          return resolve();
        const onMeta = () => {
          video.removeEventListener("loadedmetadata", onMeta);
          resolve();
        };
        video.addEventListener("loadedmetadata", onMeta);
        setTimeout(() => {
          video.removeEventListener("loadedmetadata", onMeta);
          resolve();
        }, 4000);
      });
      if (!isMountedRef.current) return;
      await video.play();
    } catch (error: any) {
      if (!isMountedRef.current) return;
      if (error.name === "NotAllowedError")
        setCameraError(
          "Akses kamera ditolak. Izinkan melalui pengaturan browser.",
        );
      else if (error.name === "NotFoundError")
        setCameraError("Tidak ada kamera yang terdeteksi.");
      else setCameraError("Kamera tidak tersedia. Silakan coba lagi.");
    } finally {
      if (isMountedRef.current) setIsCameraLoading(false);
    }
  }, [stopStream]);

  useEffect(() => {
    if (!isOpen) {
      isMountedRef.current = false;
      stopStream();
      revokePreview();
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

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    if (
      video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA ||
      video.videoWidth === 0
    )
      return;

    // Capture at the video's own native resolution/ratio — no cropping here,
    // so the saved photo always matches exactly what the preview showed.
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        revokePreview();
        const url = URL.createObjectURL(blob);
        previewUrlRef.current = url;
        setPreviewUrl(url);
        const file = new File([blob], `attendance-selfie-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        // Upload fires immediately on capture (existing behavior, kept as-is).
        onCapture(file, url);
      },
      "image/jpeg",
      0.9,
    );
  };

  const handleRetake = () => {
    revokePreview();
    setPreviewUrl(null);
    setCameraError(null);
    void startCamera();
  };

  if (!isOpen || !isClientMounted) return null;

  // Rendered via portal directly into document.body so `fixed inset-0` is
  // always relative to the real viewport — protects against any ancestor
  // (e.g. the dashboard's Sidebar layout) that sets a transform/filter/contain,
  // which would otherwise turn this into a fixed-within-that-ancestor box
  // and visually "crop" the camera to the dashboard's content area.
  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
      {/* ── KAMERA / PREVIEW — letterboxed, never cropped ── */}
      <div className="absolute inset-0 flex items-center justify-center bg-black">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- object-contain on
          // an unknown-ratio blob URL; next/image's fill+cover would crop it again.
          <img
            src={previewUrl}
            alt="Preview selfie"
            className="h-full w-full object-contain"
            style={{ transform: "scaleX(-1)" }}
          />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-contain"
            style={{ transform: "scaleX(-1)" }}
          />
        )}

        {/* Vignette overlay for legibility — doesn't affect layout/sizing */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/60 pointer-events-none" />
      </div>

      {/* ── FACE GUIDE FRAME ── */}
      {!previewUrl && !cameraError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="w-[170px] h-[215px] rounded-[50%] border-2 border-white/40 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]" />
          <p className="mt-5 text-[12px] text-white/55 tracking-wide text-center px-8">
            Pastikan wajah terlihat jelas dalam bingkai
          </p>
        </div>
      )}

      {/* ── HEADER — floating top bar ── */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-14 pb-4">
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 border border-white/20 text-white backdrop-blur-sm active:scale-95 transition-transform"
          aria-label="Tutup"
        >
          <X weight="bold" className="h-4 w-4" />
        </button>

        {/* Center info chip */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/50">
            {title}
          </span>
          <div className="flex items-center gap-1.5 rounded-full bg-white/12 border border-white/20 px-3 py-1.5 backdrop-blur-sm">
            <div className="h-5 w-5 rounded-full bg-accent/30 flex items-center justify-center text-[10px] font-bold text-accent">
              {description.charAt(0)}
            </div>
            <span className="text-[13px] font-semibold text-white">
              {description}
            </span>
          </div>
        </div>

        {/* Spacer to keep the chip centered now that the flip button is gone */}
        <div className="h-9 w-9" />
      </div>

      {/* ── STATUS PILL ── */}
      {!previewUrl && !cameraError && !isCameraLoading && (
        <div className="relative z-10 flex justify-center">
          <div className="flex items-center gap-1.5 rounded-full bg-black/40 border border-white/15 px-3 py-1.5 backdrop-blur-sm">
            <span className="h-[7px] w-[7px] rounded-full bg-green-400 animate-pulse" />
            <span className="text-[11px] font-semibold text-white/80">
              Kamera aktif
            </span>
          </div>
        </div>
      )}

      {/* ── CAMERA LOADING OVERLAY ── */}
      {isCameraLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 text-white">
            <CircleNotch className="h-8 w-8 animate-spin" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Membuka kamera...
            </span>
          </div>
        </div>
      )}

      {/* ── CAMERA ERROR ── */}
      {cameraError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 px-8 text-center bg-black/70">
          <div className="h-14 w-14 rounded-full bg-red-500/20 flex items-center justify-center">
            <Camera className="h-7 w-7 text-red-400" />
          </div>
          <p className="text-sm font-medium text-white/80">{cameraError}</p>
          <button
            onClick={() => void startCamera()}
            className="flex items-center gap-2 rounded-xl bg-white/12 border border-white/20 px-5 py-2.5 text-sm font-bold text-white active:scale-95 transition-transform"
          >
            <ArrowClockwise weight="bold" className="h-4 w-4" />
            Coba Lagi
          </button>
        </div>
      )}

      {/* ── UPLOADING OVERLAY ── */}
      {isUploading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-background/90 px-8 py-6 shadow-xl">
            <CircleNotch className="h-7 w-7 animate-spin text-accent" />
            <p className="text-sm font-bold text-foreground">
              {statusMessage ?? "Menyimpan..."}
            </p>
          </div>
        </div>
      )}

      {/* ── SPACER (pushes bottom bar down) ── */}
      <div className="flex-1" />

      {/* ── BOTTOM CONTROLS ── */}
      <div className="relative z-10 px-6 pb-14 pt-6">
        {!previewUrl ? (
          /* Capture state — single, unambiguous action: take the photo */
          <div className="flex flex-col items-center gap-5">
            <button
              onClick={handleCapture}
              disabled={!!cameraError || isCameraLoading}
              className="flex h-[76px] w-[76px] items-center justify-center rounded-full bg-white border-4 border-white/30 text-black disabled:opacity-40 active:scale-95 transition-transform shadow-[0_0_0_4px_rgba(255,255,255,0.12)]"
              aria-label={actionLabel}
            >
              <Camera weight="fill" className="h-7 w-7" />
            </button>
            <p className="text-[11px] text-white/40 tracking-wide">
              Ketuk untuk ambil foto
            </p>
          </div>
        ) : (
          /* Captured state — photo already uploaded on capture; this just
             confirms success and lets the user retake or close. */
          <div className="flex flex-col gap-3">
            <div className="flex justify-center mb-1">
              <div className="flex items-center gap-2 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-4 py-2">
                <Check weight="bold" className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-[12px] font-semibold text-emerald-300">
                  {isUploading ? "Mengirim foto..." : "Foto berhasil dikirim"}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleRetake}
                disabled={isUploading}
                className="flex-1 flex items-center justify-center gap-2 h-[50px] rounded-[14px] bg-white/12 border border-white/20 text-white text-sm font-semibold disabled:opacity-40 active:scale-95 transition-transform backdrop-blur-sm"
              >
                <ArrowCounterClockwise weight="bold" className="h-4 w-4" />
                Ambil ulang
              </button>
              <button
                onClick={onClose}
                disabled={isUploading}
                className="flex-[1.4] flex items-center justify-center gap-2 h-[50px] rounded-[14px] bg-white text-black text-sm font-semibold disabled:opacity-40 active:scale-95 transition-transform"
              >
                <Check weight="bold" className="h-4 w-4" />
                Selesai
              </button>
            </div>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>,
    document.body,
  );
};
