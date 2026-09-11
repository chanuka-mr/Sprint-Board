"use client";

import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { DragDropContext, DropResult, Droppable } from "@hello-pangea/dnd";
import axios from "axios";
import { Plus, AlertTriangle, RefreshCw } from "lucide-react";
import apiClient, {
  ApiResponse,
  AppUser,
  Task,
  TaskPriority,
  TaskResponse,
  TaskStatus,
  TasksResponse,
  UsersResponse,
} from "../lib/api";
import TaskColumn from "./TaskColumn";
import CreateTaskModal from "./CreateTaskModal";
import { useAuth } from "../context/AuthContext";

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

const KanbanBoard = () => {
  const { user, refreshUser } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
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

  const tasksByColumn = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      "To Do": [],
      "Doing": [],
      "Done": [],
    };
    tasks.forEach((task) => {
      grouped[task.status].push(task);
    });
    return grouped;
  }, [tasks]);

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
    } catch (err) {
      setTasks(previousTasks);
      setError(getErrorMessage(err));
    }
  };

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
      setError(null);
      return true;
    } catch (err) {
      setError(getErrorMessage(err));
      return false;
    }
  };

  const handleClaim = useCallback(async (task: Task): Promise<void> => {
    if (!user) {
      return;
    }
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
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [user]);

  const handleAssign = useCallback(
    async (task: Task, assignedTo: string): Promise<void> => {
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
        setError(null);
      } catch (err) {
        setError(getErrorMessage(err));
      }
    },
    []
  );

  const handleEdit = useCallback(
    async (
      task: Task,
      title: string,
      description: string,
      priority: TaskPriority
    ): Promise<void> => {
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
        setError(null);
      } catch (err) {
        setError(getErrorMessage(err));
        void refreshUser();
      }
    },
    [refreshUser]
  );

  const handleDelete = useCallback(async (task: Task): Promise<void> => {
    if (!window.confirm(`Delete task "${task.title}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await apiClient.delete(`/api/tasks/${task._id}`);
      setTasks((prev) => prev.filter((t) => t._id !== task._id));
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
    }
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
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            New Task
          </button>
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
            onClick={() => setError(null)}
            className="text-sm font-semibold text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-200"
          >
            Dismiss
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
                {(provided) => (
                  <TaskColumn
                    columnId={columnId}
                    tasks={tasksByColumn[columnId]}
                    currentUser={user}
                    users={users}
                    isAdmin={isAdmin}
                    provided={provided}
                    onClaim={(task) => void handleClaim(task)}
                    onAssign={(task, assignedTo) =>
                      void handleAssign(task, assignedTo)
                    }
                    onEdit={(task, title, description, priority) =>
                      void handleEdit(task, title, description, priority)
                    }
                    onDelete={(task) => void handleDelete(task)}
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
        onClose={() => setIsCreateOpen(false)}
        onCreate={handleCreateTask}
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