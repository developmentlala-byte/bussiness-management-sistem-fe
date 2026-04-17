import { create } from "zustand";

export const useThemeStore = create((set) => ({
  theme: "light",
  setTheme: (theme: "light" | "dark") => set({ theme }),
}));
