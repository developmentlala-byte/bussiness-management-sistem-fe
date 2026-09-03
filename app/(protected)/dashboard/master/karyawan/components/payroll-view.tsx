"use client";

import { useCallback, useMemo, useState } from "react";
import {
  CurrencyDollar,
  DownloadSimple,
  ShieldCheck,
  PencilSimple,
  LockKey,
  X,
} from "@phosphor-icons/react";
import { createColumnHelper } from "@tanstack/react-table";
import {
  Button,
  Chip,
  Label,
  Modal,
  InputOTP,
  REGEXP_ONLY_DIGITS,
} from "@heroui/react";
import { useApiFetch, usePost, usePut } from "@/app/libs/use-http";
import { DataTable } from "@/app/components/data-table";
import { MoneyInput } from "@/app/components/moneyInput";
import { formatCurrency } from "@/app/libs/format-rupiah";

interface PayrollDetail {
  id?: number;
  payroll_id?: number;
  gaji_pokok: number;
  lembur: number;
  uang_makan: number;
  bonus: number;
  komisi: number;
  potongan_absen: number;
  sisa_hutang_bulan_lalu: number;
  hutang_bulan_ini: number;
  potongan_lainnya: number;
}

interface PayrollStaff {
  id: number;
  first_name: string;
  last_name?: string;
  employee_code?: string;
  job_title?: string;
}

interface PayrollPeriod {
  id: number;
  period_month: string;
  status: string;
}

interface PayrollRecord {
  id: number;
  staff_id: number;
  period_id: number;
  base_salary: number;
  working_days_normal: number;
  working_days_effective: number;
  gross_salary: number;
  net_salary: number;
  deductions: number;
  status: "draft" | "approved" | "paid";
  approved_by?: number | null;
  approved_at?: string | null;
  paid_at?: string | null;
  created_at?: string;
  staff?: PayrollStaff;
  period?: PayrollPeriod;
  details?: PayrollDetail | null;
}

const formatMonth = (month?: string | null) => {
  if (!month) return "-";
  const [year, monthNumber] = month.split("-");
  if (!year || !monthNumber) return month;

  const m = Number(monthNumber) - 1;
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(new Date(Number(year), m, 1));
};

const statusColorMap: Record<
  PayrollRecord["status"],
  "warning" | "success" | "accent"
> = {
  draft: "warning",
  approved: "success",
  paid: "accent",
};

const statusLabelMap: Record<PayrollRecord["status"], string> = {
  draft: "Draft",
  approved: "Approved",
  paid: "Dibayar",
};

const incomeFields = [
  ["gaji_pokok", "Gaji Pokok"],
  ["lembur", "Lembur"],
  ["uang_makan", "Uang Makan"],
  ["bonus", "Bonus"],
  ["komisi", "Komisi"],
] as const;

const deductionFields = [
  ["potongan_absen", "Potongan Absen"],
  ["sisa_hutang_bulan_lalu", "Sisa Hutang Bulan Lalu"],
  ["hutang_bulan_ini", "Hutang Bulan Ini"],
  ["potongan_lainnya", "Potongan Lainnya"],
] as const;

const columnHelper = createColumnHelper<PayrollRecord>();

