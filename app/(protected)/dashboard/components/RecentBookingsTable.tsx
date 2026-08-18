import { formatWallClockDate } from "@/app/libs/date-format";
import { IDR } from "@/app/libs/idr";
import { cn } from "@heroui/styles";
import { BookingItem } from "../dashboard-view/dashboard-admin";

export function RecentBookingsTable({ bookings }: { bookings: BookingItem[] }) {
  return (
    <div
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
      }}
    >
      <div
        className="flex items-center justify-between"
        style={{
          padding: "var(--card-padding-md)",
          borderBottom: "1px solid var(--separator)",
        }}
      >
        <div>
          <h3
            style={{
              fontSize: "var(--text-base)",
              fontWeight: 600,
              color: "var(--foreground)",
            }}
          >
            Booking Terbaru
          </h3>
          <p
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--muted)",
              marginTop: "var(--space-1)",
            }}
          >
            30 Hari Terakhir
          </p>
        </div>
        <button
          style={{
            padding: "var(--space-2) var(--space-3)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border)",
            backgroundColor: "var(--surface-secondary)",
            fontSize: "var(--text-xs)",
            fontWeight: 500,
            color: "var(--foreground)",
            cursor: "pointer",
          }}
        >
          View All
        </button>
      </div>
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table
          style={{
            width: "100%",
            minWidth: "600px",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "var(--surface-secondary)" }}>
              {["Customer", "Package", "Duration", "Dates"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "var(--table-cell-py) var(--table-cell-px)",
                    fontSize: "var(--text-xs)",
                    fontWeight: 600,
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    textAlign: "left",
                    borderBottom: "1px solid var(--border)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
              {["Amount", "Status"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "var(--table-cell-py) var(--table-cell-px)",
                    fontSize: "var(--text-xs)",
                    fontWeight: 600,
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    textAlign: "right",
                    borderBottom: "1px solid var(--border)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking, i) => {
              const isBundle =
                booking.booking_bundle_promos &&
                booking.booking_bundle_promos.length > 0;
              const serviceName =
                !isBundle &&
                booking.service_variants &&
                booking.service_variants.length > 0
                  ? booking.service_variants.map((item) => item.name).join(", ")
                  : null;
              return (
                <tr
                  key={booking.id ?? i}
                  style={{ borderBottom: "1px solid var(--separator)" }}
                >
                  <td
                    style={{
                      padding: "var(--table-cell-py) var(--table-cell-px)",
                      fontSize: "var(--text-sm)",
                      color: "var(--foreground)",
                      height: "var(--table-row-height)",
                      verticalAlign: "middle",
                    }}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium capitalize">
                        {booking.customer_name.toLowerCase() || "—"}
                      </span>
                      <span
                        style={{
                          fontSize: "var(--text-xs)",
                          color: "var(--muted)",
                        }}
                      >
                        {booking.customer_phone || "—"}
                      </span>
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "var(--table-cell-py) var(--table-cell-px)",
                      fontSize: "var(--text-sm)",
                      color: "var(--foreground)",
                      height: "var(--table-row-height)",
                      verticalAlign: "middle",
                    }}
                  >
                    <div className="flex flex-col">
                      <span>
                        {isBundle
                          ? booking.booking_bundle_promos?.[0]?.bundle_name ||
                            booking.booking_bundle_promos?.[0]?.bundle_promo
                              ?.name
                          : (serviceName ?? "Spa Service")}
                      </span>
                      <span
                        style={{
                          fontSize: "var(--text-xs)",
                          color: "var(--muted)",
                        }}
                      >
                        by{" "}
                        {booking.therapists
                          ?.map((t) => (typeof t === "string" ? t : t.name))
                          .join(", ") || "—"}
                      </span>
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "var(--table-cell-py) var(--table-cell-px)",
                      fontSize: "var(--text-sm)",
                      color: "var(--muted)",
                      height: "var(--table-row-height)",
                      verticalAlign: "middle",
                    }}
                  >
                    {booking.duration_minutes
                      ? `${booking.duration_minutes} mins`
                      : "-"}
                  </td>
                  <td
                    style={{
                      padding: "var(--table-cell-py) var(--table-cell-px)",
                      fontSize: "var(--text-sm)",
                      color: "var(--muted)",
                      height: "var(--table-row-height)",
                      verticalAlign: "middle",
                    }}
                  >
                    {formatWallClockDate(booking.schedule_date)}
                  </td>
                  <td
                    style={{
                      padding: "var(--table-cell-py) var(--table-cell-px)",
                      fontSize: "var(--text-sm)",
                      fontWeight: 500,
                      color: "var(--foreground)",
                      height: "var(--table-row-height)",
                      verticalAlign: "middle",
                      textAlign: "right",
                    }}
                  >
                    {IDR(Number(booking.total_amount ?? 0))}
                  </td>
                  <td
                    style={{
                      padding: "var(--table-cell-py) var(--table-cell-px)",
                      height: "var(--table-row-height)",
                      verticalAlign: "middle",
                      textAlign: "right",
                    }}
                  >
                    <StatusBadge
                      status={
                        booking.status ?? booking.payment_status ?? "Pending"
                      }
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Confirmed: "bg-(--success)/10 text-success",
    Pending: "bg-[var(--warning)]/15 text-[var(--warning)]",
    Canceled: "bg-(--danger)/10 text-danger",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[9px] font-bold tracking-wide uppercase",
        map[status] ?? "bg-surface-secondary text-muted",
      )}
    >
      <span className="h-1.5 w-1.5 rounded-md bg-current" />
      {status}
    </span>
  );
}
