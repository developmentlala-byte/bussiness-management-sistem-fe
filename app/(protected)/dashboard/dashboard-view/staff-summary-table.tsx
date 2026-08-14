"use client";

import React from "react";
import { Avatar } from "@heroui/react";
import { IDR } from "@/app/libs/idr";

interface StaffSummaryTableProps {
  staffs: any[];
}

export default function StaffSummaryTable({ staffs }: StaffSummaryTableProps) {
  const totals = staffs.reduce(
    (acc, s) => {
      acc.bookings += s.booking_stats?.total_bookings ?? 0;
      acc.services += s.booking_stats?.total_services ?? 0;
      acc.hours += s.booking_stats?.total_hours ?? 0;
      acc.revenue += s.financial_summary?.revenueThisMonth ?? 0;
      return acc;
    },
    { bookings: 0, services: 0, hours: 0, revenue: 0 },
  );

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
        <h3 style={{ fontSize: "var(--text-base)", fontWeight: 600 }}>
          Ringkasan Kinerja Staf
        </h3>
        <p
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--muted)",
            marginTop: "var(--space-1)",
          }}
        >
          Booking &amp; layanan bulan berjalan · Revenue dihitung dari harga
          item yang dikerjakan
          {/* item yang dikerjakan (belum dipotong diskon/voucher) */}
        </p>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            minWidth: "600px",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "var(--surface-secondary)" }}>
              <th style={headerStyle}>Staf</th>
              <th style={{ ...headerStyle, textAlign: "center" }}>Booking</th>
              <th style={{ ...headerStyle, textAlign: "center" }}>
                Item Layanan
              </th>
              <th style={{ ...headerStyle, textAlign: "center" }}>Jam</th>
              <th style={{ ...headerStyle, textAlign: "right" }}>
                Revenue
                {/* <span
                  style={{
                    display: "block",
                    fontSize: "9px",
                    fontWeight: 500,
                    textTransform: "none",
                    letterSpacing: "normal",
                    color: "var(--muted)",
                    marginTop: "2px",
                  }}
                >
                  sebelum diskon
                </span> */}
              </th>
            </tr>
          </thead>
          <tbody>
            {staffs.map((s) => (
              <tr
                key={s.id}
                style={{ borderBottom: "1px solid var(--separator)" }}
                className="hover:bg-default/5 transition-colors"
              >
                <td style={cellStyle}>
                  <div className="flex items-center gap-2">
                    <Avatar
                      src={s.avatar_path}
                      name={s.first_name}
                      size="sm"
                      className="w-8 h-8 min-w-[32px] border border-border"
                    />
                    <div className="flex flex-col min-w-0">
                      <span
                        className="truncate"
                        style={{ fontWeight: 600, fontSize: "var(--text-xs)" }}
                      >
                        {s.first_name}
                      </span>
                      <span
                        className="truncate"
                        style={{ fontSize: "10px", color: "var(--muted)" }}
                      >
                        {s.job_title}
                      </span>
                    </div>
                  </div>
                </td>
                <td style={{ ...cellStyle, textAlign: "center" }}>
                  <span className="font-medium">
                    {s.booking_stats?.total_bookings ?? 0}
                  </span>
                </td>
                <td style={{ ...cellStyle, textAlign: "center" }}>
                  <span className="font-semibold text-accent">
                    {s.booking_stats?.total_services ?? 0}
                  </span>
                </td>
                <td style={{ ...cellStyle, textAlign: "center" }}>
                  <span className="text-muted">
                    {s.booking_stats?.total_hours ?? 0}j
                  </span>
                </td>
                <td
                  style={{
                    ...cellStyle,
                    textAlign: "right",
                    fontWeight: 700,
                    color: "var(--foreground)",
                  }}
                >
                  {IDR(s.financial_summary?.revenueThisMonth ?? 0)}
                </td>
              </tr>
            ))}
            {staffs.length > 0 && (
              <tr
                style={{
                  backgroundColor: "var(--surface-secondary)",
                  fontWeight: 800,
                }}
              >
                <td
                  style={{
                    ...cellStyle,
                    textAlign: "left",
                    fontSize: "var(--text-xs)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  TOTAL
                </td>
                <td style={{ ...cellStyle, textAlign: "center" }}>
                  {totals.bookings}
                </td>
                <td style={{ ...cellStyle, textAlign: "center" }}>
                  {totals.services}
                </td>
                <td style={{ ...cellStyle, textAlign: "center" }}>
                  {Math.round(totals.hours * 10) / 10}j
                </td>
                <td style={{ ...cellStyle, textAlign: "right" }}>
                  {IDR(totals.revenue)}
                </td>
              </tr>
            )}
            {staffs.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    ...cellStyle,
                    textAlign: "center",
                    color: "var(--muted)",
                    padding: "var(--space-8)",
                  }}
                >
                  Tidak ada data staf
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const headerStyle: React.CSSProperties = {
  padding: "var(--table-cell-py) var(--table-cell-px)",
  fontSize: "var(--text-xs)",
  fontWeight: 700,
  color: "var(--muted)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  textAlign: "left",
};

const cellStyle: React.CSSProperties = {
  padding: "var(--table-cell-py) var(--table-cell-px)",
  fontSize: "var(--text-sm)",
  color: "var(--foreground)",
  height: "var(--table-row-height)",
  verticalAlign: "middle",
};
