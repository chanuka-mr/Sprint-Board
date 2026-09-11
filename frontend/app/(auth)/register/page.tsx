"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus, Mail, User as UserIcon, AlertCircle } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import PasswordInput from "../../../components/PasswordInput";

const RegisterPage = () => {
  const router = useRouter();
  const { register, user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ field?: string; message: string }[]>(
    []
  );

  React.useEffect(() => {
    if (user) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const validate = (): boolean => {
    const nextErrors: { field?: string; message: string }[] = [];

    if (!name.trim()) {
      nextErrors.push({ field: "name", message: "Name is required." });
    } else if (name.trim().length < 2) {
      nextErrors.push({
        field: "name",
        message: "Name must be at least 2 characters long.",
      });
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!email.trim()) {
      nextErrors.push({ field: "email", message: "Email is required." });
    } else if (!emailRegex.test(email.trim())) {
      nextErrors.push({ field: "email", message: "Please enter a valid email." });
    }

    if (!password) {
      nextErrors.push({ field: "password", message: "Password is required." });
    } else if (password.length < 8) {
      nextErrors.push({
        field: "password",
        message: "Password must be at least 8 characters long.",
      });
    }

    if (confirmPassword !== password) {
      nextErrors.push({
        field: "confirmPassword",
        message: "Passwords do not match.",
      });
    }

    setErrors(nextErrors);
    return nextErrors.length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors([]);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await register(name.trim(), email.trim().toLowerCase(), password);
      router.replace("/dashboard");
    } catch (err) {
      const message =
        err instanceof Error && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message || "Registration failed. Please try again."
          : "Registration failed. Please try again.";
      setErrors([{ message }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldError = (field?: string): string | undefined => {
    return errors.find((e) => e.field === field)?.message;
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
            <UserPlus className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-board-900">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-board-500">
            Join Sprint Board and start tracking tasks.
          </p>
        </div>

        <div className="rounded-2xl border border-board-200 bg-white p-6 shadow-sm sm:p-8 dark:border-board-200 dark:bg-board-50">
          {fieldError(undefined) && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{fieldError(undefined)}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block text-sm font-semibold text-board-700"
              >
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-board-400" />
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  aria-invalid={Boolean(fieldError("name"))}
                  className={`w-full rounded-lg border py-2.5 pl-10 pr-3 text-sm text-board-900 outline-none transition-colors focus:ring-2 ${
                    fieldError("name")
                      ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                      : "border-board-300 focus:border-indigo-500 focus:ring-indigo-100"
                  }`}
                />
              </div>
              {fieldError("name") && (
                <p className="mt-1 text-xs font-medium text-red-600">
                  {fieldError("name")}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-semibold text-board-700"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-board-400" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  aria-invalid={Boolean(fieldError("email"))}
                  className={`w-full rounded-lg border py-2.5 pl-10 pr-3 text-sm text-board-900 outline-none transition-colors focus:ring-2 ${
                    fieldError("email")
                      ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                      : "border-board-300 focus:border-indigo-500 focus:ring-indigo-100"
                  }`}
                />
              </div>
              {fieldError("email") && (
                <p className="mt-1 text-xs font-medium text-red-600">
                  {fieldError("email")}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-semibold text-board-700"
              >
                Password
              </label>
              <PasswordInput
                id="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                aria-invalid={Boolean(fieldError("password"))}
                className={
                  fieldError("password")
                    ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                    : "border-board-300 focus:border-indigo-500 focus:ring-indigo-100"
                }
              />
              {fieldError("password") && (
                <p className="mt-1 text-xs font-medium text-red-600">
                  {fieldError("password")}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1.5 block text-sm font-semibold text-board-700"
              >
                Confirm Password
              </label>
              <PasswordInput
                id="confirmPassword"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                aria-invalid={Boolean(fieldError("confirmPassword"))}
                className={
                  fieldError("confirmPassword")
                    ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                    : "border-board-300 focus:border-indigo-500 focus:ring-indigo-100"
                }
              />
              {fieldError("confirmPassword") && (
                <p className="mt-1 text-xs font-medium text-red-600">
                  {fieldError("confirmPassword")}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-board-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;