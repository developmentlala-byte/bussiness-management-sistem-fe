"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "@phosphor-icons/react";

export function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-secondary hover:text-foreground"
    >
      {isDark ? (
        <Sun weight="bold" className="h-3.5 w-3.5 shrink-0" />
      ) : (
        <Moon weight="bold" className="h-3.5 w-3.5 shrink-0" />
      )}
      <span>{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}
