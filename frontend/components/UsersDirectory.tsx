"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Users as UsersIcon, Search, ShieldCheck, User as UserIcon, RefreshCw, AlertTriangle } from "lucide-react";
import apiClient, {
  ApiResponse,
  AppUser,
  Task,
  TasksResponse,
  UsersResponse,
} from "../lib/api";
import { formatDate, getInitials } from "../lib/utils";

interface UserStats {
  created: number;
  assigned: number;
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
};

const UsersDirectory = () => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const [usersRes, tasksRes] = await Promise.all([
        apiClient.get<ApiResponse<UsersResponse>>("/api/users"),
        apiClient.get<ApiResponse<TasksResponse>>("/api/tasks"),
      ]);
      setUsers(usersRes.data.data.users);
      setTasks(tasksRes.data.data.tasks);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const statsByUser = useMemo(() => {
    const stats: Record<string, UserStats> = {};
    users.forEach((user) => {
      stats[user._id] = { created: 0, assigned: 0 };
    });
    tasks.forEach((task) => {
      const createdBy = task.createdBy?._id;
      const assignedTo = task.assignedTo?._id;
      if (createdBy && stats[createdBy]) {
        stats[createdBy].created += 1;
      }
      if (assignedTo && stats[assignedTo]) {
        stats[assignedTo].assigned += 1;
      }
    });
    return stats;
  }, [users, tasks]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return users;
    }
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term)
    );
  }, [users, search]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 h-8 w-56 animate-pulse rounded bg-board-200" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div
              key={item}
              className="h-40 animate-pulse rounded-2xl border border-board-200 bg-white p-5 dark:bg-board-50"
            >
              <div className="mb-4 flex h-10 w-10 rounded-full bg-board-200" />
              <div className="mb-2 h-4 w-3/4 rounded bg-board-200" />
              <div className="h-3 w-1/2 rounded bg-board-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-board-900">
            <UsersIcon className="h-6 w-6 text-indigo-600" />
            Registered Users
          </h1>
          <p className="mt-1 text-sm text-board-500">
            {users.length} registered user{users.length === 1 ? "" : "s"} in the
            system. All registered users have access to the board.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-amber-600/30 bg-white px-2.5 py-1 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100 dark:bg-board-50 dark:text-amber-300 dark:hover:bg-board-100"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      )}

      <div className="mb-6 max-w-md">
        <label
          htmlFor="user-search"
          className="mb-1.5 block text-sm font-semibold text-board-700"
        >
          Search Users
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-board-400" />
          <input
            id="user-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full rounded-lg border border-board-300 py-2.5 pl-10 pr-3 text-sm text-board-900 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-board-200 bg-white px-4 py-16 text-center dark:bg-board-50">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-board-100 text-board-400">
            <UsersIcon className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-board-600">
            {users.length === 0
              ? "No users registered yet"
              : "No users match your search"}
          </p>
          <p className="mt-1 text-sm text-board-400">
            {users.length === 0
              ? "Users who register will appear here."
              : "Try a different name or email."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((user) => {
            const stats = statsByUser[user._id] ?? { created: 0, assigned: 0 };
            const isAdmin = user.role === "admin";

            return (
              <div
                key={user._id}
                className="rounded-2xl border border-board-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:bg-board-50 dark:hover:shadow-black/20"
              >
                <div className="mb-4 flex items-start justify-between gap-2">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold ${
                      isAdmin
                        ? "bg-indigo-600 text-white"
                        : "bg-board-200 text-board-600"
                    }`}
                  >
                    {getInitials(user.name)}
                  </div>
                  {isAdmin ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-300">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-board-200 bg-board-50 px-2.5 py-1 text-xs font-semibold text-board-500 dark:border-board-200 dark:bg-board-100 dark:text-board-400">
                      <UserIcon className="h-3.5 w-3.5" />
                      User
                    </span>
                  )}
                </div>

                <h3 className="mb-0.5 truncate text-base font-bold text-board-900">
                  {user.name}
                </h3>
                <p className="mb-4 truncate text-sm text-board-500">
                  {user.email}
                </p>

                {user.createdAt && (
                  <p className="mb-4 text-xs text-board-400">
                    Joined {formatDate(user.createdAt)}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2 border-t border-board-100 pt-4">
                  <div className="rounded-xl bg-board-50 px-3 py-2 text-center">
                    <p className="text-lg font-bold text-board-800">
                      {stats.created}
                    </p>
                    <p className="text-xs font-medium text-board-400">
                      Created
                    </p>
                  </div>
                  <div className="rounded-xl bg-board-50 px-3 py-2 text-center">
                    <p className="text-lg font-bold text-board-800">
                      {stats.assigned}
                    </p>
                    <p className="text-xs font-medium text-board-400">
                      Assigned
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UsersDirectory;