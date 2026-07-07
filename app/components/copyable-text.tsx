"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "@heroui/react";
import { Copy, Check } from "@phosphor-icons/react";

export function CopyableText({
  text,
  className,
}: {
  text?: string | null;
  className?: string;
}) {
  const [isCopied, setIsCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Bersihkan timeout kalau komponen unmount (misal row hilang karena refetch)
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!text) return <span className={className}>—</span>;

  const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();

    try {
      await navigator.clipboard.writeText(text);
      toast.success("Disalin ke clipboard", { description: text });

      setIsCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setIsCopied(false), 1600);
    } catch {
      toast.warning("Gagal menyalin", {
        description: "Browser tidak mengizinkan akses clipboard.",
      });
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`group/copy inline-flex items-center gap-1.5 text-left outline-none transition-colors duration-200 ${
        isCopied ? "text-success " : "hover:text-accent"
      } ${className ?? ""}`}
    >
      <span className="">{text}</span>

      <span className="relative h-3 w-3 shrink-0">
        {/* Icon Copy — default state, geser masuk pas hover */}
        <Copy
          weight="bold"
          className={`absolute inset-0 h-3 w-3 transition-all duration-300 ease-out ${
            isCopied
              ? "-translate-x-1 scale-50 opacity-0"
              : "translate-x-0 scale-100 opacity-0 group-hover/copy:translate-x-0 group-hover/copy:opacity-100"
          }`}
        />
        {/* Icon Check — muncul dengan pop + rotate pas berhasil kecopy */}
        <Check
          weight="bold"
          className={`absolute inset-0 h-3 w-3 text-success transition-all duration-300 ease-out ${
            isCopied
              ? "rotate-0 scale-100 opacity-100"
              : "rotate-45 scale-50 opacity-0"
          }`}
        />
      </span>
    </button>
  );
}
