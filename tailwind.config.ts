import type { Config } from "tailwindcss";

const config: Config = {
  theme: {
    // Override langsung — bukan extend
    // Semua class Tailwind standard sekarang pakai fluid values
    fontSize: {
      xs: "var(--text-xs)",
      sm: "var(--text-sm)",
      base: "var(--text-base)",
      md: "var(--text-md)",
      lg: "var(--text-lg)",
      xl: "var(--text-xl)",
      "2xl": "var(--text-2xl)",
      "3xl": "var(--text-3xl)",
      "4xl": "var(--text-4xl)",
      "5xl": "var(--text-5xl)",
    },
    borderRadius: {
      sm: "var(--radius-sm)",
      md: "var(--radius-md)",
      lg: "var(--radius-lg)",
      xl: "var(--radius-xl)",
      "2xl": "var(--radius-2xl)",
      full: "9999px",
      none: "0",
    },
    extend: {
      spacing: {
        1: "var(--space-1)",
        2: "var(--space-2)",
        3: "var(--space-3)",
        4: "var(--space-4)",
        5: "var(--space-5)",
        6: "var(--space-6)",
        8: "var(--space-8)",
        10: "var(--space-10)",
        12: "var(--space-12)",
        16: "var(--space-16)",
        20: "var(--space-20)",
        // tetap ada fluid- alias
        "fluid-1": "var(--space-1)",
        "fluid-2": "var(--space-2)",
        "fluid-3": "var(--space-3)",
        "fluid-4": "var(--space-4)",
        "fluid-5": "var(--space-5)",
        "fluid-6": "var(--space-6)",
        "fluid-8": "var(--space-8)",
        "page-x": "var(--page-padding-x)",
        "page-y": "var(--page-padding-y)",
        "card-sm": "var(--card-padding-sm)",
        "card-md": "var(--card-padding-md)",
        "card-lg": "var(--card-padding-lg)",
      },
      height: {
        "btn-sm": "var(--btn-height-sm)",
        "btn-md": "var(--btn-height-md)",
        "btn-lg": "var(--btn-height-lg)",
        "input-sm": "var(--input-height-sm)",
        "input-md": "var(--input-height-md)",
        "input-lg": "var(--input-height-lg)",
        row: "var(--table-row-height)",
        badge: "var(--badge-height)",
      },
      width: {
        "sidebar-collapsed": "var(--sidebar-width-collapsed)",
        "sidebar-expanded": "var(--sidebar-width-expanded)",
      },
    },
  },
};

export default config;
