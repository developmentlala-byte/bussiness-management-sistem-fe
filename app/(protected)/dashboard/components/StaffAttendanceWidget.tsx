import Image from "next/image";

export function StaffAttendanceWidget({
  staff,
  hadir,
  absen,
}: {
  staff: Array<{
    name: string;
    attand_in: string;
    attand_out: string;
    status: string;
    color: string;
    img?: string;
  }>;
  hadir: number;
  absen: number;
}) {
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
          Staff Attendance
        </h3>
        <p
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--muted)",
            marginTop: "var(--space-1)",
          }}
        >
          Today
        </p>
      </div>
      <div style={{ padding: "var(--card-padding-md)" }}>
        <div className="flex flex-col gap-3">
          {staff.map((k, i) => (
            <div key={i} className="flex items-center gap-3">
              {k.img ? (
                <Image
                  src={k.img}
                  alt={k.name}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-md border border-border object-cover"
                  unoptimized
                />
              ) : (
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold text-surface"
                  style={{ backgroundColor: k.color }}
                >
                  {k.name.charAt(0)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div
                  className="truncate text-xs font-semibold"
                  style={{ color: "var(--foreground)" }}
                >
                  {k.name}
                </div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>
                  {k.attand_in !== "—"
                    ? `${k.attand_in} – ${k.attand_out}`
                    : "Not clocked in"}
                </div>
              </div>
              <span
                className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold uppercase"
                style={{
                  fontSize: "var(--text-xs)",
                  backgroundColor:
                    k.status === "H"
                      ? "color-mix(in oklch, var(--success) 15%, transparent)"
                      : "color-mix(in oklch, var(--danger) 15%, transparent)",
                  color: k.status === "H" ? "var(--success)" : "var(--danger)",
                }}
              >
                {k.status === "H" ? "Hadir" : "Absen"}
              </span>
            </div>
          ))}
        </div>
        <div
          className="mt-4 border-t border-border pt-3"
          style={{ borderColor: "var(--separator)" }}
        >
          <div className="flex justify-between text-xs font-medium">
            <span style={{ color: "var(--success)" }}>{hadir} hadir</span>
            <span style={{ color: "var(--danger)" }}>{absen} absen</span>
            <span style={{ color: "var(--muted)" }}>{staff.length} total</span>
          </div>
        </div>
      </div>
    </div>
  );
}
