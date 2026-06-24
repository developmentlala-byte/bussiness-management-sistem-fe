import {
  ArrowLeft,
  ArrowSquareOut,
  Check,
  CheckCircle,
  Clock,
  Copy,
  Receipt,
  Tag,
  User,
  Warning,
  X,
  XCircle,
} from "@phosphor-icons/react";
import {
  channelLabel,
  fmtDate,
  fmtDateTime,
  fmtTime,
  Payment,
  PaymentStatus,
  STATUS_CONFIG,
  viaLabel,
} from "../page";
import { useState } from "react";
import { IDR } from "@/app/libs/idr";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="ml-1 text-muted-foreground transition-colors hover:text-foreground"
      title="Copy"
    >
      {copied ? <Check size={12} weight="bold" /> : <Copy size={12} />}
    </button>
  );
}

function ScallopEdge({
  fillTop,
  fillBottom,
}: {
  fillTop: string;
  fillBottom: string;
}) {
  // 20 scallop arcs across 400px width
  return (
    <svg
      viewBox="0 0 400 24"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      className="w-full"
      style={{ display: "block", marginTop: "-1px" }}
      aria-hidden
    >
      <rect width="400" height="24" fill={fillBottom} />
      <path
        d={Array.from({ length: 20 }, (_, i) => {
          const x = i * 20;
          return `M${x},0 Q${x + 10},20 ${x + 20},0`;
        }).join(" ")}
        fill={fillTop}
      />
    </svg>
  );
}