export default function PayrollView() {
  const currentMonth = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [editingPayroll, setEditingPayroll] = useState<PayrollRecord | null>(
    null,
  );
  const [approvingPayroll, setApprovingPayroll] =
    useState<PayrollRecord | null>(null);

  const { data, isLoading, refetch } = useApiFetch<{ data: PayrollRecord[] }>(
    ["payrolls", selectedMonth],
    "/master/payroll/periods",
    { month: selectedMonth },
    true,
  );

  const payrolls = data?.data ?? [];
  console.log("🚀 ~ PayrollView ~ payrolls:", payrolls);

  const updateMutation = usePut<
    { data?: PayrollRecord },
    { payrollId: number; details: Omit<PayrollDetail, "id" | "payroll_id"> }
  >((variables) => `/master/payroll/${variables.payrollId}`, {
    invalidate: [["payrolls", selectedMonth]],
    onSuccess: () => {
      setEditingPayroll(null);
      refetch();
    },
  });

  const approveMutation = usePost<
    { data?: PayrollRecord },
    { payrollId: number; pin: string }
  >(
    (variables: { payrollId: number; pin: string }) =>
      `/master/payroll/${variables.payrollId}/approve`,
    {
      invalidate: [["payrolls", selectedMonth]],
      onSuccess: () => refetch(),
    },
  );

  const markPaidMutation = usePost<
    { data?: PayrollRecord },
    { payrollId: number }
  >(
    (variables: { payrollId: number }) =>
      `/master/payroll/${variables.payrollId}/mark-paid`,
    {
      invalidate: [["payrolls", selectedMonth]],
      onSuccess: () => refetch(),
    },
  );

  const handleApproveSubmit = (pin: string) => {
    if (!approvingPayroll) return;
    approveMutation.mutate({ payrollId: approvingPayroll.id, pin });
    setApprovingPayroll(null);
  };

  const handleDownloadSlip = useCallback(
    async (payroll: PayrollRecord) => {
      if (!payroll.staff) return;

      try {
        const token = localStorage.getItem("token");
        const baseUrl =
          process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";
        const month = payroll.period?.period_month ?? selectedMonth;
        const response = await fetch(
          `${baseUrl}/master/staffs/${payroll.staff.id}/slip-gaji/download?month=${encodeURIComponent(month)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "ngrok-skip-browser-warning": "true",
            },
          },
        );

        if (!response.ok) {
          throw new Error("Download slip gaji gagal");
        }

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = `slip-gaji-${payroll.staff.employee_code || payroll.staff.id}-${month}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);
      } catch (error) {
        console.error("Download slip gaji error:", error);
        alert("Gagal mendownload slip gaji.");
      }
    },
    [selectedMonth],
  );

  const handleMarkPaid = useCallback(
    (payroll: PayrollRecord) => {
      markPaidMutation.mutate({ payrollId: payroll.id });
    },
    [markPaidMutation],
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor("staff", {
        header: "Staf",
        cell: (info) => {
          const staff = info.getValue();
          return (
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">
                {staff?.first_name ?? "-"} {staff?.last_name ?? ""}
              </span>
              <span className="text-xs text-muted-foreground">
                {staff?.employee_code ?? "-"}
              </span>
            </div>
          );
        },
      }),
      columnHelper.accessor("period", {
        header: "Periode",
        cell: (info) => (
          <span className="text-sm text-muted-foreground">
            {info.getValue()?.period_month
              ? formatMonth(info.getValue()?.period_month)
              : "-"}
          </span>
        ),
      }),
      columnHelper.accessor("base_salary", {
        header: "Gaji Pokok",
        cell: (info) => (
          <span className="block text-right text-sm font-medium text-foreground">
            {formatCurrency(info.getValue())}
          </span>
        ),
      }),
      columnHelper.accessor("gross_salary", {
        header: "Gross",
        cell: (info) => (
          <span className="block text-right text-sm font-medium text-foreground">
            {formatCurrency(info.getValue())}
          </span>
        ),
      }),
      columnHelper.accessor("deductions", {
        header: "Deductions",
        cell: (info) => (
          <span className="block text-right text-sm font-medium text-foreground">
            {formatCurrency(info.getValue())}
          </span>
        ),
      }),
      columnHelper.accessor("net_salary", {
        header: "Net",
        cell: (info) => (
          <span className="block text-right text-sm font-semibold text-emerald-600">
            {formatCurrency(info.getValue())}
          </span>
        ),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => (
          <Chip
            size="sm"
            variant="primary"
            color={statusColorMap[info.getValue()]}
          >
            {statusLabelMap[info.getValue()]}
          </Chip>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        enableSorting: false,
        cell: (info) => {
          const payroll = info.row.original;

          return (
            <div
              className="flex items-center justify-end gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              {payroll.status === "draft" && (
                <>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="secondary"
                    aria-label="Edit payroll"
                    onPress={() => setEditingPayroll(payroll)}
                  >
                    <PencilSimple className="size-4" />
                  </Button>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="primary"
                    aria-label="Approve payroll"
                    isDisabled={approveMutation.isPending}
                    onPress={() => setApprovingPayroll(payroll)}
                  >
                    <ShieldCheck className="size-4" />
                  </Button>
                </>
              )}

              {(payroll.status === "approved" || payroll.status === "paid") && (
                <Button
                  isIconOnly
                  size="sm"
                  variant="secondary"
                  aria-label="Download slip gaji"
                  onPress={() => handleDownloadSlip(payroll)}
                >
                  <DownloadSimple className="size-4" />
                </Button>
              )}

              {payroll.status === "approved" && (
                <>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="primary"
                    aria-label="Tandai dibayar"
                    isDisabled={markPaidMutation.isPending}
                    onPress={() => handleMarkPaid(payroll)}
                  >
                    <CurrencyDollar className="size-4" />
                  </Button>
                </>
              )}
            </div>
          );
        },
        footer: () => null,
      }),
    ],
    [
      approveMutation.isPending,
      markPaidMutation.isPending,
      handleDownloadSlip,
      handleMarkPaid,
    ],
  );

  return (
    <div
      className="relative flex flex-col w-full"
      style={{
        minHeight: "100%",
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
        padding: "var(--page-padding-y) var(--page-padding-x)",
        gap: "var(--space-5)",
      }}
    >
      {/* PAGE HEADER */}
      <div
        className="flex flex-wrap items-start justify-between"
        style={{ gap: "var(--space-4)" }}
      >
        <div>
          <h1
            style={{
              fontSize: "var(--text-xl)",
              fontWeight: 600,
              letterSpacing: "-0.025em",
              color: "var(--foreground)",
            }}
          >
            Payroll
          </h1>
          <p
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--muted)",
              marginTop: "var(--space-1)",
            }}
          >
            Kelola payroll, edit komponen, dan approve dengan PIN Finance.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value || currentMonth)}
            className="rounded-[var(--radius-xl)] border border-border bg-surface px-[var(--btn-px-md)] py-2 text-sm text-foreground shadow-xs outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>
      </div>

      {/* TABLE */}
      <DataTable
        columns={columns}
        data={payrolls}
        isLoading={isLoading}
        emptyMessage={`Belum ada data payroll untuk bulan ${formatMonth(selectedMonth)}.`}
        defaultPageSize={10}
      />

      {/* EDIT MODAL */}
      {editingPayroll && (
        <EditPayrollModal
          payroll={editingPayroll}
          onClose={() => setEditingPayroll(null)}
          onSave={(payrollId, details) => {
            updateMutation.mutate({ payrollId, details });
          }}
        />
      )}

      {/* APPROVE PIN MODAL */}
      {approvingPayroll && (
        <ApprovePayrollModal
          payroll={approvingPayroll}
          isSubmitting={approveMutation.isPending}
          onClose={() => setApprovingPayroll(null)}
          onSubmit={handleApproveSubmit}
        />
      )}
    </div>
  );
}

