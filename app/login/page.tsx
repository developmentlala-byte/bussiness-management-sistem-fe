"use client";

import React, { useState } from "react";
import { Form, Input, Button, Separator, Label } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axiosInstance from "../services/axios-instance";
import { useAuthStore } from "../libs/use-user";

// 1. Schema Validasi Zod
const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: "Email tidak boleh kosong" })
    .email({ message: "Format email tidak valid" }),
  password: z.string().min(6, { message: "Password minimal 6 karakter" }),
});

type LoginFormInputs = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // 2. Tarik fungsi setAuth dari Zustand
  const { setAuth } = useAuthStore();

  // 3. Setup React Hook Form
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // 4. Handler Login Manual (Email & Password)
  const onSubmit = async (data: LoginFormInputs) => {
    setIsLoading(true);
    setErrorMsg("");

    try {
      const response = await axiosInstance.post("/auth/login", data);

      // Membaca dari struktur ApiResponse::success() backend Laravel Anda
      const result = response.data.data;

      if (result && result.token) {
        // Simpan data user & token ke Zustand (Otomatis masuk localStorage lewat persist)
        setAuth(result.user, result.token);

        router.push("/dashboard");
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      setErrorMsg(
        error.response?.data?.message ||
          "Login gagal. Periksa kembali kredensial Anda.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Handler Login OAuth
  const handleOAuthLogin = (provider: string) => {
    const baseUrl =
      process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
    window.location.href = `${baseUrl}/auth/${provider}/redirect`;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4 font-sans">
      <div className="w-full max-w-[420px] flex flex-col items-center">
        {/* Brand Header */}
        <div className="flex items-center gap-2 mb-12">
          {/* Logo Mahalu - Siku Tajam */}
          <div className="w-7 h-7 bg-foreground flex items-center justify-center rounded-none shadow-sm">
            <span className="text-background text-xs font-bold font-serif">
              M
            </span>
          </div>
          <span className="text-xl font-bold tracking-tight">Mahalu</span>
        </div>

        {/* Welcome Text */}
        <h1 className="text-2xl font-semibold mb-8 text-center tracking-tight">
          Welcome
        </h1>

        {/* Form Login */}
        <Form
          className="w-full flex flex-col gap-6"
          onSubmit={handleSubmit(onSubmit)}
        >
          {/* Error Message Box */}
          {errorMsg && (
            <div className="w-full p-3 bg-danger/10 border border-danger text-danger text-sm rounded-none font-medium shadow-sm">
              {errorMsg}
            </div>
          )}

          <div className="w-full flex flex-col gap-5">
            {/* Input Group: Email */}
            <div className="flex flex-col gap-2 w-full">
              <Label
                htmlFor="email"
                className="text-foreground font-medium text-sm"
              >
                Email Address
              </Label>
              <Input
                {...register("email")}
                id="email"
                type="email"
                placeholder="Enter your email"
                className={`w-full rounded-none h-12 px-4 border shadow-sm transition-colors focus:outline-none focus:ring-1 bg-surface ${
                  errors.email
                    ? "border-danger text-danger focus:border-danger focus:ring-danger bg-danger/5"
                    : "border-border hover:border-focus focus:border-focus focus:ring-focus"
                }`}
              />
              {errors.email && (
                <span className="text-danger text-xs font-medium">
                  {errors.email.message}
                </span>
              )}
            </div>

            {/* Input Group: Password */}
            <div className="flex flex-col gap-2 w-full">
              <Label
                htmlFor="password"
                className="text-foreground font-medium text-sm"
              >
                Password
              </Label>
              <Input
                {...register("password")}
                id="password"
                type="password"
                placeholder="Enter your password"
                className={`w-full rounded-none h-12 px-4 border shadow-sm transition-colors focus:outline-none focus:ring-1 bg-surface ${
                  errors.password
                    ? "border-danger text-danger focus:border-danger focus:ring-danger bg-danger/5"
                    : "border-border hover:border-focus focus:border-focus focus:ring-focus"
                }`}
              />
              {errors.password && (
                <span className="text-danger text-xs font-medium">
                  {errors.password.message}
                </span>
              )}
            </div>
          </div>

          <Button
            type="submit"
            isDisabled={isLoading}
            className="w-full rounded-none bg-segment text-segment-foreground border border-border hover:bg-surface-secondary h-12 font-medium shadow-sm"
          >
            {isLoading ? "Signing in..." : "Continue with Email"}
          </Button>
        </Form>

        {/* Divider OR */}
        <div className="flex items-center w-full gap-4 my-8">
          <Separator className="flex-1 bg-border" />
          <span className="text-xs text-muted uppercase tracking-widest font-medium">
            OR
          </span>
          <Separator className="flex-1 bg-border" />
        </div>

        {/* OAuth Buttons */}
        <div className="w-full flex flex-col gap-3">
          <Button
            variant="outline"
            onClick={() => handleOAuthLogin("google")}
            className="w-full rounded-none border border-border bg-transparent hover:bg-surface-secondary flex items-center justify-center gap-3 h-12 shadow-sm"
          >
            <GoogleIcon />
            Continue with Google
          </Button>

          <Button
            variant="outline"
            onClick={() => handleOAuthLogin("github")}
            className="w-full rounded-none border border-border bg-transparent hover:bg-surface-secondary flex items-center justify-center gap-3 h-12 shadow-sm"
          >
            <GithubIcon />
            Continue with Github
          </Button>
        </div>

        {/* Terms & Conditions Footer */}
        <div className="mt-12 text-center text-xs text-muted">
          <p className="mb-4">
            By continuing, you agree to{` Mahalu's`}{" "}
            <a
              href="#"
              className="hover:text-foreground transition-colors underline underline-offset-4 decoration-border hover:decoration-foreground"
            >
              Terms
            </a>{" "}
            and{" "}
            <a
              href="#"
              className="hover:text-foreground transition-colors underline underline-offset-4 decoration-border hover:decoration-foreground"
            >
              Privacy
            </a>
            .
          </p>
          <div className="flex items-center justify-center gap-6 mb-2">
            <a href="#" className="hover:text-foreground transition-colors">
              Terms & Conditions
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Privacy
            </a>
          </div>
          <p>© {new Date().getFullYear()} Mahalu Group. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

// --- Icons SVG ---
function GoogleIcon() {
  return (
    <svg
      className="w-[18px] h-[18px]"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg
      className="w-[18px] h-[18px] text-foreground fill-current"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}
