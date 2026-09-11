"use client";

import React, { useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";

const KanbanBoard = dynamic(
  () => import("../../components/KanbanBoard"),
  {
    ssr: false,
    loading: () => <BoardSkeleton />,
  }
);

const BoardSkeleton = () => {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 h-8 w-64 animate-pulse rounded bg-board-200" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((column) => (
          <div
            key={column}
            className="min-h-[70vh] animate-pulse rounded-2xl border border-board-200 bg-board-50 p-4"
          >
            <div className="mb-4 h-5 w-24 rounded bg-board-200" />
            <div className="space-y-3">
              {[1, 2, 3].map((card) => (
                <div
                  key={card}
                  className="h-28 rounded-xl border border-board-200 bg-white p-4 dark:bg-board-50"
                >
                  <div className="mb-2 h-3.5 w-3/4 rounded bg-board-200" />
                  <div className="mb-3 h-3 w-1/2 rounded bg-board-100" />
                  <div className="h-3 w-1/3 rounded bg-board-100" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const DashboardPage = () => {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return <BoardSkeleton />;
  }

  return <KanbanBoard />;
};

export default DashboardPage;