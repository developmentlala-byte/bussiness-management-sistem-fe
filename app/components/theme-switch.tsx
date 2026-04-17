"use client";

import { useTheme } from "next-themes";

export function ThemeSwitch() {
  const { theme, setTheme } = useTheme();

  return (
    <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
      Toggle {theme === "dark" ? "Light" : "Dark"} Mode
    </button>
  );
}
