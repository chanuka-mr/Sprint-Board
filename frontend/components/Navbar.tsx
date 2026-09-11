"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  LogOut,
  Users as UsersIcon,
  Sun,
  Moon,
} from "lucide-react";
import Image from "next/image";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { getInitials } from "../lib/utils";

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");

  return (
    <header className="sticky top-0 z-40 border-b border-board-200 bg-white/90 backdrop-blur-sm dark:border-board-200 dark:bg-board-50/90">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href={mounted && user ? "/dashboard" : "/login"} className="flex items-center gap-2">
          <Image
            src="/images/logo.png"
            alt="Sprint Board"
            width={36}
            height={36}
            className="rounded-lg"
            priority
          />
          <div className="flex flex-col leading-tight">
            <span className="text-lg font-bold tracking-tight text-board-900">
              Sprint Board
            </span>
            <span className="text-xs font-medium text-board-500">
              Task Management
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {mounted && (
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-board-500 transition-colors hover:bg-board-100 hover:text-indigo-600 dark:hover:bg-board-200 dark:hover:text-indigo-400"
              title={
                theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
              }
              aria-label={
                theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
              }
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>
          )}

          {!isAuthPage && mounted && user && (
            <div className="hidden items-center gap-2 sm:flex">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                {getInitials(user.name)}
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold text-board-800">
                  {user.name}
                </span>
                <span className="text-xs capitalize text-board-500">
                  {user.role}
                </span>
              </div>
            </div>
          )}

          {isAuthPage && (
            <nav className="flex items-center gap-2">
              <Link
                href="/login"
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  pathname === "/login"
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-board-500 hover:bg-board-100 hover:text-board-800"
                }`}
              >
                Login
              </Link>
              <Link
                href="/register"
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  pathname === "/register"
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-board-500 hover:bg-board-100 hover:text-board-800"
                }`}
              >
                Register
              </Link>
            </nav>
          )}

          {mounted && user && (
            <>
              <Link
                href="/dashboard"
                className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-board-100 hover:text-indigo-600 ${
                  pathname === "/dashboard"
                    ? "bg-indigo-50 text-indigo-600"
                    : "text-board-500"
                }`}
                title="Dashboard"
              >
                <LayoutDashboard className="h-5 w-5" />
              </Link>
              {user.role === "admin" && (
                <Link
                  href="/dashboard/users"
                  className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-board-100 hover:text-indigo-600 ${
                    pathname === "/dashboard/users"
                      ? "bg-indigo-50 text-indigo-600"
                      : "text-board-500"
                  }`}
                  title="Team - Registered Users"
                >
                  <UsersIcon className="h-5 w-5" />
                </Link>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-board-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;