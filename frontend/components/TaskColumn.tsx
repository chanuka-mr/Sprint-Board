"use client";

import React from "react";
import {
  Draggable,
  DroppableProvided,
  DraggableProvided,
  DraggableStateSnapshot,
} from "@hello-pangea/dnd";
import { ClipboardList, Activity, CheckCircle2, Plus } from "lucide-react";
import { AppUser, PendingAction, Task, TaskPriority, TaskStatus } from "../lib/api";
import TaskCard from "./TaskCard";

interface TaskColumnProps {
  columnId: TaskStatus;
  tasks: Task[];
  currentUser: AppUser;
  users: AppUser[];
  isAdmin: boolean;
  provided: DroppableProvided;
  isDraggingOver: boolean;
  pendingAction?: PendingAction | null;
  onClaim: (task: Task) => void;
  onAssign: (task: Task, assignedTo: string) => void;
  onEdit: (task: Task, title: string, description: string, priority: TaskPriority) => void;
  onDelete: (task: Task) => void;
  onMove: (task: Task, status: TaskStatus) => void;
  onCreateInColumn: (status: TaskStatus) => void;
}

interface ColumnMeta {
  label: string;
  dotClass: string;
  headerBg: string;
  columnBg: string;
  icon: React.ReactNode;
}

const emptyIconClass = "h-8 w-8 text-board-300 dark:text-board-400";

const columnMeta: Record<TaskStatus, ColumnMeta> = {
  "To Do": {
    label: "To Do",
    dotClass: "bg-slate-400",
    headerBg: "bg-slate-50 dark:bg-slate-800/60",
    columnBg: "bg-slate-50 dark:bg-slate-800/40",
    icon: <ClipboardList className={emptyIconClass} />,
  },
  "Doing": {
    label: "Doing",
    dotClass: "bg-amber-400",
    headerBg: "bg-amber-50 dark:bg-amber-500/10",
    columnBg: "bg-amber-50/40 dark:bg-amber-500/5",
    icon: <Activity className={emptyIconClass} />,
  },
  "Done": {
    label: "Done",
    dotClass: "bg-emerald-400",
    headerBg: "bg-emerald-50 dark:bg-emerald-500/10",
    columnBg: "bg-emerald-50/40 dark:bg-emerald-500/5",
    icon: <CheckCircle2 className={emptyIconClass} />,
  },
};

const TaskColumn: React.FC<TaskColumnProps> = ({
  columnId,
  tasks,
  currentUser,
  users,
  isAdmin,
  provided,
  isDraggingOver,
  pendingAction,
  onClaim,
  onAssign,
  onEdit,
  onDelete,
  onMove,
  onCreateInColumn,
}) => {
  const meta = columnMeta[columnId];

  const isDraggable = (task: Task): boolean => {
    if (isAdmin) {
      return true;
    }
    return task.assignedTo?._id === currentUser._id;
  };

  return (
    <section
      ref={provided.innerRef}
      {...provided.droppableProps}
      className={`flex min-h-[70vh] w-full flex-col rounded-2xl border border-board-200 ${meta.columnBg} ${
        isDraggingOver ? "ring-2 ring-indigo-400" : ""
      }`}
    >
      <div
        className={`flex items-center justify-between rounded-t-2xl border-b border-board-200 px-4 py-3 ${meta.headerBg}`}
      >
        <div className="flex items-center gap-2">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${meta.dotClass}`} />
          <h2 className="text-sm font-bold text-board-800">{meta.label}</h2>
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-board-500 shadow-sm dark:bg-board-50">
            {tasks.length}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-3">
        {tasks.length === 0 ? (
          <div className="flex min-h-[10rem] flex-col items-center justify-center rounded-xl border-2 border-dashed border-board-200 px-4 py-8 text-center dark:border-board-300/40">
            <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm dark:bg-board-50">
              {meta.icon}
            </div>
            <p className="text-sm font-semibold text-board-600">
              No tasks in {meta.label}
            </p>
            <p className="mt-0.5 text-xs text-board-400">
              Drag them here, or start one now.
            </p>
            <button
              type="button"
              onClick={() => onCreateInColumn(columnId)}
              className="mt-3 inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Create task
            </button>
          </div>
        ) : (
          tasks.map((task, index) => {
            const dragEnabled = isDraggable(task);

            return (
              <Draggable
                key={task._id}
                draggableId={task._id}
                index={index}
                isDragDisabled={!dragEnabled}
              >
                {(
                  draggableProvided: DraggableProvided,
                  snapshot: DraggableStateSnapshot
                ) => (
                  <TaskCard
                    task={task}
                    currentUser={currentUser}
                    users={users}
                    isAdmin={isAdmin}
                    isDraggable={dragEnabled}
                    provided={draggableProvided}
                    snapshot={snapshot}
                    pendingAction={pendingAction}
                    onClaim={onClaim}
                    onAssign={onAssign}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onMove={onMove}
                  />
                )}
              </Draggable>
            );
          })
        )}
        {provided.placeholder}
      </div>
    </section>
  );
};

export default TaskColumn;