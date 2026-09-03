// app/components/moneyInput.tsx
"use client";

import { forwardRef, useEffect, useState } from "react";
import { cn, InputGroup } from "@heroui/react";

const pillBase =
  "rounded-md border border-border bg-surface-secondary/60 px-1 shadow-xs transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 has-[input:disabled]:opacity-50 w-full ";

const pillInput =
  "border-0 bg-transparent ps-4 text-sm font-medium  text-foreground shadow-none focus:ring-0";

/* ==================== MONEY INPUT ==================== */
type MoneyInputProps = Omit<
  React.ComponentProps<typeof InputGroup.Input>,
  "value" | "onChange" | "type"
> & {
  /** Nilai asli dalam number biasa, misal 1500000 */
  value: number | null | undefined;
  /** Dipanggil dengan number biasa setiap kali berubah */
  onValueChange: (value: number) => void;
  /** Simbol di kiri, misal "Rp" atau "$". Set null untuk sembunyikan. */
  prefix?: string | null;
  /** Kode currency di kanan, misal "IDR" atau "USD". Set null/undefined untuk sembunyikan. */
  currencyCode?: string | null;
  locale?: string;
  groupClassName?: string;
};

function formatMoney(value: number, locale: string): string {
  if (!Number.isFinite(value)) return "";
  return new Intl.NumberFormat(locale).format(value);
}

function toDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  (
    {
      value,
      onValueChange,
      prefix = "Rp",
      currencyCode,
      locale = "id-ID",
      className,
      groupClassName,
      disabled,
      ...inputProps
    },
    ref,
  ) => {
    const [display, setDisplay] = useState<string>(() =>
      value === null || value === undefined ? "" : formatMoney(value, locale),
    );

    useEffect(() => {
      const next =
        value === null || value === undefined ? "" : formatMoney(value, locale);
      setDisplay((current) => (current === next ? current : next));
    }, [value, locale]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      const cursor: number = input.selectionStart ?? input.value.length;
      const digitsBeforeCursor: number = toDigits(
        input.value.slice(0, cursor),
      ).length;

      const rawDigits = toDigits(input.value);
      const numeric: number = rawDigits === "" ? 0 : Number(rawDigits);
      const formatted: string =
        rawDigits === "" ? "" : formatMoney(numeric, locale);

      setDisplay(formatted);
      onValueChange(numeric);

      requestAnimationFrame(() => {
        let digitCount = 0;
        let pos: number = formatted.length;
        for (let i = 0; i < formatted.length; i++) {
          if (/\d/.test(formatted[i])) digitCount++;
          if (digitCount === digitsBeforeCursor) {
            pos = i + 1;
            break;
          }
        }
        input.setSelectionRange(pos, pos);
      });
    };

    return (
      <InputGroup className={cn(pillBase, groupClassName)}>
        {prefix && (
          <InputGroup.Prefix className="pl-3.5 text-sm font-medium text-muted select-none border-r border-border">
            {prefix}
          </InputGroup.Prefix>
        )}
        <InputGroup.Input
          {...inputProps}
          ref={ref}
          inputMode="numeric"
          disabled={disabled}
          value={display}
          onChange={handleChange}
          placeholder={inputProps.placeholder ?? "0"}
          className={cn(pillInput, !prefix && "pl-3.5 ", className)}
        />
        {currencyCode && (
          <InputGroup.Suffix className="pr-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted select-none">
            {currencyCode}
          </InputGroup.Suffix>
        )}
      </InputGroup>
    );
  },
);

MoneyInput.displayName = "MoneyInput";

/* ==================== PERCENT INPUT ==================== */
type PercentInputProps = Omit<
  React.ComponentProps<typeof InputGroup.Input>,
  "value" | "onChange" | "type"
> & {
  value: number | string | null | undefined;
  onValueChange: (value: string) => void;
  groupClassName?: string;
};

export const PercentInput = forwardRef<HTMLInputElement, PercentInputProps>(
  (
    {
      value,
      onValueChange,
      className,
      groupClassName,
      disabled,
      ...inputProps
    },
    ref,
  ) => {
    return (
      <InputGroup className={cn(pillBase, groupClassName)}>
        <InputGroup.Input
          {...inputProps}
          ref={ref}
          type="number"
          inputMode="decimal"
          disabled={disabled}
          value={value ?? ""}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder={inputProps.placeholder ?? "0"}
          className={cn(pillInput, "pl-3.5", className)}
        />
        <InputGroup.Suffix className="pr-3.5 text-sm font-semibold text-muted select-none">
          %
        </InputGroup.Suffix>
      </InputGroup>
    );
  },
);

PercentInput.displayName = "PercentInput";
