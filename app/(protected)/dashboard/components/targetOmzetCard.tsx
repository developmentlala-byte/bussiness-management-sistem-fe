"use client";

import { IDR } from "@/app/libs/idr";
import { cn } from "@heroui/styles";
import { Target, Info, TrendUp, TrendDown } from "@phosphor-icons/react";
import { ProgressBar, Button, Tooltip, Chip } from "@heroui/react";
import { useMemo } from "react";

interface TargetOmzetCardProps {
  currentRevenue: number;
  targetAmount: number | null;
  onSetTarget?: () => void;
  isLoading?: boolean;
}

export default function TargetOmzetCard({
  currentRevenue,
  targetAmount,
  onSetTarget,
  isLoading,
}: TargetOmzetCardProps) {
  const paceData = useMemo(() => {
    if (targetAmount === null || targetAmount <= 0) return null;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const currentDay = now.getDate();

    const dailyPace = targetAmount / totalDaysInMonth;
    const expectedPace = dailyPace * currentDay;
    const gap = currentRevenue - expectedPace;
    const gapPercentage = (gap / expectedPace) * 100;
    const achievement = (currentRevenue / targetAmount) * 100;

    const progressRatio = currentRevenue / expectedPace;
    let status: "ON TRACK" | "AT RISK" | "BELOW TARGET" = "BELOW TARGET";
    let statusColor: "success" | "warning" | "danger" = "danger";

    if (progressRatio >= 1.0) {
      status = "ON TRACK";
      statusColor = "success";
    } else if (progressRatio >= 0.85) {
      status = "AT RISK";
      statusColor = "warning";
    }

    const formatCompact = (num: number) => {
      const absNum = Math.abs(num);
      if (absNum >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}jt`;
      if (absNum >= 1_000) return `${(num / 1_000).toFixed(0)}rb`;
      return num.toString();
    };

    return {
      dailyPace,
      expectedPace,
      gap,
      gapPercentage,
      achievement,
      status,
      statusColor,
      formatCompactGap: formatCompact(gap),
      isAhead: gap >= 0,
    };
  }, [currentRevenue, targetAmount]);

  if (isLoading) {
    return (
      <div
        className="flex flex-col justify-between h-full animate-pulse w-full!"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--card-padding-md)",
        }}
      >
        <div className="h-4 w-24 bg-muted/20 rounded mb-4" />
        <div className="h-8 w-32 bg-muted/20 rounded mb-4" />
        <div className="h-2 w-full bg-muted/20 rounded" />
      </div>
    );
  }

  if (targetAmount === null || targetAmount <= 0) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full text-center"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px dashed var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--card-padding-md)",
          gap: "var(--space-3)",
        }}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/10 text-muted">
          <Target size={20} />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            Target omzet belum diatur
          </p>
          <p className="text-xs text-muted mt-1">
            Atur target bulanan untuk memantau performa bisnis.
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onPress={onSetTarget}
          className="h-8 text-xs font-semibold"
        >
          Set Target Sekarang
        </Button>
      </div>
    );
  }

  const percentage = Math.min(
    100,
    Math.round((currentRevenue / (targetAmount || 1)) * 100),
  );
  const remaining = Math.max(0, (targetAmount || 0) - currentRevenue);
  const isAchieved = currentRevenue >= (targetAmount || 0);

  return (
    <div
      className="flex flex-col justify-between h-full w-full!"
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--card-padding-md)",
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-0.5">
          <span
            className="uppercase tracking-widest font-semibold"
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--muted)",
              letterSpacing: "0.08em",
            }}
          >
            Target Pencapaian
          </span>
          <span className="text-[10px] text-muted font-medium">
            Agustus 2026
          </span>
        </div>
        <div className="flex items-center gap-2">
          {paceData && (
            <Chip
              size="sm"
              variant="flat"
              color={paceData.statusColor}
              className="h-5 px-1.5 text-[9px] font-bold uppercase tracking-wider"
            >
              {paceData.status}
            </Chip>
          )}
          {/* Tooltip cuma jalan pas hover, jadi cuma ditampilin di desktop */}
          <div className="hidden lg:block">
            <Tooltip delay={0}>
              <Tooltip.Trigger aria-label="Info target">
                <div className="text-muted/50 hover:text-muted cursor-help">
                  <Info size={14} />
                </div>
              </Tooltip.Trigger>
              <Tooltip.Content>
                <div className="p-1 space-y-2 text-xs">
                  <p className="font-bold border-b border-border pb-1">
                    Analisis Target
                  </p>
                  {paceData && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between gap-4">
                        <span className="text-muted">Pace Harian:</span>
                        <span className="font-medium">
                          {IDR(paceData.dailyPace)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted">
                          Seharusnya s/d Hari ini:
                        </span>
                        <span className="font-medium">
                          {IDR(paceData.expectedPace)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4 border-t border-border pt-1">
                        <span className="text-muted">Gap:</span>
                        <span
                          className={cn(
                            "font-bold",
                            paceData.isAhead ? "text-success" : "text-danger",
                          )}
                        >
                          {paceData.isAhead ? "+" : ""}
                          {IDR(paceData.gap)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </Tooltip.Content>
            </Tooltip>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <p
                className="text-2xl font-bold text-foreground leading-none"
                title={IDR(currentRevenue)}
              >
                {percentage}%
              </p>
              {paceData && (
                <div
                  className={cn(
                    "flex items-center gap-0.5 text-[10px] font-bold px-1 rounded",
                    paceData.isAhead
                      ? "text-success bg-success/10"
                      : "text-danger bg-danger/10",
                  )}
                >
                  {paceData.isAhead ? (
                    <TrendUp size={10} weight="bold" />
                  ) : (
                    <TrendDown size={10} weight="bold" />
                  )}
                  {paceData.formatCompactGap}
                </div>
              )}
            </div>
            <p className="text-[10px] text-muted mt-2 font-medium truncate">
              Target : {IDR(targetAmount || 0)}
            </p>
          </div>
          {isAchieved ? (
            <span className="text-[10px] font-bold text-success uppercase tracking-wider bg-success/10 px-2 py-0.5 rounded">
              Achieved
            </span>
          ) : (
            <span className="text-[10px] font-semibold text-muted">
              Sisa {IDR(remaining)}
            </span>
          )}
        </div>

        <ProgressBar
          aria-label="Target Omzet Progress"
          value={percentage}
          color={
            isAchieved
              ? "success"
              : paceData?.statusColor === "danger"
                ? "danger"
                : paceData?.statusColor === "warning"
                  ? "warning"
                  : "accent"
          }
          size="sm"
          className="[&_.progress-bar__output]:hidden"
        >
          <ProgressBar.Track>
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>
      </div>

      {/* Versi mobile: konten tooltip ditampilin permanen kayak footer card */}
      {paceData && (
        <div className="lg:hidden mt-4 pt-3 border-t border-border space-y-1.5">
          <p className="text-[10px] font-bold text-muted uppercase tracking-wider">
            Analisis Target
          </p>
          <div className="flex justify-between gap-4 text-xs">
            <span className="text-muted">Pace Harian</span>
            <span className="font-medium">{IDR(paceData.dailyPace)}</span>
          </div>
          <div className="flex justify-between gap-4 text-xs">
            <span className="text-muted">Seharusnya s/d Hari ini</span>
            <span className="font-medium">{IDR(paceData.expectedPace)}</span>
          </div>
          <div className="flex justify-between gap-4 text-xs border-t border-border pt-1.5">
            <span className="text-muted">Gap</span>
            <span
              className={cn(
                "font-bold",
                paceData.isAhead ? "text-success" : "text-danger",
              )}
            >
              {paceData.isAhead ? "+" : ""}
              {IDR(paceData.gap)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