/** A single row in the detail table */
function DetailRow({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-2.5 text-[12.5px] ${className}`}
    >
      <span className="text-[#9C7B6B]">{label}</span>
      <div className="font-medium text-[#3D2B1F]">{children}</div>
    </div>
  );
}

export default function ReceiptModal({
  payment,
  onClose,
}: {
  payment: Payment;
  onClose: () => void;
}) {
  const cfg = STATUS_CONFIG[payment.status];
  const { booking, member } = payment;

  // Warm terracotta — matches the screenshot's header color
  const TERRACOTTA = "#C1714F";
  // Cream body background
  const CREAM = "#FDF6F0";

  const isMembershipPayment = !!member;
  const customerName = booking ? booking.customer_name : member?.customer?.name || "—";
  const customerPhone = booking ? booking.customer_phone : member?.customer?.phone || "—";
  const referenceLabel = isMembershipPayment ? "Membership Reference" : "Booking Reference";
  const referenceValue = booking ? booking.booking_code : payment.reference_id;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-[2px]"
      style={{ background: "rgba(40,20,10,0.45)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-[420px] overflow-hidden rounded-2xl shadow-2xl"
        style={{ background: CREAM }}
      >
        {/* ── Close button ─────────────────────────────────────── */}
        <button
          onClick={onClose}
          className="absolute right-3.5 top-3.5 z-20 flex h-8 w-8 items-center justify-center rounded-full transition-opacity hover:opacity-80"
          style={{ background: "rgba(255,255,255,0.22)" }}
          aria-label="Tutup"
        >
          <X size={14} weight="bold" color="white" />
        </button>

        {/* ── Header (terracotta) ───────────────────────────────── */}
        <div className="px-6 pt-6 pb-2" style={{ background: TERRACOTTA }}>
          {/* Eyebrow */}
          <div className="flex items-center gap-2 mb-3">
            <Receipt size={14} weight="bold" color="rgba(255,255,255,0.65)" />
            <span
              className="text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{ color: "rgba(255,255,255,0.65)" }}
            >
              Payment Receipt
            </span>
          </div>

          {/* Reference code */}
          <p
            className="text-[11px] mb-0.5"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            {referenceLabel}
          </p>
          <div className="flex items-center gap-1.5">
            <h2 className="text-[17px] font-bold tracking-tight  text-white leading-snug">
              {referenceValue}
            </h2>
            <CopyButton text={referenceValue} />
          </div>

          {/* Status pill */}
          <div className="mt-3 pb-5">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide"
              style={{
                background: "rgba(255,255,255,0.20)",
                color: "white",
              }}
            >
              <cfg.Icon size={10} weight="fill" />
              {cfg.label}
            </span>
          </div>
        </div>

        {/* ── Scalloped transition ──────────────────────────────── */}
        <ScallopEdge fillTop={TERRACOTTA} fillBottom={CREAM} />

        {/* ── Scrollable body ───────────────────────────────────── */}
        <div
          className="px-5 pb-2 space-y-4 overflow-y-auto"
          style={{ maxHeight: "58vh", background: CREAM }}
        >
          {/* Customer */}
          <section>
            <p
              className="mb-2 text-[9px] font-bold uppercase tracking-[0.14em]"
              style={{ color: "#B08070" }}
            >
              Customer
            </p>
            <div
              className="flex items-center gap-3 rounded-2xl p-3"
              style={{ background: "#F5E8DF" }}
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{ background: "rgba(193,113,79,0.15)" }}
              >
                <User size={16} weight="duotone" color={TERRACOTTA} />
              </div>
              <div>
                <p
                  className="font-semibold text-sm"
                  style={{ color: "#3D2B1F" }}
                >
                  {customerName}
                </p>
                <p className="text-[11px]" style={{ color: "#9C7B6B" }}>
                  {customerPhone}
                </p>
              </div>
            </div>
          </section>

          {/* Layanan / Paket Keanggotaan */}
          <section>
            <p
              className="mb-2 text-[9px] font-bold uppercase tracking-[0.14em]"
              style={{ color: "#B08070" }}
            >
              {isMembershipPayment ? "Paket Keanggotaan" : "Layanan"}
            </p>
            <div
              className="rounded-2xl p-3 space-y-2.5"
              style={{ background: "#F5E8DF" }}
            >
              {isMembershipPayment ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag size={11} color={TERRACOTTA} weight="duotone" />
                    <span
                      className="text-[12px] font-medium"
                      style={{ color: "#3D2B1F" }}
                    >
                      {member?.membership_package?.name}
                    </span>
                  </div>
                  <span
                    className="text-[11px] font-semibold"
                    style={{ color: "#3D2B1F" }}
                  >
                    {IDR(payment.amount)}
                  </span>
                </div>
              ) : (
                <>
                  <p className="text-[11px]" style={{ color: "#9C7B6B" }}>
                    {fmtDate(booking!.schedule_date)} ·{" "}
                    {fmtTime(booking!.schedule_date)} · {booking!.duration_minutes}{" "}
                    menit
                  </p>
                  {booking!.service_variants.map((sv) => (
                    <div key={sv.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Tag size={11} color={TERRACOTTA} weight="duotone" />
                        <span
                          className="text-[12px] font-medium"
                          style={{ color: "#3D2B1F" }}
                        >
                          {sv.name}
                        </span>
                        <span className="text-[10px]" style={{ color: "#B08070" }}>
                          {sv.duration_minutes}m
                        </span>
                      </div>
                      <span
                        className="text-[11px] font-semibold"
                        style={{ color: "#3D2B1F" }}
                      >
                        {IDR(sv.retail_price)}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </section>

          {/* Metode Pembayaran */}
          <section>
            <p
              className="mb-2 text-[9px] font-bold uppercase tracking-[0.14em]"
              style={{ color: "#B08070" }}
            >
              Metode Pembayaran
            </p>
            <div
              className="rounded-2xl overflow-hidden divide-y divide-[#EDD9CC]"
              style={{
                background: "white",
                borderColor: "#EDD9CC",
                borderWidth: 1,
                borderStyle: "solid",
              }}
            >
              <DetailRow label="Via">
                {viaLabel[payment.via ?? ""] ?? payment.via ?? "—"}
              </DetailRow>
              <DetailRow label="Channel" className="border-t border-[#EDD9CC]">
                {channelLabel[payment.channel ?? ""] ?? payment.channel ?? "—"}
              </DetailRow>
              {payment.ipaymu_trx_id && (
                <DetailRow label="iPaymu TRX ID">
                  <span className=" text-[11px] flex items-center gap-1">
                    {payment.ipaymu_trx_id}
                    <CopyButton text={payment.ipaymu_trx_id} />
                  </span>
                </DetailRow>
              )}
              {payment.paid_at && (
                <DetailRow label="Dibayar Pada">
                  {fmtDateTime(payment.paid_at)}
                </DetailRow>
              )}
              {payment.payment_url_expires_at &&
                payment.status === "pending" && (
                  <DetailRow label="Kadaluarsa">
                    <span style={{ color: "#D97706" }}>
                      {fmtDateTime(payment.payment_url_expires_at)}
                    </span>
                  </DetailRow>
                )}
            </div>
          </section>

          {/* Rincian Biaya */}
          <section>
            <p
              className="mb-2 text-[9px] font-bold uppercase tracking-[0.14em]"
              style={{ color: "#B08070" }}
            >
              Rincian Biaya
            </p>
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: "white", border: "1px solid #EDD9CC" }}
            >
              <DetailRow label="Subtotal Layanan">
                {IDR(payment.amount)}
              </DetailRow>
              <DetailRow
                label="Biaya Layanan"
                className="border-t border-[#EDD9CC]"
              >
                {IDR(payment.fee)}
              </DetailRow>
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{
                  background: "#FDF0E8",
                  borderTop: "1px solid #EDD9CC",
                }}
              >
                <span
                  className="text-sm font-bold"
                  style={{ color: "#3D2B1F" }}
                >
                  Total Dibayar
                </span>
                <span
                  className="text-sm font-bold"
                  style={{
                    color: payment.status === "paid" ? "#2E7D52" : "#3D2B1F",
                  }}
                >
                  {IDR(
                    payment.paid_off > 0
                      ? payment.paid_off
                      : payment.amount + payment.fee,
                  )}
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* ── Footer ───────────────────────────────────────────── */}
        <div
          className="px-5 py-4 flex flex-col gap-2.5"
          style={{ background: CREAM, borderTop: "1px solid #EDD9CC" }}
        >
          {payment.payment_url && payment.status === "pending" && (
            <a
              href={payment.payment_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-1.5 rounded-2xl py-3 text-xs font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: TERRACOTTA }}
            >
              <ArrowSquareOut size={13} weight="bold" />
              Buka Payment Link
            </a>
          )}
          <button
            onClick={onClose}
            className="flex w-full items-center justify-center rounded-2xl py-3 text-xs font-semibold transition-colors hover:opacity-80"
            style={{
              background: "white",
              border: "1px solid #DFC5B4",
              color: "#7A5545",
            }}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
