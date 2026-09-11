"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldOff, ArrowLeft } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import UsersDirectory from "../../../components/UsersDirectory";

const UsersPage = () => {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 h-8 w-56 animate-pulse rounded bg-board-200" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div
              key={item}
              className="h-40 animate-pulse rounded-2xl border border-board-200 bg-white p-5 dark:bg-board-50"
            />
          ))}
        </div>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center px-4 py-24 sm:px-6 lg:px-8">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400">
          <ShieldOff className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-board-900">
          Access denied
        </h1>
        <p className="mt-2 max-w-md text-center text-sm text-board-500">
          This page is restricted to administrators. The user directory is only
          available to accounts with the <strong>admin</strong> role.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return <UsersDirectory />;
};

export default UsersPage;