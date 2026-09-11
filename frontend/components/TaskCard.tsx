"use client";

import React, { useState } from "react";
import { DraggableProvided, DraggableStateSnapshot } from "@hello-pangea/dnd";
import {
  Calendar,
  Pencil,
  Trash2,
  User as UserIcon,
  Umbrella,
  Save,
  X,
  GripVertical,
  ShieldCheck,
  Flag,
} from "lucide-react";
import { AppUser, Task, TaskPriority } from "../lib/api";
import { formatDate, getInitials } from "../lib/utils";

interface TaskCardProps {
  task: Task;
  currentUser: AppUser;
  users: AppUser[];
  isAdmin: boolean;
  isDraggable: boolean;
  provided: DraggableProvided;
  snapshot: DraggableStateSnapshot;
  onClaim: (task: Task) => void;
  onAssign: (task: Task, assignedTo: string) => void;
  onEdit: (
    task: Task,
    title: string,
    description: string,
    priority: TaskPriority
  ) => void;
  onDelete: (task: Task) => void;
}

const statusStyles: Record<string, string> = {
  "To Do":
    "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/30",
  "Doing":
    "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
  "Done":
    "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
};

const priorityStyles: Record<TaskPriority, string> = {
  high:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30",
  medium:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
  low:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
};

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  currentUser,
  users,
  isAdmin,
  isDraggable,
  provided,
  snapshot,
  onClaim,
  onAssign,
  onEdit,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description);
  const [editPriority, setEditPriority] = useState<TaskPriority>(task.priority);

  const isCreator = task.createdBy?._id === currentUser._id;
  const isAssignee = task.assignedTo?._id === currentUser._id;
  const canEditOrDelete = isAdmin || isCreator;
  const canClaim = !isAdmin && !task.assignedTo;

  const handleSaveEdit = () => {
    if (!editTitle.trim()) {
      return;
    }
    onEdit(task, editTitle.trim(), editDescription.trim(), editPriority);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditTitle(task.title);
    setEditDescription(task.description);
    setEditPriority(task.priority);
    setIsEditing(false);
  };

  const handleAssignChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onAssign(task, event.target.value);
  };

  const assigneeOptions = [
    { _id: "", name: "Unassigned" },
    ...users,
  ];

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      style={{
        ...provided.draggableProps.style,
        opacity: snapshot.isDragging ? 0.9 : 1,
      }}
      className={`rounded-xl border border-board-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:bg-board-50 dark:hover:shadow-black/20 ${
        snapshot.isDragging ? "rotate-1 ring-2 ring-indigo-500" : ""
      } ${!isDraggable ? "cursor-default" : "cursor-grab active:cursor-grabbing"}`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
              statusStyles[task.status] || statusStyles["To Do"]
            }`}
          >
            {task.status}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${
              priorityStyles[task.priority] || priorityStyles.medium
            }`}
            title={`Priority: ${task.priority}`}
          >
            <Flag className="h-3 w-3" />
            {task.priority}
          </span>
          {isAdmin && (
            <span className="inline-flex items-center gap-0.5 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-300">
              <ShieldCheck className="h-3 w-3" />
              Admin
            </span>
          )}
        </div>
        {isDraggable && (
          <GripVertical
            className="h-4 w-4 shrink-0 text-board-300"
            aria-hidden="true"
          />
        )}
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full rounded-lg border border-board-300 px-3 py-2 text-sm font-semibold text-board-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:bg-board-100"
            placeholder="Task title"
            maxLength={200}
          />
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-lg border border-board-300 px-3 py-2 text-sm text-board-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:bg-board-100"
            placeholder="Task description (optional)"
          />
          <div>
            <label
              htmlFor={`task-priority-edit-${task._id}`}
              className="mb-1 block text-xs font-semibold text-board-700"
            >
              Priority
            </label>
            <select
              id={`task-priority-edit-${task._id}`}
              value={editPriority}
              onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
              className="w-full rounded-lg border border-board-300 bg-white px-3 py-2 text-sm text-board-900 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:bg-board-100"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
      ) : (
        <div className="mb-3">
          <h3 className="mb-1 text-sm font-semibold leading-snug text-board-900">
            {task.title}
          </h3>
          {task.description && (
            <p className="text-sm leading-relaxed text-board-600">
              {task.description}
            </p>
          )}
        </div>
      )}

      <div className="space-y-2 border-t border-board-100 pt-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5 text-xs text-board-500">
            <UserIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              Created by{" "}
              <span className="font-medium text-board-700">
                {task.createdBy?.name || "Unknown"}
              </span>
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1 text-xs text-board-400">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatDate(task.createdAt)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            {task.assignedTo ? (
              <>
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    isAssignee
                      ? "bg-indigo-600 text-white"
                      : "bg-board-200 text-board-600"
                  }`}
                >
                  {getInitials(task.assignedTo.name)}
                </div>
                <span className="truncate text-xs text-board-600">
                  {!isAdmin && isAssignee
                    ? "Assigned to you"
                    : task.assignedTo.name}
                </span>
              </>
            ) : (
              <>
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed border-board-300 text-[10px] text-board-400">
                  ?
                </div>
                <span className="text-xs text-board-400">Unassigned</span>
              </>
            )}
          </div>

          {isAdmin && (
            <div className="flex items-center gap-1">
              <select
                value={task.assignedTo?._id || ""}
                onChange={handleAssignChange}
                className="max-w-[10rem] rounded-lg border border-board-200 bg-white px-2 py-1 text-xs text-board-700 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:bg-board-100"
                title="Reassign task"
              >
                {assigneeOptions.map((option) => (
                  <option key={option._id || "unassigned"} value={option._id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={!editTitle.trim()}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              Save
            </button>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="inline-flex items-center gap-1 rounded-lg border border-board-200 bg-white px-3 py-1.5 text-xs font-semibold text-board-600 transition-colors hover:bg-board-100 dark:bg-board-100 dark:hover:bg-board-200"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5">
              {canClaim && (
                <button
                  type="button"
                  onClick={() => onClaim(task)}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
                >
                  <Umbrella className="h-3.5 w-3.5" />
                  Claim
                </button>
              )}
              {canEditOrDelete && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-1 rounded-lg border border-board-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-board-600 transition-colors hover:bg-board-100 dark:bg-board-100 dark:hover:bg-board-200"
                  title="Edit task"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
              )}
            </div>
            {canEditOrDelete && (
              <button
                type="button"
                onClick={() => onDelete(task)}
                className="inline-flex items-center gap-1 rounded-lg border border-red-100 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                title="Delete task"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCard;