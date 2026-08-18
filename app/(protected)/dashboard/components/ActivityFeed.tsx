import { formatWallClockDate } from "@/app/libs/date-format";
import { Calendar } from "@phosphor-icons/react";
import { BookingItem } from "../dashboard-view/dashboard-admin";

export function ActivityFeed({ items }: { items: BookingItem[] }) {
  const getServiceLabel = (booking: BookingItem) => {
    const isBundle =
      booking.booking_bundle_promos && booking.booking_bundle_promos.length > 0;

    if (isBundle) {
      const b = booking.booking_bundle_promos?.[0];
      return (
        b?.bundle_name || b?.name || b?.bundle_promo?.name || "Spa Service"
      );
    }

    if (booking.service_variants && booking.service_variants.length > 0) {
      return booking.service_variants.map((item) => item.name).join(", ");
    }

    return "Spa Service";
  };

  return (
    <div
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        height: "100%",
      }}
    >
      <div
        style={{
          padding: "var(--card-padding-md)",
          borderBottom: "1px solid var(--separator)",
        }}
      >
        <h3
          style={{
            fontSize: "var(--text-base)",
            fontWeight: 600,
            color: "var(--foreground)",
          }}
        >
          Booking Activity
        </h3>
        {/* FIX: label sebelumnya "Today" nyesatkan — isi widget ini adalah
            booking yang DIBUAT hari ini, jadwalnya bisa di masa depan */}
        <p
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--muted)",
            marginTop: "var(--space-1)",
          }}
        >
          Booking dibuat hari ini
        </p>
      </div>
      <div className="flex flex-col" style={{ padding: "var(--space-3) 0" }}>
        {items.slice(0, 5).map((item, i) => (
          <div
            key={item.id}
            className="flex"
            style={{
              gap: "var(--space-3)",
              padding: `var(--space-3) var(--card-padding-md)`,
            }}
          >
            <div
              className="flex flex-col items-center"
              style={{ gap: "var(--space-1)", flexShrink: 0 }}
            >
              <div
                className="rounded-full flex items-center justify-center"
                style={{
                  width: "var(--icon-md)",
                  height: "var(--icon-md)",
                  backgroundColor: "var(--accent-100)",
                  color: "var(--accent)",
                  marginTop: "4px",
                }}
              >
                <Calendar size={14} />
              </div>
              {i < items.slice(0, 5).length - 1 && (
                <div
                  style={{
                    width: "1px",
                    flex: 1,
                    backgroundColor: "var(--separator)",
                    minHeight: "16px",
                  }}
                />
              )}
            </div>
            <div
              className="flex flex-col min-w-0"
              style={{ gap: "var(--space-1)", paddingBottom: "var(--space-3)" }}
            >
              <p
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--foreground)",
                  lineHeight: 1.5,
                }}
              >
                {item.customer_name} - {getServiceLabel(item)}
              </p>
              <span
                style={{ fontSize: "var(--text-xs)", color: "var(--muted)" }}
              >
                {formatWallClockDate(item.schedule_date, { withTime: true })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
