import type { Metadata } from "next";
import React from "react";
import "./globals.css";
import AuthProvider from "../components/AuthProvider";
import ThemeProvider from "../components/ThemeProvider";
import Navbar from "../components/Navbar";

export const metadata: Metadata = {
  title: "Sprint Board — Task Management",
  description:
    "A Trello-like kanban task management board with role-based access control.",
  icons: {
    icon: "/images/favicon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function () {
              try {
                var stored = localStorage.getItem("sprint_board_theme");
                var dark = stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches);
                if (dark) document.documentElement.classList.add("dark");
              } catch (e) {}
            })();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-board-100 font-sans text-board-900 antialiased transition-colors">
        <ThemeProvider>
          <AuthProvider>
            <Navbar />
            <main>{children}</main>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}