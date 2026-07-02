import axios from "axios";
import qs from "qs";
// import { toast } from "sonner";

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api",
  timeout: 600000,
  headers: {
    "ngrok-skip-browser-warning": "true",
    "Content-Type": "application/json",
  },
  paramsSerializer: (params) =>
    qs.stringify(params, {
      arrayFormat: "comma",
      encode: false,
      skipNulls: true,
    }),
});

// === REQUEST INTERCEPTOR ===
axiosInstance.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // Jika data adalah FormData, hapus Content-Type agar browser yang menanganinya
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// === RESPONSE INTERCEPTOR ===
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // console.error("API Error:", {
    //   status: error.response?.status,
    //   data: error.response?.data,
    //   message: error.message,
    // });

    if (error.response?.status === 401) {
      localStorage.setItem("auth_error", "expired");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
      console.warn("Unauthorized or token expired");
    }

    if (error.response?.status === 422) {
      localStorage.setItem(
        "validasi_error",
        error.response?.data.message || "An error occurred",
      );
    }

    // toast.error(error.response.data.message || "An error occurred");

    return Promise.reject(error);
  },
);

export default axiosInstance;
