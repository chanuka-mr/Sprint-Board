"use client";

import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { DragDropContext, DropResult, Droppable } from "@hello-pangea/dnd";
import axios from "axios";
import { Plus, AlertTriangle, RefreshCw, Search, X, ListFilter, Sparkles } from "lucide-react";
import apiClient, {
  ApiResponse,
  AppUser,
  PendingAction,
  Task,
  TaskPriority,
  TaskResponse,
  TaskStatus,
  TasksResponse,
  UsersResponse,
} from "../lib/api";
import TaskColumn from "./TaskColumn";
import CreateTaskModal from "./CreateTaskModal";
import ConfirmDialog from "./ConfirmDialog";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const COLUMNS: TaskStatus[] = ["To Do", "Doing", "Done"];

const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.message ||
      "Something went wrong. Please try again."
    );
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
};

interface BoardFilters {
  search: string;
  assignee: string;
  priority: string;
}

const EMPTY_FILTERS: BoardFilters = { search: "", assignee: "", priority: "" };

const KanbanBoard = () => {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createStatus, setCreateStatus] = useState<TaskStatus>("To Do");
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [filters, setFilters] = useState<BoardFilters>(EMPTY_FILTERS);
  const didFetchRef = useRef(false);

  const isAdmin = user?.role === "admin";

  const loadTasks = useCallback(async (): Promise<void> => {
    try {
      const response = await apiClient.get<ApiResponse<TasksResponse>>(
        "/api/tasks"
      );
      setTasks(response.data.data.tasks);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, []);

  const loadUsers = useCallback(async (): Promise<void> => {
    if (user?.role !== "admin") {
      return;
    }
    try {
      const response = await apiClient.get<ApiResponse<UsersResponse>>(
        "/api/users"
      );
      setUsers(response.data.data.users);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [user?.role]);

  useEffect(() => {
    if (!user) {
      return;
    }
    if (didFetchRef.current) {
      return;
    }
    didFetchRef.current = true;

    const bootstrap = async (): Promise<void> => {
      setIsLoading(true);
      await Promise.all([loadTasks(), loadUsers()]);
      setIsLoading(false);
    };

    bootstrap();
  }, [user, loadTasks, loadUsers]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCreateStatus("To Do");
        setIsCreateOpen(true);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const openCreateModal = useCallback((status: TaskStatus): void => {
    setCreateStatus(status);
    setIsCreateOpen(true);
  }, []);

  const hasActiveFilters =
    filters.search !== "" ||
    filters.assignee !== "" ||
    filters.priority !== "";

  const filteredTasks = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    return tasks.filter((task) => {
      if (
        term &&
        !task.title.toLowerCase().includes(term) &&
        !task.description.toLowerCase().includes(term)
      ) {
        return false;
      }
      if (filters.assignee === "me" && task.assignedTo?._id !== user?._id) {
        return false;
      }
      if (filters.assignee === "unassigned" && task.assignedTo) {
        return false;
      }
      if (
        filters.assignee &&
        filters.assignee !== "me" &&
        filters.assignee !== "unassigned" &&
        task.assignedTo?._id !== filters.assignee
      ) {
        return false;
      }
      if (filters.priority && task.priority !== filters.priority) {
        return false;
      }
      return true;
    });
  }, [tasks, filters, user?._id]);

  const filteredByColumn = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      "To Do": [],
      "Doing": [],
      "Done": [],
    };
    filteredTasks.forEach((task) => {
      grouped[task.status].push(task);
    });
    return grouped;
  }, [filteredTasks]);

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
  }, []);

  const handleRefresh = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    await Promise.all([loadTasks(), loadUsers()]);
    setIsLoading(false);
  }, [loadTasks, loadUsers]);

  const applyDrag = (sourceTasks: Task[], result: DropResult): Task[] => {
    const sourceId = result.source.droppableId as TaskStatus;
    const destId = result.destination!.droppableId as TaskStatus;
    const sourceIndex = result.source.index;
    const destIndex = result.destination!.index;

    const next = [...sourceTasks];
    const sourceList = next.filter((task) => task.status === sourceId);
    const destList =
      sourceId === destId
        ? sourceList
        : next.filter((task) => task.status === destId);
    const others = next.filter(
      (task) => task.status !== sourceId && task.status !== destId
    );

    const [moved] = sourceList.splice(sourceIndex, 1);
    if (!moved) {
      return sourceTasks;
    }
    moved.status = destId;
    destList.splice(destIndex, 0, moved);

    return [...others, ...sourceList, ...destList];
  };

  const onDragEnd = async (result: DropResult): Promise<void> => {
    const { destination, source } = result;

    if (!destination) {
      return;
    }
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const task = tasks.find((t) => t._id === result.draggableId);
    if (!task) {
      return;
    }

    const statusChanged = destination.droppableId !== source.droppableId;
    const previousTasks = tasks;
    const optimisticTasks = applyDrag(tasks, result);
    setTasks(optimisticTasks);

    if (!statusChanged) {
      return;
    }

    setPendingAction({ id: task._id, type: "move" });
    try {
      const response = await apiClient.patch<ApiResponse<TaskResponse>>(
        `/api/tasks/${task._id}/status`,
        { status: destination.droppableId }
      );
      setTasks((prev) =>
        prev.map((t) =>
          t._id === response.data.data.task._id ? response.data.data.task : t
        )
      );
      toast.success(`Moved to ${destination.droppableId}`);
    } catch (err) {
      setTasks(previousTasks);
      toast.error(getErrorMessage(err));
    } finally {
      setPendingAction(null);
    }
  };

  const handleMove = useCallback(
    async (task: Task, status: TaskStatus): Promise<void> => {
      if (task.status === status) {
        return;
      }
      setPendingAction({ id: task._id, type: "move" });
      try {
        const response = await apiClient.patch<ApiResponse<TaskResponse>>(
          `/api/tasks/${task._id}/status`,
          { status }
        );
        setTasks((prev) =>
          prev.map((t) =>
            t._id === response.data.data.task._id ? response.data.data.task : t
          )
        );
        toast.success(`Moved to ${status}`);
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setPendingAction(null);
      }
    },
    [toast]
  );

  const handleCreateTask = async (payload: {
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    assignedTo?: string;
  }): Promise<boolean> => {
    try {
      const body: Record<string, unknown> = {
        title: payload.title,
        description: payload.description,
        status: payload.status,
        priority: payload.priority,
      };
      if (isAdmin && payload.assignedTo) {
        body.assignedTo = payload.assignedTo;
      }

      const response = await apiClient.post<ApiResponse<TaskResponse>>(
        "/api/tasks",
        body
      );
      setTasks((prev) => [response.data.data.task, ...prev]);
      toast.success("Task created");
      return true;
    } catch (err) {
      toast.error(getErrorMessage(err));
      return false;
    }
  };

  const handleClaim = useCallback(
    async (task: Task): Promise<void> => {
      if (!user) {
        return;
      }
      setPendingAction({ id: task._id, type: "claim" });
      try {
        const response = await apiClient.patch<ApiResponse<TaskResponse>>(
          `/api/tasks/${task._id}/assign`,
          { assignedTo: user._id }
        );
        setTasks((prev) =>
          prev.map((t) =>
            t._id === response.data.data.task._id ? response.data.data.task : t
          )
        );
        toast.success("Task claimed");
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setPendingAction(null);
      }
    },
    [user, toast]
  );

  const handleAssign = useCallback(
    async (task: Task, assignedTo: string): Promise<void> => {
      setPendingAction({ id: task._id, type: "assign" });
      try {
        const response = await apiClient.patch<ApiResponse<TaskResponse>>(
          `/api/tasks/${task._id}/assign`,
          { assignedTo: assignedTo || null }
        );
        setTasks((prev) =>
          prev.map((t) =>
            t._id === response.data.data.task._id ? response.data.data.task : t
          )
        );
        toast.success(assignedTo ? "Task assigned" : "Task unassigned");
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setPendingAction(null);
      }
    },
    [toast]
  );

  const handleEdit = useCallback(
    async (
      task: Task,
      title: string,
      description: string,
      priority: TaskPriority
    ): Promise<void> => {
      setPendingAction({ id: task._id, type: "edit" });
      try {
        const response = await apiClient.put<ApiResponse<TaskResponse>>(
          `/api/tasks/${task._id}`,
          { title, description, priority }
        );
        setTasks((prev) =>
          prev.map((t) =>
            t._id === response.data.data.task._id ? response.data.data.task : t
          )
        );
        toast.success("Task updated");
      } catch (err) {
        toast.error(getErrorMessage(err));
        void refreshUser();
      } finally {
        setPendingAction(null);
      }
    },
    [toast, refreshUser]
  );

  const requestDelete = useCallback((task: Task): void => {
    setPendingDelete(task);
  }, []);

  const confirmDelete = useCallback(async (): Promise<void> => {
    if (!pendingDelete) {
      return;
    }
    const taskId = pendingDelete._id;
    setPendingAction({ id: taskId, type: "delete" });
    try {
      await apiClient.delete(`/api/tasks/${taskId}`);
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
      toast.success("Task deleted");
      setPendingDelete(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPendingAction(null);
    }
  }, [pendingDelete, toast]);

  const cancelDelete = useCallback((): void => {
    setPendingDelete(null);
  }, []);

  if (!user) {
    return null;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-board-900">
            {isAdmin ? "Sprint Board — Admin View" : "Sprint Board"}
          </h1>
          <p className="mt-1 text-sm text-board-500">
            {isAdmin
              ? "Full management access. Assign, move, edit, and delete any task."
              : "See all tasks. Claim open work and manage the tasks assigned to you."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-board-200 bg-white px-4 py-2.5 text-sm font-semibold text-board-600 transition-colors hover:bg-board-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-board-50 dark:text-board-300 dark:hover:bg-board-200"
            title="Refresh (also works via refresh button)"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => openCreateModal("To Do")}
            title="New task (Ctrl+K / ⌘K)"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            New Task
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-board-200 bg-white p-4 dark:bg-board-50">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-board-400" />
            <input
              type="search"
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
              placeholder="Search by title or description..."
              className="w-full rounded-lg border border-board-200 py-2 pl-10 pr-3 text-sm text-board-900 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:bg-board-100"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={filters.assignee}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, assignee: e.target.value }))
              }
              className="rounded-lg border border-board-200 bg-white px-3 py-2 text-sm text-board-700 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:bg-board-100"
              title="Filter by assignee"
            >
              <option value="">All assignees</option>
              <option value="me">My tasks</option>
              <option value="unassigned">Unassigned</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name}
                </option>
              ))}
            </select>

            <select
              value={filters.priority}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, priority: e.target.value }))
              }
              className="rounded-lg border border-board-200 bg-white px-3 py-2 text-sm text-board-700 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:bg-board-100"
              title="Filter by priority"
            >
              <option value="">All priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 rounded-lg border border-board-200 bg-white px-3 py-2 text-sm font-semibold text-board-600 transition-colors hover:bg-board-100 dark:bg-board-100 dark:hover:bg-board-200"
              >
                <X className="h-4 w-4" />
                Clear
              </button>
            ) : (
              <span className="hidden items-center gap-1.5 text-xs text-board-400 sm:inline-flex">
                <ListFilter className="h-3.5 w-3.5" />
                {filteredTasks.length} of {tasks.length} tasks
              </span>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => void handleRefresh()}
              className="inline-flex items-center gap-1 rounded-lg border border-amber-600/30 bg-white px-2.5 py-1 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100 dark:bg-board-50 dark:text-amber-300 dark:hover:bg-board-100"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-sm font-semibold text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-200"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {!isLoading && tasks.length === 0 && (
        <div className="mb-6 flex flex-col items-center justify-between gap-4 rounded-2xl border border-indigo-200 bg-indigo-50 px-6 py-6 text-center sm:flex-row sm:text-left dark:border-indigo-500/30 dark:bg-indigo-500/10">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-board-900">
                Your board is empty — let&apos;s get started!
              </p>
              <p className="mt-0.5 text-sm text-board-600">
                Create your first task to kick off the sprint.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openCreateModal("To Do")}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Create your first task
          </button>
        </div>
      )}

      {isLoading ? (
        <BoardSkeleton />
      ) : (
        <DragDropContext onDragEnd={(result: DropResult) => void onDragEnd(result)}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {COLUMNS.map((columnId) => (
              <Droppable key={columnId} droppableId={columnId}>
                {(provided, snapshot) => (
                  <TaskColumn
                    columnId={columnId}
                    tasks={filteredByColumn[columnId]}
                    currentUser={user}
                    users={users}
                    isAdmin={isAdmin}
                    provided={provided}
                    isDraggingOver={snapshot.isDraggingOver}
                    pendingAction={pendingAction}
                    onClaim={(task) => void handleClaim(task)}
                    onAssign={(task, assignedTo) =>
                      void handleAssign(task, assignedTo)
                    }
                    onEdit={(task, title, description, priority) =>
                      void handleEdit(task, title, description, priority)
                    }
                    onDelete={requestDelete}
                    onMove={(task, status) => void handleMove(task, status)}
                    onCreateInColumn={openCreateModal}
                  />
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      )}

      <CreateTaskModal
        users={users}
        isAdmin={isAdmin}
        open={isCreateOpen}
        initialStatus={createStatus}
        onClose={() => setIsCreateOpen(false)}
        onCreate={handleCreateTask}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete task?"
        description={
          pendingDelete
            ? `"${pendingDelete.title}" will be permanently deleted. This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        destructive
        isProcessing={pendingAction?.type === "delete"}
        onConfirm={() => void confirmDelete()}
        onCancel={cancelDelete}
      />
    </div>
  );
};

const BoardSkeleton = () => {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {COLUMNS.map((column) => (
        <div
          key={column}
          className="min-h-[70vh] animate-pulse rounded-2xl border border-board-200 bg-board-50 p-4"
        >
          <div className="mb-4 h-5 w-24 rounded bg-board-200" />
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
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
  );
};

export default KanbanBoard;