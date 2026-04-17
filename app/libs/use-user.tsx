import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// 1. Definisikan Tipe Data User (Sesuaikan dengan tabel bms_st_users)
export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  // Anda bisa tambahkan field lain seperti avatar_url, role, dll jika ada
}

// 2. Definisikan Tipe State & Actions untuk Zustand
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean; // Flag pembantu

  // Actions
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

// 3. Buat Store dengan Middleware Persist
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Initial State
      user: null,
      token: null,
      isAuthenticated: false,

      // Action: Saat user berhasil login
      setAuth: (user, token) => {
        // Kita tetap set manual token di sini agar Axios interceptor Anda
        // yang membaca localStorage.getItem("token") tetap berfungsi normal.
        localStorage.setItem("token", token);

        set({ user, token, isAuthenticated: true });
      },

      // Action: Saat user logout
      logout: () => {
        localStorage.removeItem("token");
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: "auth-storage", // Nama key yang akan disimpan di localStorage
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
