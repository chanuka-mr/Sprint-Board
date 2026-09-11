import { Response, NextFunction } from "express";
import mongoose from "mongoose";
import Task, {
  TASK_STATUSES,
  TASK_PRIORITIES,
  TaskPriority,
  TaskStatus,
} from "../models/Task";
import User from "../models/User";
import { AppError } from "../middleware/error";
import { AuthRequest } from "../middleware/auth";

interface CreateTaskBody {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  assignedTo?: string | null;
}

interface UpdateTaskBody {
  title?: string;
  description?: string;
  priority?: string;
}

interface UpdateStatusBody {
  status?: string;
}

interface AssignBody {
  assignedTo?: string | null;
}

const isValidObjectId = (id: unknown): boolean => {
  return mongoose.isValidObjectId(id);
};

const populateTask = () => ({
  path: "createdBy",
  select: "_id name email",
});

const populateAssignee = () => ({
  path: "assignedTo",
  select: "_id name email",
});

export const getTasks = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tasks = await Task.find()
      .sort({ createdAt: -1 })
      .populate(populateTask())
      .populate(populateAssignee());

    res.status(200).json({
      success: true,
      message: "Tasks retrieved successfully.",
      data: {
        tasks,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createTask = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { title, description, status, priority, assignedTo }: CreateTaskBody =
      req.body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      throw new AppError("Task title is required.", 400);
    }

    if (status && !TASK_STATUSES.includes(status as TaskStatus)) {
      throw new AppError(
        `Invalid status. Must be one of: ${TASK_STATUSES.join(", ")}.`,
        400
      );
    }

    if (priority && !TASK_PRIORITIES.includes(priority as TaskPriority)) {
      throw new AppError(
        `Invalid priority. Must be one of: ${TASK_PRIORITIES.join(", ")}.`,
        400
      );
    }

    const taskData: {
      title: string;
      description: string;
      status: TaskStatus;
      priority: TaskPriority;
      createdBy: mongoose.Types.ObjectId;
      assignedTo: mongoose.Types.ObjectId | null;
    } = {
      title: title.trim(),
      description:
        description && typeof description === "string"
          ? description.trim()
          : "",
      status: (status as TaskStatus) || "To Do",
      priority: (priority as TaskPriority) || "medium",
      createdBy: req.user?._id as mongoose.Types.ObjectId,
      assignedTo: null,
    };

    if (assignedTo) {
      if (!isValidObjectId(assignedTo)) {
        throw new AppError("Invalid assignedTo user ID.", 400);
      }
      const assignee = await User.findById(assignedTo).select("_id");
      if (!assignee) {
        throw new AppError("Assigned user does not exist.", 400);
      }
      taskData.assignedTo = assignee._id as mongoose.Types.ObjectId;
    }

    const task = await Task.create(taskData);

    const populatedTask = await Task.findById(task._id)
      .populate(populateTask())
      .populate(populateAssignee());

    res.status(201).json({
      success: true,
      message: "Task created successfully.",
      data: {
        task: populatedTask,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateTaskStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status }: UpdateStatusBody = req.body;

    if (!isValidObjectId(id)) {
      throw new AppError("Invalid task ID.", 400);
    }

    if (!status || !TASK_STATUSES.includes(status as TaskStatus)) {
      throw new AppError(
        `Invalid status. Must be one of: ${TASK_STATUSES.join(", ")}.`,
        400
      );
    }

    const task = await Task.findById(id);
    if (!task) {
      throw new AppError("Task not found.", 404);
    }

    const userId = req.user?._id as mongoose.Types.ObjectId;
    const isAdmin = req.user?.role === "admin";
    const isCreator = task.createdBy.toString() === userId.toString();
    const isAssignee =
      task.assignedTo !== null &&
      task.assignedTo.toString() === userId.toString();

    if (!isAdmin && !isCreator && !isAssignee) {
      throw new AppError(
        "Not authorized. Only the creator, assignee, or an administrator can update this task's status.",
        403
      );
    }

    task.status = status as TaskStatus;
    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate(populateTask())
      .populate(populateAssignee());

    res.status(200).json({
      success: true,
      message: "Task status updated successfully.",
      data: {
        task: populatedTask,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const assignTask = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { assignedTo }: AssignBody = req.body;

    if (!isValidObjectId(id)) {
      throw new AppError("Invalid task ID.", 400);
    }

    const task = await Task.findById(id);
    if (!task) {
      throw new AppError("Task not found.", 404);
    }

    const isAdmin = req.user?.role === "admin";

    let targetUserId: mongoose.Types.ObjectId | null = null;

    if (isAdmin) {
      if (assignedTo === null || assignedTo === undefined || assignedTo === "") {
        targetUserId = null;
      } else {
        if (typeof assignedTo !== "string" || !isValidObjectId(assignedTo)) {
          throw new AppError("Invalid assignee user ID.", 400);
        }
        const assignee = await User.findById(assignedTo).select("_id");
        if (!assignee) {
          throw new AppError("Assigned user does not exist.", 400);
        }
        targetUserId = assignee._id as mongoose.Types.ObjectId;
      }
    } else {
      const userId = req.user?._id as mongoose.Types.ObjectId;

      const isCreator = task.createdBy.toString() === userId.toString();
      const isCurrentAssignee =
        task.assignedTo !== null &&
        task.assignedTo.toString() === userId.toString();

      if (!isCreator && !isCurrentAssignee) {
        throw new AppError(
          "Not authorized. You can only claim unassigned tasks or manage tasks assigned to you.",
          403
        );
      }

      if (task.assignedTo !== null && !isCurrentAssignee) {
        throw new AppError(
          "This task is already assigned to another user.",
          403
        );
      }

      if (assignedTo === undefined || assignedTo === null || assignedTo === "") {
        throw new AppError(
          "Normal users can only assign a task to themselves. Use your own user ID.",
          403
        );
      }

      if (assignedTo !== userId.toString()) {
        throw new AppError(
          "You can only assign an unassigned task to yourself.",
          403
        );
      }

      targetUserId = userId;
    }

    task.assignedTo = targetUserId;
    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate(populateTask())
      .populate(populateAssignee());

    res.status(200).json({
      success: true,
      message: isAdmin
        ? "Task assignment updated successfully."
        : "Task claimed successfully.",
      data: {
        task: populatedTask,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description, priority }: UpdateTaskBody = req.body;

    if (!isValidObjectId(id)) {
      throw new AppError("Invalid task ID.", 400);
    }

    const task = await Task.findById(id);
    if (!task) {
      throw new AppError("Task not found.", 404);
    }

    const userId = req.user?._id as mongoose.Types.ObjectId;
    const isAdmin = req.user?.role === "admin";
    const isCreator = task.createdBy.toString() === userId.toString();

    if (!isAdmin && !isCreator) {
      throw new AppError(
        "Not authorized. Only the task creator or an administrator can edit this task.",
        403
      );
    }

    if (title !== undefined) {
      if (typeof title !== "string" || title.trim().length === 0) {
        throw new AppError("Task title cannot be empty.", 400);
      }
      task.title = title.trim();
    }

    if (description !== undefined) {
      task.description =
        typeof description === "string" ? description.trim() : "";
    }

    if (priority !== undefined) {
      if (!TASK_PRIORITIES.includes(priority as TaskPriority)) {
        throw new AppError(
          `Invalid priority. Must be one of: ${TASK_PRIORITIES.join(", ")}.`,
          400
        );
      }
      task.priority = priority as TaskPriority;
    }

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate(populateTask())
      .populate(populateAssignee());

    res.status(200).json({
      success: true,
      message: "Task updated successfully.",
      data: {
        task: populatedTask,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      throw new AppError("Invalid task ID.", 400);
    }

    const task = await Task.findById(id);
    if (!task) {
      throw new AppError("Task not found.", 404);
    }

    const userId = req.user?._id as mongoose.Types.ObjectId;
    const isAdmin = req.user?.role === "admin";
    const isCreator = task.createdBy.toString() === userId.toString();

    if (!isAdmin && !isCreator) {
      throw new AppError(
        "Not authorized. Only the task creator or an administrator can delete this task.",
        403
      );
    }

    await task.deleteOne();

    res.status(200).json({
      success: true,
      message: "Task deleted successfully.",
      data: {
        id,
      },
    });
  } catch (error) {
    next(error);
  }
};