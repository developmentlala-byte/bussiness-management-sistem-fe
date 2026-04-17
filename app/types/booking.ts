// types/booking.ts

export type BookingStatus = "Pending" | "Confirmed" | "Completed" | "Cancelled";
export type PaymentStatus = "Unpaid" | "Paid" | "Refunded";

export interface SpaBooking {
  id: string; // Menggunakan UUID atau string unik (misal: "BK-20260417-001")
  customerName: string;
  customerPhone: string; // Penting untuk notifikasi WhatsApp/SMS
  serviceName: string; // Jenis treatment (misal: "Balinese Deep Tissue")
  therapistName: string; // Staf yang ditugaskan
  scheduleDate: string; // Format ISO: "2026-04-18T10:00:00Z"
  durationMinutes: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  totalAmount: number;
}
