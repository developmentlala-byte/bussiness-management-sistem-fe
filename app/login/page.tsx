"use client";

import React, { Suspense, useEffect, useState } from "react";
import { Form, Input, Button, Label, toast } from "@heroui/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axiosInstance from "../services/axios-instance";
import { useAuthStore } from "../libs/use-user";
import Image from "next/image";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: "Email tidak boleh kosong" })
    .email({ message: "Format email tidak valid" }),
  password: z.string().min(6, { message: "Password minimal 6 karakter" }),
});

type LoginFormInputs = z.infer<typeof loginSchema>;

function LoginPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const { setAuth } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginFormInputs) => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const response = await axiosInstance.post("/auth/login", data);
      const result = response.data.data;
      if (result && result.token) {
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

  useEffect(() => {
    if (params.get("error")) {
      toast.danger(params.get("error") || "Login gagal");
    }
  }, [params]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 font-sans bg-[radial-gradient(circle_at_50%_0%,color-mix(in_oklch,var(--accent)_8%,var(--background))_0%,var(--background)_60%)]">
      <div className="w-full max-w-[400px]">
        <div className="w-full flex flex-col items-center  shadow-sm  rounded-[var(--radius-lg)] p-[var(--card-padding-lg)]">
          <div className="flex flex-col items-center gap-4 mb-8">
            <Image
              alt="Mahalu Spa"
              src="/logo/apple-touch-icon.webp"
              className="rounded-md size-16"
              width={128}
              height={128}
            />
            <div className="text-center">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                Welcome back
              </h1>
              <p className="text-sm text-muted mt-1">
                Sign in to Mahalu Spa dashboard
              </p>
            </div>
          </div>

          <Form
            className="w-full flex flex-col gap-5"
            onSubmit={handleSubmit(onSubmit)}
          >
            {errorMsg && (
              <div className="w-full text-sm font-medium border border-danger text-danger bg-danger/10 rounded-[var(--field-radius)] px-[var(--space-4)] py-[var(--space-3)]">
                {errorMsg}
              </div>
            )}

            <div className="flex flex-col gap-1.5 w-full">
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
                placeholder="you@mahalu.spa.com"
                autoComplete="email"
                className={`w-full border transition-colors focus:outline-none focus:ring-2 h-[var(--input-height-lg)] px-[var(--space-4)] rounded-[var(--field-radius)] bg-[var(--field-background)] text-[var(--field-foreground)] ${
                  errors.email
                    ? "border-danger focus:ring-danger"
                    : "border-border focus:ring-focus"
                }`}
              />
              {errors.email && (
                <span className="text-xs font-medium text-danger">
                  {errors.email.message}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5 w-full">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="password"
                  className="text-foreground font-medium text-sm"
                >
                  Password
                </Label>
                <a
                  // href="/forgot-password"
                  href="#"
                  className="text-xs text-muted hover:text-foreground transition-colors"
                >
                  Forgot password?
                </a>
              </div>
              <Input
                {...register("password")}
                id="password"
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                className={`w-full border transition-colors focus:outline-none focus:ring-2 h-[var(--input-height-lg)] px-[var(--space-4)] rounded-[var(--field-radius)] bg-[var(--field-background)] text-[var(--field-foreground)] ${
                  errors.password
                    ? "border-danger focus:ring-danger"
                    : "border-border focus:ring-focus"
                }`}
              />
              {errors.password && (
                <span className="text-xs font-medium text-danger">
                  {errors.password.message}
                </span>
              )}
            </div>

            <Button
              type="submit"
              isDisabled={isLoading}
              className="w-full font-medium transition-opacity disabled:opacity-60 h-[var(--btn-height-lg)] rounded-[var(--field-radius)] bg-accent text-accent-foreground"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </Form>
        </div>

        <div className="mt-8 text-center text-xs text-muted">
          <p className="mb-3">
            By continuing, you agree to Mahalu&apos;s{" "}
            <a
              href="#"
              className="underline underline-offset-4 hover:text-foreground transition-colors"
            >
              Terms
            </a>{" "}
            and{" "}
            <a
              href="#"
              className="underline underline-offset-4 hover:text-foreground transition-colors"
            >
              Privacy Policy
            </a>
            .
          </p>
          <p>© {new Date().getFullYear()} Mahalu Group. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}