/* ==================== APPROVE PIN MODAL ==================== */
function ApprovePayrollModal({
  payroll,
  isSubmitting,
  onClose,
  onSubmit,
}: {
  payroll: PayrollRecord;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (pin: string) => void;
}) {
  const [pin, setPin] = useState("");

  const handleSubmit = () => {
    if (pin.length !== 4) return;
    onSubmit(pin);
  };

  return (
    <Modal.Backdrop
      isOpen
      onOpenChange={(open) => !open && onClose()}
      variant="blur"
    >
      <Modal.Container size="xs">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header className="items-center text-center">
            <Modal.Icon className="bg-accent-soft text-accent-soft-foreground ring-8 ring-accent-soft/30">
              <LockKey className="size-5" weight="bold" />
            </Modal.Icon>
            <Modal.Heading>Approve Payroll</Modal.Heading>
            <p className="mt-1.5 text-sm leading-5 text-muted">
              Masukkan PIN Finance untuk approve payroll{" "}
              <span className="font-medium text-foreground">
                {payroll.staff?.first_name} {payroll.staff?.last_name ?? ""}
              </span>
              .
            </p>
          </Modal.Header>

          <Modal.Body>
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-surface-secondary px-6 py-7">
              <span className="text-xs font-medium uppercase tracking-wide text-muted">
                PIN Finance
              </span>

              <InputOTP
                maxLength={4}
                pattern={REGEXP_ONLY_DIGITS}
                variant="secondary"
                autoFocus
                value={pin}
                onChange={setPin}
                onComplete={(value) => {
                  if (!isSubmitting) onSubmit(value);
                }}
              >
                <InputOTP.Group className="gap-3">
                  <InputOTP.Slot
                    index={0}
                    className="size-12 rounded-xl border-border/80 bg-surface text-lg font-semibold data-[active=true]:border-accent data-[active=true]:ring-2 data-[active=true]:ring-accent/20"
                  />
                  <InputOTP.Slot
                    index={1}
                    className="size-12 rounded-xl border-border/80 bg-surface text-lg font-semibold data-[active=true]:border-accent data-[active=true]:ring-2 data-[active=true]:ring-accent/20"
                  />
                  <InputOTP.Slot
                    index={2}
                    className="size-12 rounded-xl border-border/80 bg-surface text-lg font-semibold data-[active=true]:border-accent data-[active=true]:ring-2 data-[active=true]:ring-accent/20"
                  />
                  <InputOTP.Slot
                    index={3}
                    className="size-12 rounded-xl border-border/80 bg-surface text-lg font-semibold data-[active=true]:border-accent data-[active=true]:ring-2 data-[active=true]:ring-accent/20"
                  />
                </InputOTP.Group>
              </InputOTP>

              <span className="text-xs text-muted">{pin.length}/4 digit</span>
            </div>
          </Modal.Body>

          {/* <Modal.Footer className="gap-2">
            <Button className="flex-1" variant="secondary" onPress={onClose}>
              Batal
            </Button>
            <Button
              className="flex-1"
              variant="primary"
              onPress={handleSubmit}
              isDisabled={pin.length !== 4 || isSubmitting}
            >
              {isSubmitting ? "Memproses..." : "Approve"}
            </Button>
          </Modal.Footer> */}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

/* ==================== EDIT MODAL — Simplified Form ==================== */
function EditPayrollModal({
  payroll,
  onClose,
  onSave,
}: {
  payroll: PayrollRecord;
  onClose: () => void;
  onSave: (
    payrollId: number,
    details: Omit<PayrollDetail, "id" | "payroll_id">,
  ) => void;
}) {
  const [details, setDetails] = useState<PayrollDetail>(
    payroll.details ?? {
      gaji_pokok: payroll.base_salary,
      lembur: 0,
      uang_makan: 0,
      bonus: 0,
      komisi: 0,
      potongan_absen: 0,
      sisa_hutang_bulan_lalu: 0,
      hutang_bulan_ini: 0,
      potongan_lainnya: 0,
    },
  );
  const [isSaving, setIsSaving] = useState(false);

  const totals = useMemo(() => {
    const income = incomeFields.reduce(
      (sum, [field]) => sum + Number(details[field] || 0),
      0,
    );
    const deduction = deductionFields.reduce(
      (sum, [field]) => sum + Number(details[field] || 0),
      0,
    );
    const gross = income;
    const net = gross - deduction;
    return { gross, net, deduction };
  }, [details]);

  const handleAmountChange = (field: keyof PayrollDetail, amount: number) => {
    setDetails((prev) => ({ ...prev, [field]: amount }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      onSave(payroll.id, details);
    } catch (error) {
      console.error("Error saving payroll:", error);
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-2xl rounded-xl shadow-xl border border-border flex flex-col max-h-[95vh]">
        {/* HEADER */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-border shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Edit Payroll
            </h2>
            <p className="text-sm text-muted mt-1">
              Ubah komponen gaji{" "}
              <span className="font-medium text-foreground">
                {payroll.staff?.first_name} {payroll.staff?.last_name ?? ""}
              </span>{" "}
              untuk periode{" "}
              {payroll.period?.period_month
                ? formatMonth(payroll.period.period_month)
                : "-"}
              .
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground p-1.5 rounded-md hover:bg-surface-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* RINGKASAN */}
          <div className="rounded-md border border-border bg-surface-secondary p-4">
            <div className="flex items-center gap-3 pb-4 mb-4 border-b border-border">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent-soft-foreground">
                {payroll.staff?.first_name?.[0] ?? "?"}
                {payroll.staff?.last_name?.[0] ?? ""}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {payroll.staff?.first_name} {payroll.staff?.last_name ?? ""}
                </p>
                <p className="text-xs text-muted">
                  {payroll.staff?.job_title ?? "-"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 divide-x divide-border">
              <div className="text-center">
                <p className="text-xs text-muted mb-1">Hari Kerja Normal</p>
                <p className="text-sm font-semibold text-foreground">
                  {payroll.working_days_normal}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted mb-1">Hari Kerja Efektif</p>
                <p className="text-sm font-semibold text-foreground">
                  {payroll.working_days_effective}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted mb-1">Status</p>
                <Chip
                  size="sm"
                  variant="primary"
                  color={statusColorMap[payroll.status]}
                >
                  {statusLabelMap[payroll.status]}
                </Chip>
              </div>
            </div>
          </div>

          {/* PENGHASILAN */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-foreground">
              Penghasilan
            </Label>
            <div className="space-y-2 grid md:grid-cols-2 gap-3 pt-3">
              {incomeFields.map(([field, label]) => (
                <div key={field}>
                  <Label className="text-xs text-muted block mb-1">
                    {label}
                  </Label>
                  <MoneyInput
                    value={Number(details[field])}
                    onValueChange={(value) => handleAmountChange(field, value)}
                    currencyCode="IDR"
                    className="rounded-md  text-sm font-semibold text-foreground"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* POTONGAN */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-foreground">
              Potongan
            </Label>
            <div className="space-y-2 grid md:grid-cols-2 gap-3 pt-3">
              {deductionFields.map(([field, label]) => (
                <div key={field}>
                  <Label className="text-xs text-muted block mb-1">
                    {label}
                  </Label>
                  <MoneyInput
                    value={Number(details[field])}
                    onValueChange={(value) => handleAmountChange(field, value)}
                    currencyCode="IDR"
                    className="rounded-md text-sm font-semibold text-foreground"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* TOTAL */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
            <div>
              <p className="text-xs text-muted mb-1">Gross</p>
              <p className="text-sm font-semibold text-foreground">
                {formatCurrency(totals.gross)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted mb-1">Deductions</p>
              <p className="text-sm font-bold text-red-600">
                {formatCurrency(totals.deduction, { minus: true })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted mb-1">Net</p>
              <p className="text-sm font-bold text-emerald-600">
                {formatCurrency(totals.net)}
              </p>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-border rounded-md hover:bg-surface-secondary transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 text-sm font-semibold bg-accent text-accent-foreground rounded-md disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </div>
    </div>
  );
}
