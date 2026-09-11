"use client";

import React, { useEffect, useState } from "react";
import { X, PlusCircle, Flag } from "lucide-react";
import { AppUser, TaskPriority, TaskStatus } from "../lib/api";

interface CreateTaskModalProps {
  users: AppUser[];
  isAdmin: boolean;
  open: boolean;
  initialStatus?: TaskStatus;
  onClose: () => void;
  onCreate: (payload: {
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    assignedTo?: string;
  }) => Promise<boolean>;
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  users,
  isAdmin,
  open,
  initialStatus = "To Do",
  onClose,
  onCreate,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>(initialStatus);
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [assignedTo, setAssignedTo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStatus(initialStatus);
    }
  }, [open, initialStatus]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Task title is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await onCreate({
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        assignedTo: assignedTo || undefined,
      });

      if (success) {
        setTitle("");
        setDescription("");
        setStatus("To Do");
        setPriority("medium");
        setAssignedTo("");
        onClose();
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create task.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-board-900/50 p-4 backdrop-blur-sm dark:bg-black/60"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-task-title"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-board-50">
        <div className="flex items-center justify-between border-b border-board-200 bg-board-50 px-6 py-4">
          <div className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-indigo-600" />
            <h2
              id="create-task-title"
              className="text-lg font-bold text-board-900"
            >
              Create New Task
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-board-400 transition-colors hover:bg-board-100 hover:text-board-700"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="task-title"
              className="mb-1.5 block text-sm font-semibold text-board-700"
            >
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="task-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              maxLength={200}
              autoFocus
              className="w-full rounded-lg border border-board-300 px-3 py-2.5 text-sm text-board-900 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div>
            <label
              htmlFor="task-description"
              className="mb-1.5 block text-sm font-semibold text-board-700"
            >
              Description
            </label>
            <textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details (optional)"
              rows={4}
              className="w-full resize-none rounded-lg border border-board-300 px-3 py-2.5 text-sm text-board-900 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="task-status"
                className="mb-1.5 block text-sm font-semibold text-board-700"
              >
                Status
              </label>
              <select
                id="task-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full rounded-lg border border-board-300 bg-white px-3 py-2.5 text-sm text-board-900 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:bg-board-100"
              >
                <option value="To Do">To Do</option>
                <option value="Doing">Doing</option>
                <option value="Done">Done</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="task-priority"
                className="mb-1.5 block text-sm font-semibold text-board-700"
              >
                Priority
              </label>
              <select
                id="task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full rounded-lg border border-board-300 bg-white px-3 py-2.5 text-sm text-board-900 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:bg-board-100"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          {isAdmin && (
            <div>
              <label
                htmlFor="task-assignee"
                className="mb-1.5 block text-sm font-semibold text-board-700"
              >
                Assign To
              </label>
              <div className="relative">
                <Flag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-board-400" />
                <select
                  id="task-assignee"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full rounded-lg border border-board-300 bg-white py-2.5 pl-10 pr-3 text-sm text-board-900 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:bg-board-100"
                >
                  <option value="">Unassigned</option>
                  {users.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-board-200 bg-white px-4 py-2.5 text-sm font-semibold text-board-600 transition-colors hover:bg-board-100 dark:bg-board-100 dark:hover:bg-board-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Creating...
                </>
              ) : (
                <>
                  <PlusCircle className="h-4 w-4" />
                  Create Task
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTaskModal;